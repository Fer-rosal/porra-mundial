import { SupabaseClient } from '@supabase/supabase-js'
import { PhaseScore, Leaderboard } from '../types'

interface CalculationResult {
  phase_scores: PhaseScore[]
  leaderboard: Leaderboard[]
}

const PHASE_KEYS = ['LEAGUE', 'R16', 'R8', 'R4', 'R2', 'FINAL']
const PHASE_KEY_TO_INDEX: Record<string, number> = {
  LEAGUE: 1,
  R16: 2,
  R8: 3,
  R4: 4,
  R2: 5,
  FINAL: 6,
}

// Scoring rules
const EXACT_MATCH_POINTS_REGULAR = 3
const EXACT_MATCH_POINTS_FINAL = 8
const ONE_X_TWO_POINTS_REGULAR = 1
const ONE_X_TWO_POINTS_FINAL = 3
const SCORER_POINTS_REGULAR = 1
const SCORER_POINTS_FINAL = 2

function isFinalPhase(phaseKey: string): boolean {
  return phaseKey === 'FINAL'
}

function getPredictionScore(
  homePredicted: number,
  awayPredicted: number,
  homeActual: number,
  awayActual: number,
  phaseKey: string
): number {
  const isFinal = isFinalPhase(phaseKey)
  const exactMatchPoints = isFinal ? EXACT_MATCH_POINTS_FINAL : EXACT_MATCH_POINTS_REGULAR
  const oneX2Points = isFinal ? ONE_X_TWO_POINTS_FINAL : ONE_X_TWO_POINTS_REGULAR

  // Exact match
  if (homePredicted === homeActual && awayPredicted === awayActual) {
    return exactMatchPoints
  }

  // 1X2 match (home win, draw, away win)
  const predictedResult =
    homePredicted > awayPredicted ? 'H' : homePredicted < awayPredicted ? 'A' : 'D'
  const actualResult = homeActual > awayActual ? 'H' : homeActual < awayActual ? 'A' : 'D'

  if (predictedResult === actualResult) {
    return oneX2Points
  }

  return 0
}

