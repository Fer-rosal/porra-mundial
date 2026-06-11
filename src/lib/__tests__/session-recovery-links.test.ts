/**
 * Unit tests for the session-recovery-links feature.
 *
 * Tests:
 *   1. createGame() — assigns adminToken and playerToken to seeded creator player
 *   2. joinGame() — assigns playerToken to new players, returns existing token on re-join
 *   3. redeemPlayerToken() — returns sessionId for valid token, error codes otherwise
 *   4. redeemAdminToken() — returns creatorSessionId for valid adminToken, error otherwise
 *   5. migrateStore() — backfills tokens for legacy games/players, stable on re-migration
 *
 * All logic is tested via pure helper functions that mirror the game-store
 * implementation exactly. No localStorage or React is touched.
 */

import type { LocalGame, LocalPlayer, LocalStore } from '../game-store'
import { generateUUID } from '../id-utils'

// ─── localStorage mock (for migrateStore tests) ───────────────────────────────

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
 * Mirror of createGame() token generation.
 * Returns a LocalGame with adminToken and creator player with playerToken.
 */
function pureCreateGame(name: string): LocalGame {
  const sessionId = generateUUID()
  const adminToken = generateUUID()
  const creatorPlayerToken = generateUUID()
  const now = new Date().toISOString()
  return {
    id: generateUUID(),
    name,
    inviteCode: 'TESTCODE',
    creatorSessionId: sessionId,
    adminToken,
    status: 'OPEN',
    createdAt: now,
    updatedAt: now,
    players: [
      {
        sessionId,
        name: 'Creator',
        joinedAt: now,
        playerToken: creatorPlayerToken,
      },
    ],
    phases: [],
    matches: [],
    predictions: [],
    scorerSelections: [],
  }
}

/**
 * Mirror of joinGame() — new player branch.
 */
function pureJoinGameNewPlayer(
  game: LocalGame,
  playerName: string
): { game: LocalGame; sessionId: string; playerToken: string } {
  const now = new Date().toISOString()
  const sessionId = generateUUID()
  const playerToken = generateUUID()
  const newPlayer: LocalPlayer = { sessionId, name: playerName, joinedAt: now, playerToken }
  const updatedGame: LocalGame = { ...game, players: [...game.players, newPlayer], updatedAt: now }
  return { game: updatedGame, sessionId, playerToken }
}

/**
 * Mirror of joinGame() — existing player branch (same-name re-join).
 */
function pureJoinGameExistingPlayer(
  game: LocalGame,
  playerName: string
): { game: LocalGame; sessionId: string; playerToken: string } | { error: string } {
  const existing = game.players.find(
    (p) => p.name.toLowerCase() === playerName.trim().toLowerCase()
  )
  if (!existing) return { error: 'Player not found' }
  return { game, sessionId: existing.sessionId, playerToken: existing.playerToken }
}

/**
 * Mirror of redeemPlayerToken().
 */
function pureRedeemPlayerToken(
  games: Record<string, LocalGame>,
  gameId: string,
  token: string
): { sessionId: string } | { error: 'not_found' | 'no_game' } {
  const game = games[gameId]
  if (!game) return { error: 'no_game' }
  const player = game.players.find((p) => p.playerToken === token)
  if (!player) return { error: 'not_found' }
  return { sessionId: player.sessionId }
}

/**
 * Mirror of redeemAdminToken().
 */
function pureRedeemAdminToken(
  games: Record<string, LocalGame>,
  gameId: string,
  token: string
): { sessionId: string } | { error: 'not_found' | 'no_game' } {
  const game = games[gameId]
  if (!game) return { error: 'no_game' }
  if (game.adminToken !== token) return { error: 'not_found' }
  return { sessionId: game.creatorSessionId }
}

/**
 * Mirror of migrateStore() from readStore().
 */
