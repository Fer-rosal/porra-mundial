'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'
import { generateUUID, generateInviteCode } from './id-utils'
import { MATCH_DATA } from './match-data'

// ─── Domain types ────────────────────────────────────────────────────────────

export type PhaseKey = 'LEAGUE' | 'R16' | 'R8' | 'R4' | 'R2' | 'FINAL'

export interface LocalPlayer {
  sessionId: string
  name: string
  joinedAt: string
}

export interface LocalPhase {
  phaseKey: PhaseKey
  isOpen: boolean
  isLocked: boolean
  openedAt: string | null
  lockedAt: string | null
}

export interface LocalMatch {
  id: string
  phaseKey: PhaseKey
  matchNumber: number
  homeTeam: string
  awayTeam: string
  scheduledAt: string
  homeGoals: number | null
  awayGoals: number | null
  resultEntered: boolean
  teamsConfirmed: boolean  // false for knockout rounds until admin confirms via Manage Matches
}

export interface LocalPrediction {
  id: string
  sessionId: string
  matchId: string
  homeGoalsPredicted: number
  awayGoalsPredicted: number
  createdAt: string
  updatedAt: string
}

export interface LocalScorerSelection {
  id: string
  phaseKey: PhaseKey
  sessionId: string
  playerName: string
  isLocked: boolean
  createdAt: string
  updatedAt: string
}

export interface LocalGame {
  id: string
  name: string
  inviteCode: string
  creatorSessionId: string
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED'
  createdAt: string
  updatedAt: string
  players: LocalPlayer[]
  phases: LocalPhase[]
  matches: LocalMatch[]
  predictions: LocalPrediction[]
  scorerSelections: LocalScorerSelection[]
}

export interface LocalStore {
  version: 1
  games: Record<string, LocalGame>
}

// Computed — never stored
export interface LeaderboardEntry {
  sessionId: string
  playerName: string
  phaseScores: Record<PhaseKey, number>
  totalScore: number
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const STORAGE_KEY = 'porra_mundial_store'

function isLocalStorageAvailable(): boolean {
  try {
    const test = '__ls_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

function readStore(): LocalStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { version: 1, games: {} }
    const parsed = JSON.parse(raw) as LocalStore
    return parsed
  } catch {
    return { version: 1, games: {} }
  }
}

function writeStore(store: LocalStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      throw new Error('Not enough browser storage. Please delete some old games and try again.')
    }
    throw e
  }
}

// ─── Phase definitions ────────────────────────────────────────────────────────

const ALL_PHASES: PhaseKey[] = ['LEAGUE', 'R16', 'R8', 'R4', 'R2', 'FINAL']

function createInitialPhases(now: string): LocalPhase[] {
  return ALL_PHASES.map((phaseKey) => ({
    phaseKey,
    isOpen: phaseKey === 'LEAGUE',
    isLocked: false,
    openedAt: phaseKey === 'LEAGUE' ? now : null,
    lockedAt: null,
  }))
}

function createMatchesFromData(): LocalMatch[] {
  return MATCH_DATA.map((m) => ({
    id: `match-${m.phase_key}-${m.match_number}`,
    phaseKey: m.phase_key as PhaseKey,
    matchNumber: m.match_number,
    homeTeam: m.home_team,
    awayTeam: m.away_team,
    scheduledAt: m.scheduled_at,
    homeGoals: null,
    awayGoals: null,
    resultEntered: false,
    teamsConfirmed: m.phase_key === 'LEAGUE',
  }))
}

// ─── Context value type ───────────────────────────────────────────────────────

