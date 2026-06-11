/**
 * Unit tests for the creator-admin-access feature.
 *
 * Tests the logic introduced by:
 *   - getIsCreator() — reads creator key from localStorage, includes migration path
 *   - persistCreatorSessionId() — write-once creator key utility
 *   - createGame() — writes creator key after persist
 *   - importGame() — restores creator key when session matches creator
 *   - deleteGame() — removes creator key on game deletion
 *
 * We test the pure logic via helper functions that mirror the implementation.
 * localStorage is mocked so tests never touch the real browser storage.
 */

import type { LocalGame, LocalPlayer } from '../game-store'

// ─── localStorage mock ────────────────────────────────────────────────────────

type LocalStorageStore = Record<string, string>

function makeLocalStorageMock(initial: LocalStorageStore = {}) {
  const store: LocalStorageStore = { ...initial }
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
    _store: store,
  }
}

// ─── Pure helpers mirroring game-store internals ──────────────────────────────

/**
 * Mirror of getIsCreator() from game-store.tsx.
 * Returns true only when the creator key in localStorage matches game.creatorSessionId.
 * Includes migration backfill: if no creator key, checks session key.
 */
function pureGetIsCreator(
  gameId: string,
  game: LocalGame | null,
  ls: ReturnType<typeof makeLocalStorageMock>
): boolean {
  if (!game) return false

  const creatorKey = `porra_mundial_creator_${gameId}`
  const sessionKey = `porra_mundial_session_${gameId}`
  const storedCreatorId = ls.getItem(creatorKey)

  if (storedCreatorId) {
    return storedCreatorId === game.creatorSessionId
  }

  // Migration: no creator key yet — check session key
  const currentSessionId = ls.getItem(sessionKey)
  if (currentSessionId && currentSessionId === game.creatorSessionId) {
    ls.setItem(creatorKey, game.creatorSessionId)
    return true
  }

  return false
}

/**
 * Mirror of createGame() creator key write.
 */
function pureCreateGameWritesCreatorKey(
  gameId: string,
  creatorSessionId: string,
  ls: ReturnType<typeof makeLocalStorageMock>
): void {
  ls.setItem(`porra_mundial_creator_${gameId}`, creatorSessionId)
}

/**
 * Mirror of importGame() creator key restoration logic.
 */
function pureImportGameRestoresCreatorKey(
  gameId: string,
  sessionId: string,
  creatorSessionId: string,
  ls: ReturnType<typeof makeLocalStorageMock>
): void {
  ls.setItem(`porra_mundial_session_${gameId}`, sessionId)
  if (sessionId === creatorSessionId) {
    ls.setItem(`porra_mundial_creator_${gameId}`, sessionId)
  }
}

/**
 * Mirror of deleteGame() cleanup.
 */
