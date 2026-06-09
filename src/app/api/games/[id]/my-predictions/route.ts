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
    const searchParams = request.nextUrl.searchParams
    const phaseKeyParam = searchParams.get('phase_key')

    // Verify user is in game
    const { data: gamePlayer } = await supabase
      .from('game_players')
      .select('id')
      .eq('game_id', gameId)
      .eq('auth0_user_id', user.sub)
      .single()

    if (!gamePlayer) {
      return forbiddenResponse()
    }

    // Get current open phase or specified phase
    let phase
    if (phaseKeyParam) {
      const { data } = await supabase
        .from('tournament_phases')
        .select('*')
        .eq('game_id', gameId)
        .eq('phase_key', phaseKeyParam)
        .single()
      phase = data
    } else {
      // Default to open phase or first phase
      const { data } = await supabase
        .from('tournament_phases')
        .select('*')
        .eq('game_id', gameId)
        .eq('is_open', true)
        .single()

      if (!data) {
        // Default to LEAGUE
        const { data: firstPhase } = await supabase
          .from('tournament_phases')
          .select('*')
          .eq('game_id', gameId)
          .eq('phase_key', 'LEAGUE')
          .single()
        phase = firstPhase
      } else {
        phase = data
      }
    }

    if (!phase) {
      return notFoundResponse()
    }

    // Fetch predictions for this player in this phase
    const { data: predictions, error: predError } = await supabase
      .from('predictions')
      .select('p:id, p:match_id, p:home_goals_predicted, p:away_goals_predicted, matches!inner(home_team, away_team)')
      .eq('game_player_id', gamePlayer.id)

    if (predError) {
      return internalErrorResponse(predError, 'GET /api/games/:id/my-predictions - fetch predictions')
    }

    // Filter predictions to only those in the current phase
    const matchIds = new Set<string>()
    const { data: phaseMatches } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_phase_id', phase.id)

    if (phaseMatches) {
      phaseMatches.forEach((m: any) => matchIds.add(m.id))
    }

    const phasePredictions = (predictions || []).filter((p: any) => matchIds.has(p.match_id))

    // Fetch scorer selection for this phase
    const { data: scorerSelection } = await supabase
      .from('scorer_selections')
      .select('id, player_name, is_locked')
      .eq('tournament_phase_id', phase.id)
      .eq('game_player_id', gamePlayer.id)
      .single()

    return successResponse({
      phase_key: phase.phase_key,
      predictions: phasePredictions.map((p: any) => ({
        id: p.id,
        match_id: p.match_id,
        home_team: (p.matches as any).home_team,
        away_team: (p.matches as any).away_team,
        home_goals_predicted: p.home_goals_predicted,
        away_goals_predicted: p.away_goals_predicted,
      })),
      scorer_selection: scorerSelection || null,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse()
    }
    return internalErrorResponse(error, 'GET /api/games/:id/my-predictions')
  }
}
