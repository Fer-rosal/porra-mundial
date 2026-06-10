import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { auth0 } from '@/lib/auth'
import { successResponse, errorResponse, internalErrorResponse, unauthorizedResponse, notFoundResponse, forbiddenResponse } from '@/lib/api-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth0.getSession(request)
    if (!session) {
      return unauthorizedResponse()
    }
    const user = { sub: session.user.sub }
    const { id } = await params
    const gameId = id

    // Fetch game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single()

    if (gameError || !game) {
      return notFoundResponse()
    }

    // Verify user is admin or in game_players
    const { data: playerRecord } = await supabase
      .from('game_players')
      .select('id')
      .eq('game_id', gameId)
      .eq('auth0_user_id', user.sub)
      .single()

    if (game.admin_id !== user.sub && !playerRecord) {
      return forbiddenResponse()
    }

    // Count game players
    const { count: playerCount } = await supabase
      .from('game_players')
      .select('*', { count: 'exact' })
      .eq('game_id', gameId)

    // Fetch players
    const { data: players, error: playersError } = await supabase
      .from('game_players')
      .select('id, auth0_user_id, total_score')
      .eq('game_id', gameId)

    if (playersError) {
      return internalErrorResponse(playersError, 'GET /api/games/:id - fetch players')
    }

    return successResponse({
      id: game.id,
      admin_id: game.admin_id,
      name: game.name,
      invite_code: game.invite_code,
      status: game.status,
      tournament_phase: game.tournament_phase,
      player_count: playerCount || 0,
      created_at: game.created_at,
      players: players || [],
    })
  } catch (error) {
    
    return internalErrorResponse(error, 'GET /api/games/:id')
  }
}
