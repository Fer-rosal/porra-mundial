import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import { successResponse, errorResponse, internalErrorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse } from '@/lib/api-utils'
import { calculatePhaseScores } from '@/lib/services/scoring'

interface ResultInput {
  match_id: string
  home_goals: number
  away_goals: number
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; phase_key: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id, phase_key } = await params
    const gameId = id
    const phaseKey = phase_key
    const body = await request.json()

    // Fetch game and verify user is admin
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('admin_id')
      .eq('id', gameId)
      .single()

    if (gameError || !game) {
      return notFoundResponse()
    }

    if (game.admin_id !== user.sub) {
      return forbiddenResponse()
    }

    // Validate input
    if (!Array.isArray(body) && (!body.results || !Array.isArray(body.results))) {
      return errorResponse('Request body must be an array of results or object with results array', 400)
    }

    const results = Array.isArray(body) ? body : body.results

    // Validate each result
    for (const result of results) {
      if (
        !result.match_id ||
        typeof result.home_goals !== 'number' ||
        typeof result.away_goals !== 'number'
      ) {
        return errorResponse(
          'Each result must have match_id, home_goals, and away_goals',
          400
        )
      }
      if (result.home_goals < 0 || result.away_goals < 0) {
        return errorResponse('Goals must be non-negative integers', 400)
      }
    }

    // Update matches with results
    for (const result of results) {
      const { error: updateError } = await supabase
        .from('matches')
        .update({
          result_entered: true,
          home_goals: result.home_goals,
          away_goals: result.away_goals,
        })
        .eq('id', result.match_id)

      if (updateError) {
        return internalErrorResponse(updateError, 'POST /api/games/:id/phase/:phase_key/results - update match')
      }
    }

    // Calculate phase scores
    const { phase_scores, leaderboard } = await calculatePhaseScores(
      supabase,
      gameId,
      phaseKey
    )

    return successResponse({
      phase_scores,
      leaderboard,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse()
    }
    return internalErrorResponse(error, 'POST /api/games/:id/phase/:phase_key/results')
  }
}
