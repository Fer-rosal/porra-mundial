import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import { successResponse, errorResponse, internalErrorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse } from '@/lib/api-utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; prediction_id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id, prediction_id } = await params
    const gameId = id
    const predictionId = prediction_id
    const body = await request.json()

    // Validate input
    if (
      typeof body.home_goals_predicted !== 'number' ||
      typeof body.away_goals_predicted !== 'number'
    ) {
      return errorResponse(
        'Request must include home_goals_predicted and away_goals_predicted as numbers',
        400
      )
    }

    if (body.home_goals_predicted < 0 || body.away_goals_predicted < 0) {
      return errorResponse('Goals must be non-negative integers', 400)
    }

    // Fetch prediction
    const { data: prediction, error: predError } = await supabase
      .from('predictions')
      .select('*, matches!inner(tournament_phase_id)')
      .eq('id', predictionId)
      .single()

    if (predError || !prediction) {
      return notFoundResponse()
    }

    // Verify user owns prediction (via game_player)
    const { data: gamePlayer, error: gpError } = await supabase
      .from('game_players')
      .select('id')
      .eq('id', prediction.game_player_id)
      .eq('auth0_user_id', user.sub)
      .single()

    if (!gamePlayer) {
      return forbiddenResponse()
    }

    // Verify game belongs to the game_id parameter
    const { data: gameBelongs } = await supabase
      .from('game_players')
      .select('game_id')
      .eq('id', gamePlayer.id)
      .eq('game_id', gameId)
      .single()

    if (!gameBelongs) {
      return forbiddenResponse()
    }

    // Check phase lock status
    const { data: phase } = await supabase
      .from('tournament_phases')
      .select('is_locked')
      .eq('id', (prediction.matches as any).tournament_phase_id)
      .single()

    if (phase?.is_locked) {
      return errorResponse('Phase is locked and cannot be modified', 403)
    }

    // Update prediction
    const { data: updated, error: updateError } = await supabase
      .from('predictions')
      .update({
        home_goals_predicted: body.home_goals_predicted,
        away_goals_predicted: body.away_goals_predicted,
        updated_at: new Date().toISOString(),
      })
      .eq('id', predictionId)
      .select()
      .single()

    if (updateError) {
      return internalErrorResponse(updateError, 'PUT /api/games/:id/predictions/:prediction_id')
    }

    return successResponse(updated)
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse()
    }
    return internalErrorResponse(error, 'PUT /api/games/:id/predictions/:prediction_id')
  }
}