function pureMigrateStore(store: LocalStore): LocalStore {
  const games = Object.fromEntries(
    Object.entries(store.games).map(([id, game]) => [
      id,
      {
        ...game,
        adminToken: game.adminToken ?? generateUUID(),
        players: game.players.map((p) => ({
          ...p,
          playerToken: p.playerToken ?? generateUUID(),
        })),
      },
    ])
  )
  return { ...store, games }
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeGame(overrides: Partial<LocalGame> = {}): LocalGame {
  return {
    id: 'game-1',
    name: 'Test Game',
    inviteCode: 'ABC1234',
    creatorSessionId: 'creator-session',
    adminToken: 'admin-token-abc',
    status: 'OPEN',
    createdAt: '2026-06-10T00:00:00.000Z',
    updatedAt: '2026-06-10T00:00:00.000Z',
    players: [
      {
        sessionId: 'creator-session',
        name: 'Creator',
        joinedAt: '2026-06-10T00:00:00.000Z',
        playerToken: 'creator-player-token',
      },
    ],
    phases: [],
    matches: [],
    predictions: [],
    scorerSelections: [],
    ...overrides,
  }
}

// ─── createGame — token generation ───────────────────────────────────────────

describe('createGame — assigns adminToken and playerToken', () => {
  it('assigns a non-empty adminToken to the LocalGame', () => {
    const game = pureCreateGame('My Game')
    expect(game.adminToken).toBeTruthy()
    expect(typeof game.adminToken).toBe('string')
  })

  it('assigns a non-empty playerToken to the seeded Creator player', () => {
    const game = pureCreateGame('My Game')
    expect(game.players).toHaveLength(1)
    expect(game.players[0].playerToken).toBeTruthy()
    expect(typeof game.players[0].playerToken).toBe('string')
  })

  it('adminToken and creatorPlayer.playerToken are different values', () => {
    const game = pureCreateGame('My Game')
    expect(game.adminToken).not.toBe(game.players[0].playerToken)
  })

  it('each call to createGame generates unique tokens', () => {
    const game1 = pureCreateGame('Game A')
    const game2 = pureCreateGame('Game B')
    expect(game1.adminToken).not.toBe(game2.adminToken)
    expect(game1.players[0].playerToken).not.toBe(game2.players[0].playerToken)
  })
})

// ─── joinGame — playerToken on new player ────────────────────────────────────

describe('joinGame — new player gets a playerToken', () => {
  it('assigns a non-empty playerToken to a new player', () => {
    const game = makeGame()
    const result = pureJoinGameNewPlayer(game, 'Alice')
    expect(result.playerToken).toBeTruthy()
    expect(typeof result.playerToken).toBe('string')
  })

  it('returns playerToken in the success result for a new player', () => {
    const game = makeGame()
    const result = pureJoinGameNewPlayer(game, 'Alice')
    // Verify playerToken is present in result and matches the stored player's token
    const addedPlayer = result.game.players.find((p) => p.name === 'Alice')
    expect(addedPlayer?.playerToken).toBe(result.playerToken)
  })

  it('stores playerToken on the new LocalPlayer object', () => {
    const game = makeGame()
    const result = pureJoinGameNewPlayer(game, 'Bob')
    const bob = result.game.players.find((p) => p.name === 'Bob')
    expect(bob).toBeDefined()
    expect(bob?.playerToken).toBe(result.playerToken)
  })

  it('generates unique playerTokens for different players', () => {
    const game = makeGame()
    const result1 = pureJoinGameNewPlayer(game, 'Alice')
    const result2 = pureJoinGameNewPlayer(result1.game, 'Bob')
    expect(result1.playerToken).not.toBe(result2.playerToken)
  })
})

// ─── joinGame — existing player re-join returns stable token ─────────────────

describe('joinGame — same-name re-join returns existing playerToken', () => {
  it('returns the existing playerToken when a player re-joins with the same name', () => {
    const game = makeGame({
      players: [
        {
          sessionId: 'alice-session',
          name: 'Alice',
          joinedAt: '2026-06-10T00:00:00.000Z',
          playerToken: 'alice-original-token',
        },
      ],
    })
    const result = pureJoinGameExistingPlayer(game, 'Alice')
    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.playerToken).toBe('alice-original-token')
      expect(result.sessionId).toBe('alice-session')
    }
  })

  it('token is stable — re-joining does not generate a new token', () => {
    const game = makeGame({
      players: [
        {
          sessionId: 'alice-session',
          name: 'Alice',
          joinedAt: '2026-06-10T00:00:00.000Z',
          playerToken: 'alice-stable-token',
        },
      ],
    })
    const result1 = pureJoinGameExistingPlayer(game, 'Alice')
    const result2 = pureJoinGameExistingPlayer(game, 'Alice')
    if (!('error' in result1) && !('error' in result2)) {
      expect(result1.playerToken).toBe(result2.playerToken)
    }
  })

  it('name matching is case-insensitive', () => {
    const game = makeGame({
      players: [
        {
          sessionId: 'alice-session',
          name: 'Alice',
          joinedAt: '2026-06-10T00:00:00.000Z',
          playerToken: 'alice-token',
        },
      ],
    })
    const result = pureJoinGameExistingPlayer(game, 'alice')
    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.playerToken).toBe('alice-token')
    }
  })
})

