import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import { successResponse, internalErrorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse } from '@/lib/api-utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; phase_key: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id, phase_key } = await params
    const gameId = id
    const phaseKey = phase_key

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

    // Fetch and update phase
    const { data: phase, error: phaseError } = await supabase
      .from('tournament_phases')
      .update({
        is_locked: true,
        locked_at: new Date().toISOString(),
      })
      .eq('game_id', gameId)
      .eq('phase_key', phaseKey)
      .select()
      .single()

    if (phaseError || !phase) {
      return notFoundResponse()
    }

    // Fetch all tournament phases for this game
    const { data: allPhases, error: allPhasesError } = await supabase
      .from('tournament_phases')
      .select('*')
      .eq('game_id', gameId)

    if (allPhasesError) {
      return internalErrorResponse(allPhasesError, 'PUT /api/games/:id/phase/:phase_key/lock')
    }

    return successResponse({ tournament_phases: allPhases || [] })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse()
    }
    return internalErrorResponse(error, 'PUT /api/games/:id/phase/:phase_key/lock')
  }
}
