import { calculateLeaderboard } from '../local-scoring'
import type { LocalGame, LocalPlayer, LocalMatch, LocalPrediction, LocalScorerSelection } from '../game-store'

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makePlayer(sessionId: string, name: string): LocalPlayer {
  return { sessionId, name, joinedAt: '2026-06-10T00:00:00.000Z' }
}

function makeMatch(
  id: string,
  phaseKey: LocalMatch['phaseKey'],
  homeGoals: number | null,
  awayGoals: number | null
): LocalMatch {
  return {
    id,
    phaseKey,
    matchNumber: 1,
    homeTeam: 'Team A',
    awayTeam: 'Team B',
    scheduledAt: '2026-06-15T00:00:00.000Z',
    homeGoals,
    awayGoals,
    resultEntered: homeGoals !== null && awayGoals !== null,
  }
}

function makePrediction(
  id: string,
  sessionId: string,
  matchId: string,
  homeGoalsPredicted: number,
  awayGoalsPredicted: number
): LocalPrediction {
  return {
    id,
    sessionId,
    matchId,
    homeGoalsPredicted,
    awayGoalsPredicted,
    createdAt: '2026-06-10T00:00:00.000Z',
    updatedAt: '2026-06-10T00:00:00.000Z',
  }
}

function makeScorerSelection(
  id: string,
  sessionId: string,
  phaseKey: LocalScorerSelection['phaseKey'],
  playerName: string,
  isLocked: boolean
): LocalScorerSelection {
  return {
    id,
    phaseKey,
    sessionId,
    playerName,
    isLocked,
    createdAt: '2026-06-10T00:00:00.000Z',
    updatedAt: '2026-06-10T00:00:00.000Z',
  }
}

