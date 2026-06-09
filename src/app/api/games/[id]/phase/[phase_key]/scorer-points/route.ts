import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import { successResponse, errorResponse, internalErrorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse } from '@/lib/api-utils'
import { calculatePhaseScores } from '@/lib/services/scoring'

interface ScorerPointsInput {
  game_player_id: string
  goals_count: number
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
    if (!Array.isArray(body) && (!body.scorer_points || !Array.isArray(body.scorer_points))) {
      return errorResponse('Request body must be an array or object with scorer_points array', 400)
    }

    const scorerPoints = Array.isArray(body) ? body : body.scorer_points

    // Validate each entry
    for (const entry of scorerPoints) {
      if (!entry.game_player_id || typeof entry.goals_count !== 'number') {
        return errorResponse('Each entry must have game_player_id and goals_count', 400)
      }
      if (entry.goals_count < 0) {
        return errorResponse('goals_count must be non-negative', 400)
      }
    }

    // Get phase
    const { data: phase } = await supabase
      .from('tournament_phases')
      .select('id')
      .eq('game_id', gameId)
      .eq('phase_key', phaseKey)
      .single()

    if (!phase) {
      return notFoundResponse()
    }

    // UPSERT scorer points
    for (const entry of scorerPoints) {
      const { error: upsertError } = await supabase
        .from('scorer_points')
        .upsert(
          {
            game_player_id: entry.game_player_id,
            tournament_phase_id: phase.id,
            goals_count: entry.goals_count,
            awarded_at: new Date().toISOString(),
            awarded_by_admin_id: user.sub,
          },
          {
            onConflict: 'game_player_id,tournament_phase_id',
          }
        )

      if (upsertError) {
        return internalErrorResponse(upsertError, 'POST /api/games/:id/phase/:phase_key/scorer-points - upsert')
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
    return internalErrorResponse(error, 'POST /api/games/:id/phase/:phase_key/scorer-points')
  }
}
