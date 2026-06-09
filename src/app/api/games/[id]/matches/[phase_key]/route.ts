import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import { successResponse, internalErrorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse } from '@/lib/api-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; phase_key: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id, phase_key } = await params
    const gameId = id
    const phaseKey = phase_key

    // Verify user is in game or admin
    const { data: gamePlayer } = await supabase
      .from('game_players')
      .select('id')
      .eq('game_id', gameId)
      .eq('auth0_user_id', user.sub)
      .single()

    const { data: game } = await supabase
      .from('games')
      .select('admin_id')
      .eq('id', gameId)
      .single()

    if (!gamePlayer && game?.admin_id !== user.sub) {
      return forbiddenResponse()
    }

    // Fetch phase
    const { data: phase } = await supabase
      .from('tournament_phases')
      .select('id')
      .eq('game_id', gameId)
      .eq('phase_key', phaseKey)
      .single()

    if (!phase) {
      return notFoundResponse()
    }

    // Fetch matches for this phase
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_phase_id', phase.id)

    if (matchesError) {
      return internalErrorResponse(matchesError, 'GET /api/games/:id/matches/:phase_key')
    }

    return successResponse(matches || [])
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse()
    }
    return internalErrorResponse(error, 'GET /api/games/:id/matches/:phase_key')
  }
}
