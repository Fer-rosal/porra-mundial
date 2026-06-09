import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import { successResponse, errorResponse, internalErrorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-utils'

interface PredictionInput {
  match_id: string
  home_goals_predicted: number
  away_goals_predicted: number
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const gameId = id
    const body = await request.json()

    // Validate user is in game
    const { data: gamePlayer, error: gpError } = await supabase
      .from('game_players')
      .select('id')
      .eq('game_id', gameId)
      .eq('auth0_user_id', user.sub)
      .single()

    if (!gamePlayer) {
      return forbiddenResponse()
    }

    // Validate body is array
    if (!Array.isArray(body) && (!body.predictions || !Array.isArray(body.predictions))) {
      return errorResponse('Request body must be an array of predictions or object with predictions array', 400)
    }

    const predictions = Array.isArray(body) ? body : body.predictions

    // Validate each prediction
    for (const pred of predictions) {
      if (
        !pred.match_id ||
        typeof pred.home_goals_predicted !== 'number' ||
        typeof pred.away_goals_predicted !== 'number'
      ) {
        return errorResponse(
          'Each prediction must have match_id, home_goals_predicted, and away_goals_predicted',
          400
        )
      }
      if (pred.home_goals_predicted < 0 || pred.away_goals_predicted < 0) {
        return errorResponse('Goals must be non-negative integers', 400)
      }
    }

    // Fetch current open phase
    const { data: phase } = await supabase
      .from('tournament_phases')
      .select('*')
      .eq('game_id', gameId)
      .eq('is_open', true)
      .single()

    if (!phase) {
      return errorResponse('No open phase for this game', 400)
    }

    if (phase.is_locked) {
      return errorResponse('Phase is locked and cannot accept new predictions', 403)
    }

    // UPSERT predictions
    const upsertedPredictions: any[] = []

    for (const pred of predictions) {
      // Check if match belongs to this phase
      const { data: match } = await supabase
        .from('matches')
        .select('id')
        .eq('id', pred.match_id)
        .eq('tournament_phase_id', phase.id)
        .single()

      if (!match) {
        return errorResponse(`Match ${pred.match_id} not found in current phase`, 400)
      }

      // Upsert prediction
      const { data: upserted, error: upsertError } = await supabase
        .from('predictions')
        .upsert(
          {
            match_id: pred.match_id,
            game_player_id: gamePlayer.id,
            home_goals_predicted: pred.home_goals_predicted,
            away_goals_predicted: pred.away_goals_predicted,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'match_id,game_player_id',
          }
        )
        .select()
        .single()

      if (upsertError) {
        return internalErrorResponse(upsertError, 'POST /api/games/:id/predictions - upsert')
      }

      if (upserted) {
        upsertedPredictions.push(upserted)
      }
    }

    return successResponse({ predictions: upsertedPredictions }, 201)
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse()
    }
    return internalErrorResponse(error, 'POST /api/games/:id/predictions')
  }
}
