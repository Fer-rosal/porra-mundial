import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import { successResponse, internalErrorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const gameId = id

    // Verify user is in game
    const { data: gamePlayer, error: gpError } = await supabase
      .from('game_players')
      .select('id, total_score')
      .eq('game_id', gameId)
      .eq('auth0_user_id', user.sub)
      .single()

    if (gpError || !gamePlayer) {
      return forbiddenResponse()
    }

    // Fetch phase scores for this player
    const { data: phaseScores, error: psError } = await supabase
      .from('phase_scores')
      .select('prediction_score, scorer_score, phase_total, tournament_phases!inner(phase_key)')
      .eq('game_player_id', gamePlayer.id)

    if (psError) {
      return internalErrorResponse(psError, 'GET /api/games/:id/my-score - fetch phase scores')
    }

    const phaseScoresList = (phaseScores || []).map((ps: any) => ({
      phase_key: (ps.tournament_phases as any).phase_key,
      prediction_score: ps.prediction_score,
      scorer_score: ps.scorer_score,
      phase_total: ps.phase_total,
    }))

    return successResponse({
      game_player_id: gamePlayer.id,
      phase_scores: phaseScoresList,
      total_score: gamePlayer.total_score,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse()
    }
    return internalErrorResponse(error, 'GET /api/games/:id/my-score')
  }
}
