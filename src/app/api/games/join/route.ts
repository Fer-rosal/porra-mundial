import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { auth0 } from '@/lib/auth'
import { successResponse, errorResponse, internalErrorResponse, unauthorizedResponse, conflictResponse } from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  try {
    const session = await auth0.getSession(request)
    if (!session) {
      return unauthorizedResponse()
    }
    const user = { sub: session.user.sub }
    const body = await request.json()

    // Validate input
    if (!body.invite_code || typeof body.invite_code !== 'string') {
      return errorResponse('invite_code is required', 400)
    }

    // Find game by invite code
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('invite_code', body.invite_code)
      .single()

    if (gameError || !game) {
      return errorResponse('Invalid invite code', 400)
    }

    // Check if game is open
    if (game.status !== 'OPEN') {
      return errorResponse('Game is not open for new players', 400)
    }

    // Check if user already in game
    const { data: existingPlayer, error: checkError } = await supabase
      .from('game_players')
      .select('id')
      .eq('game_id', game.id)
      .eq('auth0_user_id', user.sub)
      .single()

    if (existingPlayer) {
      return conflictResponse('You have already joined this game')
    }

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is expected
      return internalErrorResponse(checkError, 'POST /api/games/join - check existing')
    }

    // Insert into game_players
    const { data: newPlayer, error: insertError } = await supabase
      .from('game_players')
      .insert({
        game_id: game.id,
        auth0_user_id: user.sub,
        joined_at: new Date().toISOString(),
        total_score: 0,
      })
      .select()
      .single()

    if (insertError) {
      return internalErrorResponse(insertError, 'POST /api/games/join - insert player')
    }

    // Count current players
    const { count: playerCount } = await supabase
      .from('game_players')
      .select('*', { count: 'exact' })
      .eq('game_id', game.id)

    // Get current open phase
    const { data: currentPhase } = await supabase
      .from('tournament_phases')
      .select('phase_key, is_open')
      .eq('game_id', game.id)
      .eq('is_open', true)
      .single()

    return successResponse(
      {
        game_id: game.id,
        name: game.name,
        current_phase: currentPhase?.phase_key || 'LEAGUE',
        is_open: game.status === 'OPEN',
        player_count: playerCount || 1,
      },
      201
    )
  } catch (error) {
    
    return internalErrorResponse(error, 'POST /api/games/join')
  }
}