function makeBaseGame(overrides: Partial<LocalGame> = {}): LocalGame {
  return {
    id: 'game-1',
    name: 'Test Game',
    inviteCode: 'ABC1234',
    creatorSessionId: 'session-creator',
    status: 'IN_PROGRESS',
    createdAt: '2026-06-10T00:00:00.000Z',
    updatedAt: '2026-06-10T00:00:00.000Z',
    players: [],
    phases: [],
    matches: [],
    predictions: [],
    scorerSelections: [],
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('calculateLeaderboard', () => {
  it('should return an empty array when there are no players', () => {
    const game = makeBaseGame({ players: [], matches: [], predictions: [] })
    expect(calculateLeaderboard(game)).toEqual([])
  })

  it('should return players with zero scores if there are no results', () => {
    const player = makePlayer('s1', 'Alice')
    const match = makeMatch('m1', 'LEAGUE', null, null) // no result yet
    const prediction = makePrediction('p1', 's1', 'm1', 2, 1)

    const game = makeBaseGame({
      players: [player],
      matches: [match],
      predictions: [prediction],
    })

    const result = calculateLeaderboard(game)
    expect(result).toHaveLength(1)
    expect(result[0].totalScore).toBe(0)
    expect(result[0].playerName).toBe('Alice')
  })

  it('should award 3 points for an exact score prediction', () => {
    const player = makePlayer('s1', 'Alice')
    const match = makeMatch('m1', 'LEAGUE', 2, 1) // result: 2-1
    const prediction = makePrediction('p1', 's1', 'm1', 2, 1) // exact: 2-1

    const game = makeBaseGame({
      players: [player],
      matches: [match],
      predictions: [prediction],
    })

    const result = calculateLeaderboard(game)
    expect(result[0].totalScore).toBe(3) // 3 pts exact * 1 (LEAGUE multiplier)
    expect(result[0].phaseScores.LEAGUE).toBe(3)
  })

  it('should award 1 point for a correct outcome (home win) prediction', () => {
    const player = makePlayer('s1', 'Alice')
    const match = makeMatch('m1', 'LEAGUE', 3, 1) // result: 3-1 (home win)
    const prediction = makePrediction('p1', 's1', 'm1', 2, 0) // predicted 2-0 (home win, wrong score)

    const game = makeBaseGame({
      players: [player],
      matches: [match],
      predictions: [prediction],
    })

    const result = calculateLeaderboard(game)
    expect(result[0].totalScore).toBe(1)
    expect(result[0].phaseScores.LEAGUE).toBe(1)
  })

  it('should award 1 point for correct outcome (draw) prediction', () => {
    const player = makePlayer('s1', 'Alice')
    const match = makeMatch('m1', 'LEAGUE', 1, 1) // draw
    const prediction = makePrediction('p1', 's1', 'm1', 0, 0) // predicted draw

    const game = makeBaseGame({
      players: [player],
      matches: [match],
      predictions: [prediction],
    })

    const result = calculateLeaderboard(game)
    expect(result[0].totalScore).toBe(1)
  })

  it('should award 1 point for correct outcome (away win) prediction', () => {
    const player = makePlayer('s1', 'Alice')
    const match = makeMatch('m1', 'LEAGUE', 0, 2) // away win
    const prediction = makePrediction('p1', 's1', 'm1', 1, 3) // predicted away win

    const game = makeBaseGame({
      players: [player],
      matches: [match],
      predictions: [prediction],
    })

    const result = calculateLeaderboard(game)
    expect(result[0].totalScore).toBe(1)
  })

  it('should award 0 points for incorrect outcome prediction', () => {
    const player = makePlayer('s1', 'Alice')
    const match = makeMatch('m1', 'LEAGUE', 2, 0) // home win
    const prediction = makePrediction('p1', 's1', 'm1', 0, 2) // predicted away win

    const game = makeBaseGame({
      players: [player],
      matches: [match],
      predictions: [prediction],
    })

    const result = calculateLeaderboard(game)
    expect(result[0].totalScore).toBe(0)
  })

  it('should award 0 points if player has no prediction for a match', () => {
    const player = makePlayer('s1', 'Alice')
    const match = makeMatch('m1', 'LEAGUE', 2, 1)
    // No prediction for s1

    const game = makeBaseGame({
      players: [player],
      matches: [match],
      predictions: [],
    })

    const result = calculateLeaderboard(game)
    expect(result[0].totalScore).toBe(0)
  })

  it('should apply 3x multiplier for FINAL phase', () => {
    const player = makePlayer('s1', 'Alice')
    const match = makeMatch('m1', 'FINAL', 2, 1)
    const prediction = makePrediction('p1', 's1', 'm1', 2, 1) // exact = 3 pts * 3x = 9

    const game = makeBaseGame({
      players: [player],
      matches: [match],
      predictions: [prediction],
    })

    const result = calculateLeaderboard(game)
    expect(result[0].phaseScores.FINAL).toBe(9)
    expect(result[0].totalScore).toBe(9)
  })

  it('should apply 3x multiplier for FINAL phase outcome only (1pt * 3 = 3)', () => {
    const player = makePlayer('s1', 'Alice')
    const match = makeMatch('m1', 'FINAL', 3, 1) // home win
    const prediction = makePrediction('p1', 's1', 'm1', 2, 0) // home win, wrong score

    const game = makeBaseGame({
      players: [player],
      matches: [match],
      predictions: [prediction],
    })

    const result = calculateLeaderboard(game)
    expect(result[0].phaseScores.FINAL).toBe(3) // 1 * 3x
    expect(result[0].totalScore).toBe(3)
  })

  it('should award 1 scorer point for a locked scorer selection', () => {
    const player = makePlayer('s1', 'Alice')
    const scorerSelection = makeScorerSelection('ss1', 's1', 'LEAGUE', 'Mbappé', true) // locked

    const game = makeBaseGame({
      players: [player],
      matches: [],
      predictions: [],
      scorerSelections: [scorerSelection],
    })

    const result = calculateLeaderboard(game)
    expect(result[0].phaseScores.LEAGUE).toBe(1) // scorer point (1pt * 1x multiplier)
    expect(result[0].totalScore).toBe(1)
  })

  it('should NOT award scorer point for an unlocked scorer selection', () => {
    const player = makePlayer('s1', 'Alice')
    const scorerSelection = makeScorerSelection('ss1', 's1', 'LEAGUE', 'Mbappé', false) // NOT locked

    const game = makeBaseGame({
      players: [player],
      matches: [],
      predictions: [],
      scorerSelections: [scorerSelection],
    })

    const result = calculateLeaderboard(game)
    expect(result[0].totalScore).toBe(0)
  })

  it('should award scorer point * 3x multiplier in FINAL phase', () => {
    const player = makePlayer('s1', 'Alice')
    const scorerSelection = makeScorerSelection('ss1', 's1', 'FINAL', 'Mbappé', true) // locked in FINAL

    const game = makeBaseGame({
      players: [player],
      matches: [],
      predictions: [],
      scorerSelections: [scorerSelection],
    })

    const result = calculateLeaderboard(game)
    expect(result[0].phaseScores.FINAL).toBe(3) // 1 scorer pt * 3x
    expect(result[0].totalScore).toBe(3)
  })

  it('should sort players by total score descending', () => {
    const alice = makePlayer('s1', 'Alice')
    const bob = makePlayer('s2', 'Bob')
    const carol = makePlayer('s3', 'Carol')

    // Alice: 3 pts (exact)
    // Bob: 1 pt (outcome only)
    // Carol: 0 pts (wrong)
    const match = makeMatch('m1', 'LEAGUE', 2, 1)
    const predictions: LocalPrediction[] = [
      makePrediction('p1', 's1', 'm1', 2, 1), // Alice exact
      makePrediction('p2', 's2', 'm1', 3, 1), // Bob outcome
      makePrediction('p3', 's3', 'm1', 0, 2), // Carol wrong
    ]

    const game = makeBaseGame({
      players: [bob, carol, alice], // scrambled order
      matches: [match],
      predictions,
    })

    const result = calculateLeaderboard(game)
    expect(result[0].playerName).toBe('Alice')
    expect(result[0].totalScore).toBe(3)
    expect(result[1].playerName).toBe('Bob')
    expect(result[1].totalScore).toBe(1)
    expect(result[2].playerName).toBe('Carol')
    expect(result[2].totalScore).toBe(0)
  })

  it('should accumulate scores across multiple matches in same phase', () => {
    const player = makePlayer('s1', 'Alice')
    const match1 = makeMatch('m1', 'LEAGUE', 2, 1)
    const match2 = makeMatch('m2', 'LEAGUE', 0, 0)
    const predictions: LocalPrediction[] = [
      makePrediction('p1', 's1', 'm1', 2, 1), // exact: 3pts
      makePrediction('p2', 's1', 'm2', 0, 0), // exact: 3pts
    ]

    const game = makeBaseGame({
      players: [player],
      matches: [match1, match2],
      predictions,
    })

    const result = calculateLeaderboard(game)
    expect(result[0].phaseScores.LEAGUE).toBe(6)
    expect(result[0].totalScore).toBe(6)
  })

  it('should accumulate scores across multiple phases', () => {
    const player = makePlayer('s1', 'Alice')
    const leagueMatch = makeMatch('m1', 'LEAGUE', 2, 1)
    const r16Match = makeMatch('m2', 'R16', 1, 0)
    const predictions: LocalPrediction[] = [
      makePrediction('p1', 's1', 'm1', 2, 1), // exact LEAGUE: 3pts
      makePrediction('p2', 's1', 'm2', 1, 0), // exact R16: 3pts
    ]

    const game = makeBaseGame({
      players: [player],
      matches: [leagueMatch, r16Match],
      predictions,
    })

    const result = calculateLeaderboard(game)
    expect(result[0].phaseScores.LEAGUE).toBe(3)
    expect(result[0].phaseScores.R16).toBe(3)
    expect(result[0].totalScore).toBe(6)
  })

  it('should include all phases in phaseScores output', () => {
    const player = makePlayer('s1', 'Alice')
    const game = makeBaseGame({ players: [player] })

    const result = calculateLeaderboard(game)
    const scores = result[0].phaseScores
    expect(scores).toHaveProperty('LEAGUE')
    expect(scores).toHaveProperty('R16')
    expect(scores).toHaveProperty('R8')
    expect(scores).toHaveProperty('R4')
    expect(scores).toHaveProperty('R2')
    expect(scores).toHaveProperty('FINAL')
  })

  it('should include sessionId and playerName in each entry', () => {
    const player = makePlayer('s1', 'Alice')
    const game = makeBaseGame({ players: [player] })

    const result = calculateLeaderboard(game)
    expect(result[0].sessionId).toBe('s1')
    expect(result[0].playerName).toBe('Alice')
  })
})
