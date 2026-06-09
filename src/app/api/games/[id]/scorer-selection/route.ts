import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import { successResponse, errorResponse, internalErrorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const gameId = id
    const body = await request.json()

    // Validate input
    if (!body.player_name || typeof body.player_name !== 'string' || body.player_name.trim() === '') {
      return errorResponse('player_name is required and must be non-empty', 400)
    }

    if (!body.phase_key || typeof body.phase_key !== 'string') {
      return errorResponse('phase_key is required', 400)
    }

    // Verify user is in game
    const { data: gamePlayer, error: gpError } = await supabase
      .from('game_players')
      .select('id')
      .eq('game_id', gameId)
      .eq('auth0_user_id', user.sub)
      .single()

    if (!gamePlayer) {
      return forbiddenResponse()
    }

    // Get phase
    const { data: phase } = await supabase
      .from('tournament_phases')
      .select('*')
      .eq('game_id', gameId)
      .eq('phase_key', body.phase_key)
      .single()

    if (!phase) {
      return errorResponse(`Phase ${body.phase_key} not found`, 400)
    }

    // Check if phase is open and not locked
    if (!phase.is_open || phase.is_locked) {
      return errorResponse('Phase is not open or is locked', 403)
    }

    // UPSERT scorer selection
    const { data: upserted, error: upsertError } = await supabase
      .from('scorer_selections')
      .upsert(
        {
          tournament_phase_id: phase.id,
          game_player_id: gamePlayer.id,
          player_name: body.player_name.trim(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'tournament_phase_id,game_player_id',
        }
      )
      .select()
      .single()

    if (upsertError) {
      return internalErrorResponse(upsertError, 'POST /api/games/:id/scorer-selection - upsert')
    }

    return successResponse(upserted, 201)
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse()
    }
    return internalErrorResponse(error, 'POST /api/games/:id/scorer-selection')
  }
}
