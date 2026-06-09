import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import { successResponse, internalErrorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse } from '@/lib/api-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const gameId = id

    // Verify user is in game
    const { data: playerRecord } = await supabase
      .from('game_players')
      .select('id')
      .eq('game_id', gameId)
      .eq('auth0_user_id', user.sub)
      .single()

    // Also check if user is admin
    const { data: game } = await supabase
      .from('games')
      .select('admin_id')
      .eq('id', gameId)
      .single()

    if (!playerRecord && game?.admin_id !== user.sub) {
      return forbiddenResponse()
    }

    // Get open phase (or default to first phase)
    const { data: openPhase } = await supabase
      .from('tournament_phases')
      .select('*')
      .eq('game_id', gameId)
      .eq('is_open', true)
      .single()

    let phase = openPhase

    if (!phase) {
      // Default to first phase
      const { data: firstPhase } = await supabase
        .from('tournament_phases')
        .select('*')
        .eq('game_id', gameId)
        .eq('phase_key', 'LEAGUE')
        .single()

      if (!firstPhase) {
        return notFoundResponse()
      }
      phase = firstPhase
    }

    // Fetch all matches for this phase
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_phase_id', phase.id)

    if (matchesError) {
      return internalErrorResponse(matchesError, 'GET /api/games/:id/current-phase')
    }

    return successResponse({
      phase_key: phase.phase_key,
      is_open: phase.is_open,
      is_locked: phase.is_locked,
      opened_at: phase.opened_at,
      locked_at: phase.locked_at,
      matches: matches || [],
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse()
    }
    return internalErrorResponse(error, 'GET /api/games/:id/current-phase')
  }
}