interface GameStoreContextValue {
  games: Record<string, LocalGame>
  storageAvailable: boolean
  createGame: (name: string) => LocalGame
  joinGame: (inviteCode: string, playerName: string) => { game: LocalGame; sessionId: string } | { error: string }
  getGame: (gameId: string) => LocalGame | null
  getMySession: (gameId: string) => LocalPlayer | null
  savePrediction: (
    gameId: string,
    prediction: { matchId: string; homeGoalsPredicted: number; awayGoalsPredicted: number }
  ) => void
  saveScorerSelection: (gameId: string, phaseKey: PhaseKey, playerName: string) => void
  openPhase: (gameId: string, phaseKey: PhaseKey) => void
  lockPhase: (gameId: string, phaseKey: PhaseKey) => void
  saveResults: (
    gameId: string,
    phaseKey: PhaseKey,
    results: Array<{ matchId: string; homeGoals: number; awayGoals: number }>
  ) => void
  deleteGame: (gameId: string) => void
  exportGame: (gameId: string) => string
  importGame: (encoded: string) => { game: LocalGame; sessionId: string | null } | { error: string }
  updateMatchTeams: (gameId: string, matchId: string, homeTeam: string, awayTeam: string) => void
  savePhaseMatches: (gameId: string, updates: Array<{ matchId: string; homeTeam: string; awayTeam: string }>) => void
}