function pureDeleteGameRemovesCreatorKey(
  gameId: string,
  ls: ReturnType<typeof makeLocalStorageMock>
): void {
  ls.removeItem(`porra_mundial_session_${gameId}`)
  ls.removeItem(`porra_mundial_creator_${gameId}`)
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeGame(overrides: Partial<LocalGame> = {}): LocalGame {
  return {
    id: 'game-1',
    name: 'Test Game',
    inviteCode: 'ABC1234',
    creatorSessionId: 'creator-session',
    adminToken: 'admin-token-fixture',
    status: 'OPEN',
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

// ─── getIsCreator — happy path ─────────────────────────────────────────────────

describe('getIsCreator — creator key present', () => {
  it('returns true when creator key matches game.creatorSessionId', () => {
    const ls = makeLocalStorageMock({
      'porra_mundial_creator_game-1': 'creator-session',
    })
    const game = makeGame()
    expect(pureGetIsCreator('game-1', game, ls)).toBe(true)
  })

  it('returns false when creator key does NOT match game.creatorSessionId', () => {
    const ls = makeLocalStorageMock({
      'porra_mundial_creator_game-1': 'wrong-session',
    })
    const game = makeGame()
    expect(pureGetIsCreator('game-1', game, ls)).toBe(false)
  })

  it('returns false when no creator key and session key belongs to a non-creator player', () => {
    const ls = makeLocalStorageMock({
      'porra_mundial_session_game-1': 'player-session',
    })
    const game = makeGame({ creatorSessionId: 'creator-session' })
    expect(pureGetIsCreator('game-1', game, ls)).toBe(false)
  })

  it('returns false when game is null', () => {
    const ls = makeLocalStorageMock({
      'porra_mundial_creator_game-1': 'creator-session',
    })
    expect(pureGetIsCreator('game-1', null, ls)).toBe(false)
  })

  it('returns false when no localStorage keys at all', () => {
    const ls = makeLocalStorageMock({})
    const game = makeGame()
    expect(pureGetIsCreator('game-1', game, ls)).toBe(false)
  })
})

// ─── getIsCreator — migration/backfill path ───────────────────────────────────

describe('getIsCreator — migration backfill (no creator key, session key is creator)', () => {
  it('returns true and writes creator key when session key matches creatorSessionId', () => {
    const ls = makeLocalStorageMock({
      'porra_mundial_session_game-1': 'creator-session',
      // no porra_mundial_creator_game-1 — simulates old game pre-fix
    })
    const game = makeGame({ creatorSessionId: 'creator-session' })

    const result = pureGetIsCreator('game-1', game, ls)

    expect(result).toBe(true)
    // Migration must backfill the creator key
    expect(ls.getItem('porra_mundial_creator_game-1')).toBe('creator-session')
  })

  it('does NOT backfill creator key when session belongs to a regular player', () => {
    const ls = makeLocalStorageMock({
      'porra_mundial_session_game-1': 'player-session',
    })
    const game = makeGame({ creatorSessionId: 'creator-session' })

    pureGetIsCreator('game-1', game, ls)

    expect(ls.getItem('porra_mundial_creator_game-1')).toBeNull()
  })

  it('creator key written by migration is stable on subsequent calls', () => {
    const ls = makeLocalStorageMock({
      'porra_mundial_session_game-1': 'creator-session',
    })
    const game = makeGame({ creatorSessionId: 'creator-session' })

    // First call — triggers migration
    pureGetIsCreator('game-1', game, ls)
    // Second call — reads from newly written creator key
    const result = pureGetIsCreator('game-1', game, ls)

    expect(result).toBe(true)
  })
})

// ─── createGame — writes creator key ─────────────────────────────────────────

describe('createGame — creator key written on game creation', () => {
  it('writes porra_mundial_creator_<gameId> with the creator sessionId', () => {
    const ls = makeLocalStorageMock()
    pureCreateGameWritesCreatorKey('game-1', 'creator-session', ls)
    expect(ls.getItem('porra_mundial_creator_game-1')).toBe('creator-session')
  })

  it('getIsCreator returns true immediately after createGame writes the key', () => {
    const ls = makeLocalStorageMock()
    pureCreateGameWritesCreatorKey('game-1', 'creator-session', ls)
    const game = makeGame({ creatorSessionId: 'creator-session' })
    expect(pureGetIsCreator('game-1', game, ls)).toBe(true)
  })
})

// ─── importGame — creator key restored when session matches creator ──────────

describe('importGame — creator key restored on import', () => {
  it('writes creator key when imported sessionId matches creatorSessionId', () => {
    const ls = makeLocalStorageMock()
    pureImportGameRestoresCreatorKey('game-1', 'creator-session', 'creator-session', ls)
    expect(ls.getItem('porra_mundial_creator_game-1')).toBe('creator-session')
  })

  it('does NOT write creator key when imported sessionId is a regular player', () => {
    const ls = makeLocalStorageMock()
    pureImportGameRestoresCreatorKey('game-1', 'player-session', 'creator-session', ls)
    expect(ls.getItem('porra_mundial_creator_game-1')).toBeNull()
  })

  it('getIsCreator returns true after creator imports their own game', () => {
    const ls = makeLocalStorageMock()
    pureImportGameRestoresCreatorKey('game-1', 'creator-session', 'creator-session', ls)
    const game = makeGame({ creatorSessionId: 'creator-session' })
    expect(pureGetIsCreator('game-1', game, ls)).toBe(true)
  })

  it('getIsCreator returns false for a non-creator who imports a shared game', () => {
    const ls = makeLocalStorageMock()
    pureImportGameRestoresCreatorKey('game-1', 'player-session', 'creator-session', ls)
    const game = makeGame({ creatorSessionId: 'creator-session' })
    expect(pureGetIsCreator('game-1', game, ls)).toBe(false)
  })
})

// ─── deleteGame — removes creator key ────────────────────────────────────────

describe('deleteGame — creator key removed on deletion', () => {
  it('removes porra_mundial_creator_<gameId> from localStorage', () => {
    const ls = makeLocalStorageMock({
      'porra_mundial_creator_game-1': 'creator-session',
      'porra_mundial_session_game-1': 'creator-session',
    })
    pureDeleteGameRemovesCreatorKey('game-1', ls)
    expect(ls.getItem('porra_mundial_creator_game-1')).toBeNull()
  })

  it('removes both session and creator keys on deletion', () => {
    const ls = makeLocalStorageMock({
      'porra_mundial_creator_game-1': 'creator-session',
      'porra_mundial_session_game-1': 'creator-session',
    })
    pureDeleteGameRemovesCreatorKey('game-1', ls)
    expect(ls.getItem('porra_mundial_session_game-1')).toBeNull()
    expect(ls.getItem('porra_mundial_creator_game-1')).toBeNull()
  })

  it('getIsCreator returns false after deleteGame removes the creator key', () => {
    const ls = makeLocalStorageMock({
      'porra_mundial_creator_game-1': 'creator-session',
    })
    pureDeleteGameRemovesCreatorKey('game-1', ls)
    const game = makeGame({ creatorSessionId: 'creator-session' })
    // No key exists — session key also absent → false
    expect(pureGetIsCreator('game-1', game, ls)).toBe(false)
  })
})

// ─── persistCreatorSessionId — exported utility ───────────────────────────────

describe('persistCreatorSessionId — reclaim admin utility', () => {
  /**
   * Mirror of the exported persistCreatorSessionId utility.
   * Reclaim flow: any browser that has game.creatorSessionId accessible (via
   * game data in localStorage) can call this to reclaim admin.
   */
  function pureReclaimAdmin(
    gameId: string,
    creatorSessionId: string,
    ls: ReturnType<typeof makeLocalStorageMock>
  ): void {
    ls.setItem(`porra_mundial_creator_${gameId}`, creatorSessionId)
  }

  it('writes creator key when reclaimAdmin is called', () => {
    const ls = makeLocalStorageMock()
    pureReclaimAdmin('game-1', 'creator-session', ls)
    expect(ls.getItem('porra_mundial_creator_game-1')).toBe('creator-session')
  })

  it('getIsCreator returns true immediately after reclaim', () => {
    const ls = makeLocalStorageMock()
    pureReclaimAdmin('game-1', 'creator-session', ls)
    const game = makeGame({ creatorSessionId: 'creator-session' })
    expect(pureGetIsCreator('game-1', game, ls)).toBe(true)
  })

  it('overrides a stale creator key with the correct one on reclaim', () => {
    const ls = makeLocalStorageMock({
      // Stale or invalid key from a bug scenario
      'porra_mundial_creator_game-1': 'stale-session',
    })
    pureReclaimAdmin('game-1', 'creator-session', ls)
    const game = makeGame({ creatorSessionId: 'creator-session' })
    expect(pureGetIsCreator('game-1', game, ls)).toBe(true)
  })
})

// ─── Creator joining as player — the core bug scenario ───────────────────────

describe('core bug scenario: creator joins own game as player', () => {
  /**
   * Bug: creator joins their own game as a named player.
   * joinGame() calls persistSessionId() which overwrites porra_mundial_session_<gameId>
   * with the creator's new "player" sessionId — a NEW UUID different from creatorSessionId.
   *
   * With the fix:
   *   - createGame() writes porra_mundial_creator_<gameId> = creatorSessionId
   *   - joinGame() writes porra_mundial_session_<gameId> = newPlayerSessionId (different key)
   *   - getIsCreator() reads the separate creator key — still returns true
   */
  it('creator retains admin access after joining as a player with a different sessionId', () => {
    const ls = makeLocalStorageMock()

    // 1. createGame writes the creator key
    pureCreateGameWritesCreatorKey('game-1', 'creator-session', ls)

    // 2. Creator joins own game as player — joinGame writes a NEW sessionId to session key
    const playerSessionId = 'player-joined-session'
    ls.setItem('porra_mundial_session_game-1', playerSessionId)

    // 3. The game still has creatorSessionId = 'creator-session'
    const game = makeGame({ creatorSessionId: 'creator-session' })

    // 4. getIsCreator reads creator key (not session key) — should still be true
    expect(pureGetIsCreator('game-1', game, ls)).toBe(true)
  })

  it('a regular player who joins does NOT gain creator access', () => {
    const ls = makeLocalStorageMock()

    // 1. createGame writes creator key for the original creator browser
    pureCreateGameWritesCreatorKey('game-1', 'creator-session', ls)

    // 2. Simulate a different browser (no creator key, session = player)
    const otherBrowserLs = makeLocalStorageMock({
      'porra_mundial_session_game-1': 'regular-player-session',
    })

    const game = makeGame({ creatorSessionId: 'creator-session' })

    // Other browser: no creator key, session != creatorSessionId → false
    expect(pureGetIsCreator('game-1', game, otherBrowserLs)).toBe(false)
  })

  it('old creator browser (pre-fix, no creator key) still gets access via migration', () => {
    // Pre-fix: creator browser only has the session key with creatorSessionId
    const ls = makeLocalStorageMock({
      'porra_mundial_session_game-1': 'creator-session',
      // porra_mundial_creator_game-1 does NOT exist (old game)
    })

    const game = makeGame({ creatorSessionId: 'creator-session' })

    // Migration path: session key === creatorSessionId → backfill and return true
    expect(pureGetIsCreator('game-1', game, ls)).toBe(true)
    // Creator key was written (backfilled)
    expect(ls.getItem('porra_mundial_creator_game-1')).toBe('creator-session')
  })
})