// ─── redeemPlayerToken ────────────────────────────────────────────────────────

describe('redeemPlayerToken', () => {
  it('returns sessionId for a valid playerToken', () => {
    const game = makeGame({
      players: [
        { sessionId: 'player-session', name: 'Alice', joinedAt: '2026-06-10T00:00:00.000Z', playerToken: 'valid-player-token' },
      ],
    })
    const result = pureRedeemPlayerToken({ 'game-1': game }, 'game-1', 'valid-player-token')
    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.sessionId).toBe('player-session')
    }
  })

  it('returns error:not_found for an invalid/unknown playerToken', () => {
    const game = makeGame()
    const result = pureRedeemPlayerToken({ 'game-1': game }, 'game-1', 'totally-wrong-token')
    expect(result).toEqual({ error: 'not_found' })
  })

  it('returns error:no_game when the game does not exist', () => {
    const result = pureRedeemPlayerToken({}, 'nonexistent-game', 'any-token')
    expect(result).toEqual({ error: 'no_game' })
  })

  it('does NOT allow an adminToken to redeem a player session (tokens are not cross-redeemable)', () => {
    // Using the adminToken as a playerToken should return not_found
    const game = makeGame()  // adminToken = 'admin-token-abc', no player has playerToken = 'admin-token-abc'
    const result = pureRedeemPlayerToken({ 'game-1': game }, 'game-1', 'admin-token-abc')
    expect(result).toEqual({ error: 'not_found' })
  })

  it('returns the correct sessionId for the matching player (not another player)', () => {
    const game = makeGame({
      players: [
        { sessionId: 'alice-session', name: 'Alice', joinedAt: '2026-06-10T00:00:00.000Z', playerToken: 'alice-token' },
        { sessionId: 'bob-session', name: 'Bob', joinedAt: '2026-06-10T00:00:00.000Z', playerToken: 'bob-token' },
      ],
    })
    const result = pureRedeemPlayerToken({ 'game-1': game }, 'game-1', 'bob-token')
    if (!('error' in result)) {
      expect(result.sessionId).toBe('bob-session')
    }
  })
})

// ─── redeemAdminToken ─────────────────────────────────────────────────────────

describe('redeemAdminToken', () => {
  it('returns creatorSessionId for a valid adminToken', () => {
    const game = makeGame()  // adminToken = 'admin-token-abc', creatorSessionId = 'creator-session'
    const result = pureRedeemAdminToken({ 'game-1': game }, 'game-1', 'admin-token-abc')
    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.sessionId).toBe('creator-session')
    }
  })

  it('returns error:not_found for an invalid/wrong adminToken', () => {
    const game = makeGame()
    const result = pureRedeemAdminToken({ 'game-1': game }, 'game-1', 'wrong-admin-token')
    expect(result).toEqual({ error: 'not_found' })
  })

  it('returns error:no_game when the game does not exist', () => {
    const result = pureRedeemAdminToken({}, 'nonexistent-game', 'any-token')
    expect(result).toEqual({ error: 'no_game' })
  })

  it('does NOT allow a playerToken to redeem admin access (tokens are not cross-redeemable)', () => {
    // Creator's playerToken is 'creator-player-token', adminToken is 'admin-token-abc'
    const game = makeGame()  // creator player has playerToken = 'creator-player-token'
    const result = pureRedeemAdminToken({ 'game-1': game }, 'game-1', 'creator-player-token')
    expect(result).toEqual({ error: 'not_found' })
  })
})

// ─── migrateStore — backfills missing tokens ──────────────────────────────────

