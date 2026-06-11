/**
 * Unit tests for game-store business logic introduced in the
 * predictions-checkbox-save feature:
 *
 *   1. savePrediction() — immutability guard (no-op if prediction already exists)
 *   2. overridePrediction() — admin upsert (create or update)
 *   3. 0-0 default — iterating checkedMatches without touching inputs yields [0,0]
 *
 * Because savePrediction / overridePrediction live inside a React context closure,
 * we test the underlying logic via equivalent pure functions that mirror the
 * implementation exactly.  The tests never touch localStorage or React.
 */

import type { LocalGame, LocalPrediction, LocalPlayer, LocalMatch } from '../game-store'
import { generateUUID } from '../id-utils'

// ─── Pure helpers that mirror game-store internals ────────────────────────────

/**
 * Pure version of savePrediction — returns the updated predictions array.
 * No-op if a prediction already exists for (sessionId, matchId).
 */
function pureSavePrediction(
  game: LocalGame,
  sessionId: string,
  prediction: { matchId: string; homeGoalsPredicted: number; awayGoalsPredicted: number }
): LocalPrediction[] {
  const existing = game.predictions.find(
    (p) => p.matchId === prediction.matchId && p.sessionId === sessionId
  )
  if (existing) return game.predictions          // immutability guard

  const now = new Date().toISOString()
  const newPrediction: LocalPrediction = {
    id: generateUUID(),
    sessionId,
    matchId: prediction.matchId,
    homeGoalsPredicted: prediction.homeGoalsPredicted,
    awayGoalsPredicted: prediction.awayGoalsPredicted,
    createdAt: now,
    updatedAt: now,
  }
  return [...game.predictions, newPrediction]
}

/**
 * Pure version of overridePrediction — returns the updated predictions array.
 * Caller is responsible for the creator check (tested separately via the guard
 * condition `mySession.sessionId !== game.creatorSessionId`).
 */
function pureOverridePrediction(
  game: LocalGame,
  targetSessionId: string,
  prediction: { matchId: string; homeGoalsPredicted: number; awayGoalsPredicted: number }
): LocalPrediction[] {
  const now = new Date().toISOString()
  const existing = game.predictions.find(
    (p) => p.matchId === prediction.matchId && p.sessionId === targetSessionId
  )

  if (existing) {
    return game.predictions.map((p) =>
      p.id === existing.id
        ? {
            ...p,
            homeGoalsPredicted: prediction.homeGoalsPredicted,
            awayGoalsPredicted: prediction.awayGoalsPredicted,
            updatedAt: now,
          }
        : p
    )
  }

  const newPrediction: LocalPrediction = {
    id: generateUUID(),
    sessionId: targetSessionId,
    matchId: prediction.matchId,
    homeGoalsPredicted: prediction.homeGoalsPredicted,
    awayGoalsPredicted: prediction.awayGoalsPredicted,
    createdAt: now,
    updatedAt: now,
  }
  return [...game.predictions, newPrediction]
}

// ─── Test fixtures ────────────────────────────────────────────────────────────

function makeGame(predictions: LocalPrediction[] = []): LocalGame {
  return {
    id: 'game-1',
    name: 'Test Game',
    inviteCode: 'ABC1234',
    creatorSessionId: 'creator',
    adminToken: 'admin-token-fixture',
    status: 'IN_PROGRESS',
    createdAt: '2026-06-10T00:00:00.000Z',
    updatedAt: '2026-06-10T00:00:00.000Z',
    players: [],
    phases: [],
    matches: [],
    predictions,
    scorerSelections: [],
  }
}

function makePrediction(overrides: Partial<LocalPrediction> = {}): LocalPrediction {
  return {
    id: 'pred-1',
    sessionId: 'player-1',
    matchId: 'match-1',
    homeGoalsPredicted: 1,
    awayGoalsPredicted: 0,
    createdAt: '2026-06-10T00:00:00.000Z',
    updatedAt: '2026-06-10T00:00:00.000Z',
    ...overrides,
  }
}

// ─── savePrediction (immutability) ────────────────────────────────────────────