const GameStoreContext = createContext<GameStoreContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function GameStoreProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState<Record<string, LocalGame>>({})
  const [storageAvailable, setStorageAvailable] = useState(true)

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const available = isLocalStorageAvailable()
    setStorageAvailable(available)
    if (available) {
      const store = readStore()
      setGames(store.games)
    }
  }, [])

  // Helper: persist a games map update
  function persist(updatedGames: Record<string, LocalGame>) {
    setGames(updatedGames)
    if (storageAvailable) {
      writeStore({ version: 1, games: updatedGames })
    }
  }

  // ── Actions ──

  function createGame(name: string): LocalGame {
    const sessionId = generateUUID()

    // Generate unique invite code (retry up to 10 times)
    let inviteCode = generateInviteCode()
    for (let i = 0; i < 10; i++) {
      const collision = Object.values(games).some((g) => g.inviteCode === inviteCode)
      if (!collision) break
      inviteCode = generateInviteCode()
    }

    const now = new Date().toISOString()
    const game: LocalGame = {
      id: generateUUID(),
      name,
      inviteCode,
      creatorSessionId: sessionId,
      status: 'OPEN',
      createdAt: now,
      updatedAt: now,
      players: [
        {
          sessionId,
          name: 'Creator',
          joinedAt: now,
        },
      ],
      phases: createInitialPhases(now),
      matches: createMatchesFromData(),
      predictions: [],
      scorerSelections: [],
    }

    const updatedGames = { ...games, [game.id]: game }
    persist(updatedGames)
    return game
  }

  function joinGame(
    inviteCode: string,
    playerName: string
  ): { game: LocalGame; sessionId: string } | { error: string } {
    const game = Object.values(games).find(
      (g) => g.inviteCode === inviteCode.toUpperCase()
    )

    if (!game) {
      return { error: 'Game not found. Check the code and try again.' }
    }

    if (game.status !== 'OPEN') {
      return { error: 'This game is no longer accepting new players.' }
    }

    // Check if player with same name already exists — re-use their session
    const existing = game.players.find(
      (p) => p.name.toLowerCase() === playerName.trim().toLowerCase()
    )
    if (existing) {
      return { game, sessionId: existing.sessionId }
    }

    const now = new Date().toISOString()
    const sessionId = generateUUID()
    const newPlayer: LocalPlayer = {
      sessionId,
      name: playerName.trim(),
      joinedAt: now,
    }

    const updatedGame: LocalGame = {
      ...game,
      players: [...game.players, newPlayer],
      updatedAt: now,
    }

    const updatedGames = { ...games, [game.id]: updatedGame }
    persist(updatedGames)
    return { game: updatedGame, sessionId }
  }

  function getGame(gameId: string): LocalGame | null {
    return games[gameId] ?? null
  }

  function getMySession(gameId: string): LocalPlayer | null {
    // The "current player" is identified by looking up which player was stored
    // for this game in the current browser session.
    // We store a per-game sessionId reference in a separate localStorage key.
    if (typeof window === 'undefined') return null
    const key = `porra_mundial_session_${gameId}`
    const sessionId = localStorage.getItem(key)
    if (!sessionId) return null
    const game = games[gameId]
    if (!game) return null
    return game.players.find((p) => p.sessionId === sessionId) ?? null
  }

  function savePrediction(
    gameId: string,
    prediction: { matchId: string; homeGoalsPredicted: number; awayGoalsPredicted: number }
  ): void {
    const game = games[gameId]
    if (!game) return

    const mySession = getMySession(gameId)
    if (!mySession) return

    const now = new Date().toISOString()
    const existing = game.predictions.find(
      (p) => p.matchId === prediction.matchId && p.sessionId === mySession.sessionId
    )

    let updatedPredictions: LocalPrediction[]
    if (existing) {
      updatedPredictions = game.predictions.map((p) =>
        p.id === existing.id
          ? { ...p, homeGoalsPredicted: prediction.homeGoalsPredicted, awayGoalsPredicted: prediction.awayGoalsPredicted, updatedAt: now }
          : p
      )
    } else {
      const newPrediction: LocalPrediction = {
        id: generateUUID(),
        sessionId: mySession.sessionId,
        matchId: prediction.matchId,
        homeGoalsPredicted: prediction.homeGoalsPredicted,
        awayGoalsPredicted: prediction.awayGoalsPredicted,
        createdAt: now,
        updatedAt: now,
      }
      updatedPredictions = [...game.predictions, newPrediction]
    }

    const updatedGames = {
      ...games,
      [gameId]: { ...game, predictions: updatedPredictions, updatedAt: now },
    }
    persist(updatedGames)
  }

  function saveScorerSelection(gameId: string, phaseKey: PhaseKey, playerName: string): void {
    const game = games[gameId]
    if (!game) return

    const mySession = getMySession(gameId)
    if (!mySession) return

    const now = new Date().toISOString()
    const existing = game.scorerSelections.find(
      (s) => s.phaseKey === phaseKey && s.sessionId === mySession.sessionId
    )

    let updatedSelections: LocalScorerSelection[]
    if (existing) {
      updatedSelections = game.scorerSelections.map((s) =>
        s.id === existing.id
          ? { ...s, playerName, updatedAt: now }
          : s
      )
    } else {
      const newSelection: LocalScorerSelection = {
        id: generateUUID(),
        phaseKey,
        sessionId: mySession.sessionId,
        playerName,
        isLocked: false,
        createdAt: now,
        updatedAt: now,
      }
      updatedSelections = [...game.scorerSelections, newSelection]
    }

    const updatedGames = {
      ...games,
      [gameId]: { ...game, scorerSelections: updatedSelections, updatedAt: now },
    }
    persist(updatedGames)
  }

  function openPhase(gameId: string, phaseKey: PhaseKey): void {
    const game = games[gameId]
    if (!game) return

    const now = new Date().toISOString()
    const updatedPhases = game.phases.map((p) =>
      p.phaseKey === phaseKey ? { ...p, isOpen: true, openedAt: now } : p
    )

    const updatedGames = {
      ...games,
      [gameId]: { ...game, phases: updatedPhases, updatedAt: now },
    }
    persist(updatedGames)
  }

  function lockPhase(gameId: string, phaseKey: PhaseKey): void {
    const game = games[gameId]
    if (!game) return

    const now = new Date().toISOString()
    const updatedPhases = game.phases.map((p) =>
      p.phaseKey === phaseKey ? { ...p, isLocked: true, lockedAt: now } : p
    )

    const updatedGames = {
      ...games,
      [gameId]: { ...game, phases: updatedPhases, updatedAt: now },
    }
    persist(updatedGames)
  }

  function saveResults(
    gameId: string,
    _phaseKey: PhaseKey,
    results: Array<{ matchId: string; homeGoals: number; awayGoals: number }>
  ): void {
    const game = games[gameId]
    if (!game) return

    const now = new Date().toISOString()
    const updatedMatches = game.matches.map((m) => {
      const result = results.find((r) => r.matchId === m.id)
      if (!result) return m
      return {
        ...m,
        homeGoals: result.homeGoals,
        awayGoals: result.awayGoals,
        resultEntered: true,
      }
    })

    const updatedGames = {
      ...games,
      [gameId]: { ...game, matches: updatedMatches, updatedAt: now },
    }
    persist(updatedGames)
  }

  function deleteGame(gameId: string): void {
    const { [gameId]: _removed, ...remaining } = games
    persist(remaining)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`porra_mundial_session_${gameId}`)
    }
  }

  function exportGame(gameId: string): string {
    const game = games[gameId]
    if (!game) throw new Error('Game not found')
    const sessionId =
      typeof window !== 'undefined'
        ? localStorage.getItem(`porra_mundial_session_${gameId}`)
        : null
    const data = { v: 1, game, sessionId, at: new Date().toISOString() }
    return btoa(encodeURIComponent(JSON.stringify(data)))
  }

  function importGame(
    encoded: string
  ): { game: LocalGame; sessionId: string | null } | { error: string } {
    try {
      const data = JSON.parse(decodeURIComponent(atob(encoded))) as {
        v: number
        game: LocalGame
        sessionId: string | null
        at: string
      }
      if (!data.game?.id) return { error: 'Invalid game data' }
      const updatedGames = { ...games, [data.game.id]: data.game }
      persist(updatedGames)
      if (data.sessionId && typeof window !== 'undefined') {
        localStorage.setItem(`porra_mundial_session_${data.game.id}`, data.sessionId)
      }
      return { game: data.game, sessionId: data.sessionId ?? null }
    } catch {
      return { error: 'Invalid export code. Please check and try again.' }
    }
  }

  function updateMatchTeams(
    gameId: string,
    matchId: string,
    homeTeam: string,
    awayTeam: string
  ): void {
    const game = games[gameId]
    if (!game) return
    const now = new Date().toISOString()
    const updatedMatches = game.matches.map((m) =>
      m.id === matchId
        ? { ...m, homeTeam: homeTeam.trim(), awayTeam: awayTeam.trim(), teamsConfirmed: true }
        : m
    )
    persist({ ...games, [gameId]: { ...game, matches: updatedMatches, updatedAt: now } })
  }

  function savePhaseMatches(
    gameId: string,
    updates: Array<{ matchId: string; homeTeam: string; awayTeam: string }>
  ): void {
    const game = games[gameId]
    if (!game) return
    const now = new Date().toISOString()
    const updateMap = new Map(updates.map((u) => [u.matchId, u]))
    const updatedMatches = game.matches.map((m) => {
      const u = updateMap.get(m.id)
      if (!u) return m
      return { ...m, homeTeam: u.homeTeam.trim(), awayTeam: u.awayTeam.trim(), teamsConfirmed: true }
    })
    persist({ ...games, [gameId]: { ...game, matches: updatedMatches, updatedAt: now } })
  }

  return (
    <GameStoreContext.Provider
      value={{
        games,
        storageAvailable,
        createGame,
        joinGame,
        getGame,
        getMySession,
        savePrediction,
        saveScorerSelection,
        openPhase,
        lockPhase,
        saveResults,
        deleteGame,
        exportGame,
        importGame,
        updateMatchTeams,
        savePhaseMatches,
      }}
    >
      {!storageAvailable && (
        <div
          className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 px-4 py-2 text-center text-sm font-semibold text-yellow-900"
          data-testid="storage-disabled-banner"
        >
          Your browser&apos;s storage is disabled. Games cannot be saved. Try a non-private window.
        </div>
      )}
      {children}
    </GameStoreContext.Provider>
  )
}

// ─── Public hook ──────────────────────────────────────────────────────────────

export function useGameStore(): GameStoreContextValue {
  const ctx = useContext(GameStoreContext)
  if (!ctx) {
    throw new Error('useGameStore must be used within a GameStoreProvider')
  }
  return ctx
}

/**
 * Persists the current player's sessionId for a given game.
 * Call this after createGame or joinGame to associate the browser with the session.
 */
export function persistSessionId(gameId: string, sessionId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`porra_mundial_session_${gameId}`, sessionId)
  }
}