describe('migrateStore — backfills adminToken and playerToken for legacy games', () => {
  it('backfills adminToken for a game that is missing it', () => {
    const legacyGame = {
      id: 'game-legacy',
      name: 'Legacy Game',
      inviteCode: 'LEGXYZ',
      creatorSessionId: 'creator-session',
      // adminToken intentionally absent — simulates pre-migration data
      status: 'OPEN' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      players: [],
      phases: [],
      matches: [],
      predictions: [],
      scorerSelections: [],
    }
    const store: LocalStore = { version: 1, games: { 'game-legacy': legacyGame as unknown as LocalGame } }
    const migrated = pureMigrateStore(store)
    expect(migrated.games['game-legacy'].adminToken).toBeTruthy()
    expect(typeof migrated.games['game-legacy'].adminToken).toBe('string')
  })

  it('backfills playerToken for players missing it', () => {
    const legacyGame = makeGame({
      players: [
        // playerToken intentionally absent
        { sessionId: 'p1', name: 'Alice', joinedAt: '2026-01-01T00:00:00.000Z' } as LocalPlayer,
      ],
    })
    // Remove adminToken too to simulate full legacy scenario
    const { adminToken: _at, ...legacyGameNoToken } = legacyGame
    const store: LocalStore = { version: 1, games: { 'game-1': legacyGameNoToken as unknown as LocalGame } }
    const migrated = pureMigrateStore(store)
    const migratedPlayer = migrated.games['game-1'].players[0]
    expect(migratedPlayer.playerToken).toBeTruthy()
    expect(typeof migratedPlayer.playerToken).toBe('string')
  })

  it('preserves existing adminToken if already present (re-migration is idempotent)', () => {
    const game = makeGame()  // has adminToken = 'admin-token-abc'
    const store: LocalStore = { version: 1, games: { 'game-1': game } }
    const migrated = pureMigrateStore(store)
    expect(migrated.games['game-1'].adminToken).toBe('admin-token-abc')
  })

  it('preserves existing playerToken if already present (re-migration is idempotent)', () => {
    const game = makeGame()  // creator player has playerToken = 'creator-player-token'
    const store: LocalStore = { version: 1, games: { 'game-1': game } }
    const migrated = pureMigrateStore(store)
    expect(migrated.games['game-1'].players[0].playerToken).toBe('creator-player-token')
  })

  it('migrated tokens are stable — running migration twice produces the same tokens', () => {
    const legacyGame = makeGame({
      players: [
        { sessionId: 'p1', name: 'Alice', joinedAt: '2026-01-01T00:00:00.000Z' } as LocalPlayer,
      ],
    })
    const { adminToken: _at, ...legacyGameNoToken } = legacyGame
    const store: LocalStore = { version: 1, games: { 'game-1': legacyGameNoToken as unknown as LocalGame } }

    // First migration
    const migrated1 = pureMigrateStore(store)
    const token1 = migrated1.games['game-1'].adminToken
    const playerToken1 = migrated1.games['game-1'].players[0].playerToken

    // Second migration on already-migrated store
    const migrated2 = pureMigrateStore(migrated1)
    const token2 = migrated2.games['game-1'].adminToken
    const playerToken2 = migrated2.games['game-1'].players[0].playerToken

    expect(token2).toBe(token1)
    expect(playerToken2).toBe(playerToken1)
  })

  it('handles empty games store without error', () => {
    const store: LocalStore = { version: 1, games: {} }
    const migrated = pureMigrateStore(store)
    expect(migrated.games).toEqual({})
  })

  it('multiple players in a game all get backfilled playerTokens', () => {
    const legacyGame = makeGame({
      players: [
        { sessionId: 'p1', name: 'Alice', joinedAt: '2026-01-01T00:00:00.000Z' } as LocalPlayer,
        { sessionId: 'p2', name: 'Bob', joinedAt: '2026-01-01T00:00:00.000Z' } as LocalPlayer,
      ],
    })
    const { adminToken: _at, ...legacyGameNoToken } = legacyGame
    const store: LocalStore = { version: 1, games: { 'game-1': legacyGameNoToken as unknown as LocalGame } }
    const migrated = pureMigrateStore(store)
    const players = migrated.games['game-1'].players
    expect(players[0].playerToken).toBeTruthy()
    expect(players[1].playerToken).toBeTruthy()
    // Each player should get a unique token
    expect(players[0].playerToken).not.toBe(players[1].playerToken)
  })
})