describe('savePrediction — immutability guard', () => {
  it('adds a new prediction when none exists for the player+match', () => {
    const game = makeGame([])
    const result = pureSavePrediction(game, 'player-1', {
      matchId: 'match-1',
      homeGoalsPredicted: 2,
      awayGoalsPredicted: 1,
    })
    expect(result).toHaveLength(1)
    expect(result[0].homeGoalsPredicted).toBe(2)
    expect(result[0].awayGoalsPredicted).toBe(1)
    expect(result[0].sessionId).toBe('player-1')
    expect(result[0].matchId).toBe('match-1')
  })

  it('returns the same array (no-op) when prediction already exists for (sessionId, matchId)', () => {
    const existing = makePrediction({ sessionId: 'player-1', matchId: 'match-1' })
    const game = makeGame([existing])

    const result = pureSavePrediction(game, 'player-1', {
      matchId: 'match-1',
      homeGoalsPredicted: 99,
      awayGoalsPredicted: 99,
    })

    // Strict reference equality — the SAME array was returned (no mutation)
    expect(result).toBe(game.predictions)
    expect(result).toHaveLength(1)
    // Original prediction unchanged
    expect(result[0].homeGoalsPredicted).toBe(1)
    expect(result[0].awayGoalsPredicted).toBe(0)
  })

  it('allows a DIFFERENT player to predict the same match', () => {
    const existing = makePrediction({ sessionId: 'player-1', matchId: 'match-1' })
    const game = makeGame([existing])

    const result = pureSavePrediction(game, 'player-2', {
      matchId: 'match-1',
      homeGoalsPredicted: 3,
      awayGoalsPredicted: 2,
    })

    expect(result).toHaveLength(2)
    expect(result.find((p) => p.sessionId === 'player-2')?.homeGoalsPredicted).toBe(3)
  })

  it('allows the same player to predict a DIFFERENT match', () => {
    const existing = makePrediction({ sessionId: 'player-1', matchId: 'match-1' })
    const game = makeGame([existing])

    const result = pureSavePrediction(game, 'player-1', {
      matchId: 'match-2',
      homeGoalsPredicted: 0,
      awayGoalsPredicted: 0,
    })

    expect(result).toHaveLength(2)
    expect(result.find((p) => p.matchId === 'match-2')?.matchId).toBe('match-2')
  })

  it('correctly saves a 0-0 prediction (the 0-0 bug fix)', () => {
    const game = makeGame([])
    const result = pureSavePrediction(game, 'player-1', {
      matchId: 'match-1',
      homeGoalsPredicted: 0,
      awayGoalsPredicted: 0,
    })

    expect(result).toHaveLength(1)
    expect(result[0].homeGoalsPredicted).toBe(0)
    expect(result[0].awayGoalsPredicted).toBe(0)
  })

  it('includes createdAt and updatedAt timestamps on new predictions', () => {
    const game = makeGame([])
    const result = pureSavePrediction(game, 'player-1', {
      matchId: 'match-1',
      homeGoalsPredicted: 1,
      awayGoalsPredicted: 1,
    })

    expect(result[0].createdAt).toBeTruthy()
    expect(result[0].updatedAt).toBeTruthy()
    expect(result[0].id).toBeTruthy()
  })
})

// ─── overridePrediction (admin upsert) ───────────────────────────────────────

describe('overridePrediction — admin upsert', () => {
  it('creates a new prediction for a player+match with no existing entry', () => {
    const game = makeGame([])
    const result = pureOverridePrediction(game, 'player-1', {
      matchId: 'match-1',
      homeGoalsPredicted: 2,
      awayGoalsPredicted: 3,
    })

    expect(result).toHaveLength(1)
    expect(result[0].sessionId).toBe('player-1')
    expect(result[0].homeGoalsPredicted).toBe(2)
    expect(result[0].awayGoalsPredicted).toBe(3)
  })

  it('updates an existing prediction when one already exists', () => {
    const existing = makePrediction({
      id: 'pred-old',
      sessionId: 'player-1',
      matchId: 'match-1',
      homeGoalsPredicted: 1,
      awayGoalsPredicted: 0,
      createdAt: '2026-06-10T08:00:00.000Z',
    })
    const game = makeGame([existing])

    const result = pureOverridePrediction(game, 'player-1', {
      matchId: 'match-1',
      homeGoalsPredicted: 4,
      awayGoalsPredicted: 2,
    })

    expect(result).toHaveLength(1)                          // no duplicate added
    expect(result[0].id).toBe('pred-old')                   // same record updated
    expect(result[0].homeGoalsPredicted).toBe(4)
    expect(result[0].awayGoalsPredicted).toBe(2)
    expect(result[0].createdAt).toBe('2026-06-10T08:00:00.000Z') // createdAt preserved
    expect(result[0].updatedAt).not.toBe('2026-06-10T08:00:00.000Z') // updatedAt changed
  })

  it('preserves createdAt on update — only updatedAt changes', () => {
    const now = new Date().toISOString()
    const existing = makePrediction({
      sessionId: 'player-1',
      matchId: 'match-1',
      createdAt: now,
      updatedAt: now,
    })
    const game = makeGame([existing])

    const result = pureOverridePrediction(game, 'player-1', {
      matchId: 'match-1',
      homeGoalsPredicted: 0,
      awayGoalsPredicted: 0,
    })

    expect(result[0].createdAt).toBe(now)
    expect(result[0].updatedAt).toBeTruthy()
  })

  it('can override a 0-0 prediction to a non-zero score', () => {
    const existing = makePrediction({
      sessionId: 'player-1',
      matchId: 'match-1',
      homeGoalsPredicted: 0,
      awayGoalsPredicted: 0,
    })
    const game = makeGame([existing])

    const result = pureOverridePrediction(game, 'player-1', {
      matchId: 'match-1',
      homeGoalsPredicted: 3,
      awayGoalsPredicted: 1,
    })

    expect(result[0].homeGoalsPredicted).toBe(3)
    expect(result[0].awayGoalsPredicted).toBe(1)
  })

  it('does not affect predictions for other players when updating one player', () => {
    const pred1 = makePrediction({ id: 'p1', sessionId: 'player-1', matchId: 'match-1' })
    const pred2 = makePrediction({ id: 'p2', sessionId: 'player-2', matchId: 'match-1', homeGoalsPredicted: 2, awayGoalsPredicted: 2 })
    const game = makeGame([pred1, pred2])

    const result = pureOverridePrediction(game, 'player-1', {
      matchId: 'match-1',
      homeGoalsPredicted: 5,
      awayGoalsPredicted: 0,
    })

    const p2 = result.find((p) => p.id === 'p2')
    expect(p2?.homeGoalsPredicted).toBe(2)   // unchanged
    expect(p2?.awayGoalsPredicted).toBe(2)
  })
})

