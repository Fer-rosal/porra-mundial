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

    // Fetch all predictions with match details
    const { data: predictions } = await supabase
      .from('predictions')
      .select('*, game_players!inner(auth0_user_id), matches!inner(home_team, away_team, home_goals, away_goals)')
      .in(
        'game_player_id',
        (
          await supabase
            .from('game_players')
            .select('id')
            .eq('game_id', gameId)
        ).data?.map((gp: any) => gp.id) || []
      )

    // Fetch all scorer selections with details
    const { data: scorers } = await supabase
      .from('scorer_selections')
      .select('*, game_players!inner(auth0_user_id), tournament_phases!inner(phase_key)')
      .in(
        'game_player_id',
        (
          await supabase
            .from('game_players')
            .select('id')
            .eq('game_id', gameId)
        ).data?.map((gp: any) => gp.id) || []
      )

    // Fetch all matches with results
    const { data: matches } = await supabase
      .from('matches')
      .select('*, tournament_phases!inner(phase_key)')
      .in(
        'tournament_phase_id',
        (
          await supabase
            .from('tournament_phases')
            .select('id')
            .eq('game_id', gameId)
        ).data?.map((tp: any) => tp.id) || []
      )

    // Fetch all phase scores
    const { data: phaseScores } = await supabase
      .from('phase_scores')
      .select('*, game_players!inner(auth0_user_id), tournament_phases!inner(phase_key)')
      .in(
        'game_player_id',
        (
          await supabase
            .from('game_players')
            .select('id')
            .eq('game_id', gameId)
        ).data?.map((gp: any) => gp.id) || []
      )

    return successResponse({
      predictions: (predictions || []).map((p: any) => ({
        game_player_id: p.game_player_id,
        player_name: p.game_players.auth0_user_id,
        match_id: p.match_id,
        home_team: p.matches.home_team,
        away_team: p.matches.away_team,
        home_goals_predicted: p.home_goals_predicted,
        away_goals_predicted: p.away_goals_predicted,
        home_goals_actual: p.matches.home_goals,
        away_goals_actual: p.matches.away_goals,
      })),
      scorers: (scorers || []).map((s: any) => ({
        game_player_id: s.game_player_id,
        player_name: s.game_players.auth0_user_id,
        phase_key: s.tournament_phases.phase_key,
        selected_player: s.player_name,
        is_locked: s.is_locked,
      })),
      results: (matches || []).map((m: any) => ({
        match_number: m.match_number,
        home_team: m.home_team,
        away_team: m.away_team,
        home_goals: m.home_goals,
        away_goals: m.away_goals,
        result_entered: m.result_entered,
        phase_key: m.tournament_phases.phase_key,
      })),
      phase_scores: (phaseScores || []).map((ps: any) => ({
        game_player_id: ps.game_player_id,
        player_name: ps.game_players.auth0_user_id,
        phase_key: ps.tournament_phases.phase_key,
        prediction_score: ps.prediction_score,
        scorer_score: ps.scorer_score,
        phase_total: ps.phase_total,
      })),
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse()
    }
    return internalErrorResponse(error, 'GET /api/games/:id/history')
  }
}