export async function calculatePhaseScores(
  supabaseClient: SupabaseClient,
  gameId: string,
  phaseKey: string
): Promise<CalculationResult> {
  try {
    // 1. Fetch phase details
    const { data: phase, error: phaseError } = await supabaseClient
      .from('tournament_phases')
      .select('*')
      .eq('game_id', gameId)
      .eq('phase_key', phaseKey)
      .single()

    if (phaseError || !phase) {
      throw new Error(`Phase not found: ${phaseKey}`)
    }

    // 2. Fetch all matches in phase with results
    const { data: matches, error: matchesError } = await supabaseClient
      .from('matches')
      .select('*')
      .eq('tournament_phase_id', phase.id)

    if (matchesError) throw matchesError

    // 3. Fetch all game players
    const { data: gamePlayers, error: gamePlayersError } = await supabaseClient
      .from('game_players')
      .select('*')
      .eq('game_id', gameId)

    if (gamePlayersError) throw gamePlayersError

    // 4. Fetch all predictions for this game in this phase
    const { data: predictions, error: predictionsError } = await supabaseClient
      .from('predictions')
      .select('*')
      .in(
        'game_player_id',
        gamePlayers?.map((gp) => gp.id) || []
      )

    if (predictionsError) throw predictionsError

    // 5. Fetch all scorer_selections for this phase
    const { data: scorerSelections, error: scorerSelectionsError } = await supabaseClient
      .from('scorer_selections')
      .select('*')
      .eq('tournament_phase_id', phase.id)

    if (scorerSelectionsError) throw scorerSelectionsError

    // 6. Fetch all scorer_points for this phase
    const { data: scorerPoints, error: scorerPointsError } = await supabaseClient
      .from('scorer_points')
      .select('*')
      .eq('tournament_phase_id', phase.id)

    if (scorerPointsError) throw scorerPointsError

    // Calculate scores for each player
    const phaseScores: PhaseScore[] = []
    const playerScoreMap: Map<string, { prediction_score: number; scorer_score: number }> =
      new Map()

    if (gamePlayers) {
      for (const gamePlayer of gamePlayers) {
        let predictionScore = 0
        let scorerScore = 0

        // Calculate prediction score for this player in this phase
        const playerPredictions = predictions?.filter(
          (p) => p.game_player_id === gamePlayer.id
        ) || []

        for (const prediction of playerPredictions) {
          const match = matches?.find((m) => m.id === prediction.match_id)
          if (match && match.result_entered && match.home_goals !== null && match.away_goals !== null) {
            predictionScore += getPredictionScore(
              prediction.home_goals_predicted,
              prediction.away_goals_predicted,
              match.home_goals,
              match.away_goals,
              phaseKey
            )
          }
        }

        // Calculate scorer score for this player in this phase
        const playerScorerPoints = scorerPoints?.find(
          (sp) => sp.game_player_id === gamePlayer.id && sp.tournament_phase_id === phase.id
        )

        if (playerScorerPoints) {
          const isFinal = isFinalPhase(phaseKey)
          const scorerPointsMultiplier = isFinal ? SCORER_POINTS_FINAL : SCORER_POINTS_REGULAR
          scorerScore = playerScorerPoints.goals_count * scorerPointsMultiplier
        }

        playerScoreMap.set(gamePlayer.id, { prediction_score: predictionScore, scorer_score: scorerScore })

        // Create or update phase_scores record
        const { data: existingScore } = await supabaseClient
          .from('phase_scores')
          .select('*')
          .eq('game_player_id', gamePlayer.id)
          .eq('tournament_phase_id', phase.id)
          .single()

        const phaseScoreData = {
          game_player_id: gamePlayer.id,
          tournament_phase_id: phase.id,
          prediction_score: predictionScore,
          scorer_score: scorerScore,
        }

        if (existingScore) {
          const { data: updated, error: updateError } = await supabaseClient
            .from('phase_scores')
            .update(phaseScoreData)
            .eq('id', existingScore.id)
            .select()
            .single()

          if (updateError) throw updateError
          if (updated) phaseScores.push(updated)
        } else {
          const { data: inserted, error: insertError } = await supabaseClient
            .from('phase_scores')
            .insert([phaseScoreData])
            .select()
            .single()

          if (insertError) throw insertError
          if (inserted) phaseScores.push(inserted)
        }
      }
    }

    // 7. Update game_players.total_score with sum of all phases
    for (const gamePlayer of gamePlayers || []) {
      const { data: allPhaseScores } = await supabaseClient
        .from('phase_scores')
        .select('phase_total')
        .eq('game_player_id', gamePlayer.id)

      const totalScore =
        allPhaseScores?.reduce((sum, ps) => sum + (ps.phase_total || 0), 0) || 0

      await supabaseClient
        .from('game_players')
        .update({ total_score: totalScore })
        .eq('id', gamePlayer.id)
    }

    // 8. Build leaderboard
    const leaderboard: Leaderboard[] = []

    for (const gamePlayer of gamePlayers || []) {
      const { data: phases } = await supabaseClient
        .from('phase_scores')
        .select(
          `
          phase_scores!inner(phase_total),
          tournament_phases!inner(phase_key)
        `
        )
        .eq('game_player_id', gamePlayer.id)

      const leaderboardEntry: Leaderboard = {
        game_player_id: gamePlayer.id,
        player_name: gamePlayer.auth0_user_id, // TODO: fetch actual name from Auth0
        phase_1_score: 0,
        phase_2_score: 0,
        phase_3_score: 0,
        phase_4_score: 0,
        phase_5_score: 0,
        phase_6_score: 0,
        total_score: gamePlayer.total_score,
      }

      // Populate phase scores from the query
      // This is a simplified approach; a better implementation would aggregate phase_scores directly
      const { data: playerPhaseScores } = await supabaseClient
        .from('phase_scores')
        .select('phase_total, tournament_phases(phase_key)')
        .eq('game_player_id', gamePlayer.id)

      if (playerPhaseScores) {
        for (const ps of playerPhaseScores) {
          if (ps.tournament_phases) {
            const phaseIndex = PHASE_KEY_TO_INDEX[(ps.tournament_phases as any).phase_key]
            if (phaseIndex) {
              (leaderboardEntry as any)[`phase_${phaseIndex}_score`] = ps.phase_total || 0
            }
          }
        }
      }

      leaderboard.push(leaderboardEntry)
    }

    // Sort leaderboard by total_score DESC
    leaderboard.sort((a, b) => b.total_score - a.total_score)

    return { phase_scores: phaseScores, leaderboard }
  } catch (error) {
    console.error('Error calculating phase scores:', error)
    throw error
  }
}