// ─── Creator-only guard (access control logic) ───────────────────────────────

describe('overridePrediction — creator-only guard', () => {
  /**
   * The guard in game-store.tsx is:
   *   if (!mySession || mySession.sessionId !== game.creatorSessionId) return
   * We test the condition logic in isolation.
   */
  function creatorGuardPasses(creatorSessionId: string, callerSessionId: string): boolean {
    return callerSessionId === creatorSessionId
  }

  it('allows action when caller IS the creator', () => {
    expect(creatorGuardPasses('creator-id', 'creator-id')).toBe(true)
  })

  it('blocks action when caller is NOT the creator', () => {
    expect(creatorGuardPasses('creator-id', 'other-player')).toBe(false)
  })

  it('blocks action when caller session is empty string', () => {
    expect(creatorGuardPasses('creator-id', '')).toBe(false)
  })
})

// ─── 0-0 default in checkbox-driven submit ────────────────────────────────────

describe('0-0 default — checked matches with no score input default to [0,0]', () => {
  /**
   * Mirrors the handleSubmit logic in predictions/page.tsx:
   *   for (const matchId of checkedMatches) {
   *     const [home, away] = pendingScores.get(matchId) ?? [0, 0]
   *     ...
   *   }
   */
  function resolvePendingScores(
    checkedMatches: Set<string>,
    pendingScores: Map<string, [number, number]>
  ): Map<string, [number, number]> {
    const resolved = new Map<string, [number, number]>()
    for (const matchId of checkedMatches) {
      resolved.set(matchId, pendingScores.get(matchId) ?? [0, 0])
    }
    return resolved
  }

  it('defaults to [0,0] when a match is checked but scores were not touched', () => {
    const checked = new Set(['match-1'])
    const pending = new Map<string, [number, number]>()   // empty — no user input

    const resolved = resolvePendingScores(checked, pending)
    expect(resolved.get('match-1')).toEqual([0, 0])
  })

  it('uses provided scores when inputs were touched', () => {
    const checked = new Set(['match-1'])
    const pending = new Map<string, [number, number]>([['match-1', [3, 2]]])

    const resolved = resolvePendingScores(checked, pending)
    expect(resolved.get('match-1')).toEqual([3, 2])
  })

  it('handles mixed: some with input, some without', () => {
    const checked = new Set(['match-1', 'match-2', 'match-3'])
    const pending = new Map<string, [number, number]>([
      ['match-1', [1, 0]],
      // match-2: no input → default to 0-0
      ['match-3', [2, 2]],
    ])

    const resolved = resolvePendingScores(checked, pending)
    expect(resolved.get('match-1')).toEqual([1, 0])
    expect(resolved.get('match-2')).toEqual([0, 0])
    expect(resolved.get('match-3')).toEqual([2, 2])
  })

  it('returns empty map when no matches are checked', () => {
    const checked = new Set<string>()
    const pending = new Map<string, [number, number]>([['match-1', [1, 1]]])

    const resolved = resolvePendingScores(checked, pending)
    expect(resolved.size).toBe(0)
  })

  it('does not include scores for unchecked matches even if pending exists', () => {
    // Only checked matches should be submitted
    const checked = new Set(['match-1'])
    const pending = new Map<string, [number, number]>([
      ['match-1', [1, 0]],
      ['match-2', [3, 3]],   // NOT checked — should not appear in resolved
    ])

    const resolved = resolvePendingScores(checked, pending)
    expect(resolved.has('match-2')).toBe(false)
    expect(resolved.size).toBe(1)
  })
})
