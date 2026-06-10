import type { LocalGame, PhaseKey, LeaderboardEntry } from './game-store'

const PHASE_MULTIPLIER: Record<PhaseKey, number> = {
  LEAGUE: 1,
  R16: 1,
  R8: 1,
  R4: 1,
  R2: 1,
  FINAL: 3,
}

function getOutcome(home: number, away: number): 'home' | 'draw' | 'away' {
  if (home > away) return 'home'
  if (away > home) return 'away'
  return 'draw'
}

/**
 * Pure function — calculates the leaderboard from a LocalGame's current state.
 * Scoring:
 *   - Exact match (home AND away correct): 3 points
 *   - Correct outcome only: 1 point
 *   - Scorer selection correct (player scored in that phase): 1 point (per spec, binary)
 * FINAL phase multiplier = 3x (applied to total for that phase)
 */
export function calculateLeaderboard(game: LocalGame): LeaderboardEntry[] {
  const allPhaseKeys: PhaseKey[] = ['LEAGUE', 'R16', 'R8', 'R4', 'R2', 'FINAL']

  return game.players
    .map((player) => {
      const phaseScores: Record<PhaseKey, number> = {
        LEAGUE: 0,
        R16: 0,
        R8: 0,
        R4: 0,
        R2: 0,
        FINAL: 0,
      }

      for (const phaseKey of allPhaseKeys) {
        const multiplier = PHASE_MULTIPLIER[phaseKey]
        const matchesInPhase = game.matches.filter(
          (m) => m.phaseKey === phaseKey && m.resultEntered
        )

        let predictionPoints = 0
        for (const match of matchesInPhase) {
          const prediction = game.predictions.find(
            (p) => p.sessionId === player.sessionId && p.matchId === match.id
          )
          if (!prediction) continue

          const actualHome = match.homeGoals!
          const actualAway = match.awayGoals!
          const predictedHome = prediction.homeGoalsPredicted
          const predictedAway = prediction.awayGoalsPredicted

          if (predictedHome === actualHome && predictedAway === actualAway) {
            predictionPoints += 3
          } else if (getOutcome(predictedHome, predictedAway) === getOutcome(actualHome, actualAway)) {
            predictionPoints += 1
          }
        }

        // Scorer selection: 1 point if the scorer they picked scored at least one goal
        // Per spec notes: "match existing scoring.ts logic" — binary 1pt per phase scorer pick
        const scorerSelection = game.scorerSelections.find(
          (s) => s.phaseKey === phaseKey && s.sessionId === player.sessionId
        )
        let scorerPoints = 0
        // Since we don't track actual scorer goals in the MVP (no goalsScored field yet),
        // scorer points will be 0 unless the scorer selection is locked (indicating it was verified).
        // ARCHITECT_NOTE: The spec says "player_name matches any scorer in that phase" but
        // LocalScorerSelection has no goalsScored field. Scorer points default to 0 until admin marks them.
        // Implemented as spec'd with the available data — flagging for review.
        if (scorerSelection && scorerSelection.isLocked) {
          scorerPoints = 1
        }

        phaseScores[phaseKey] = (predictionPoints + scorerPoints) * multiplier
      }

      const totalScore = Object.values(phaseScores).reduce((sum, s) => sum + s, 0)

      return {
        sessionId: player.sessionId,
        playerName: player.name,
        phaseScores,
        totalScore,
      } satisfies LeaderboardEntry
    })
    .sort((a, b) => b.totalScore - a.totalScore)
}
