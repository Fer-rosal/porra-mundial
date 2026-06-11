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
import { supabase, supabaseWithSession } from './supabase'
import type {
  DbGame,
  DbGamePlayer,
  DbTournamentPhase,
  DbMatch,
  DbPrediction,
  DbScorerSelection,
  DbWinnerPick,
  DbGameActionLog,
} from './types'

type SupabaseLikeError = {
  message?: string
  code?: string
  details?: string | null
  hint?: string | null
}

// ─── Domain types ────────────────────────────────────────────────────────────

export type PhaseKey = 'LEAGUE' | 'R16' | 'R8' | 'R4' | 'R2' | 'FINAL'

export interface LocalPlayer {
  sessionId: string
  name: string
  joinedAt: string
  playerToken: string   // UUID v4, generated at join time, never changes
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
  predictionsLocked: boolean
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
  goalsScored: number
  isLocked: boolean
  createdAt: string
  updatedAt: string
}

export interface LocalWinnerPick {
  id: string
  sessionId: string
  teamName: string
  awardedPoints: number
  isLocked: boolean
  createdAt: string
  updatedAt: string
}

export interface LocalGame {
  id: string
  name: string
  inviteCode: string
  creatorSessionId: string
  adminToken: string    // UUID v4, generated at creation time, never changes
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED'
  createdAt: string
  updatedAt: string
  players: LocalPlayer[]
  phases: LocalPhase[]
  matches: LocalMatch[]
  predictions: LocalPrediction[]
  scorerSelections: LocalScorerSelection[]
  winnerPicks?: LocalWinnerPick[]
}

// LocalStore is kept for legacy banner detection only (the old localStorage shape)
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

// ─── Input types ──────────────────────────────────────────────────────────────

interface PredictionInput {
  matchId: string
  homeGoalsPredicted: number
  awayGoalsPredicted: number
}

interface ResultInput {
  matchId: string
  homeGoals: number
  awayGoals: number
}

interface MatchTeamUpdate {
  matchId: string
  homeTeam: string
  awayTeam: string
}

type ActionLogDetails = Record<string, unknown>

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LEGACY_STORAGE_KEY = 'porra_mundial_store'

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

function formatSupabaseError(context: string, err: SupabaseLikeError | null | undefined): string {
  if (!err) return context

  const message = err.message ?? ''
  const details = err.details ?? ''
  const hint = err.hint ?? ''

  // Typical shape when PostgREST cannot find a relation/table in the project.
  if (
    err.code === '42P01'
    || message.includes('does not exist')
    || message.includes('Not Found')
  ) {
    return 'Supabase schema is missing in this project. Run the SQL migrations in supabase/migrations and try again.'
  }

  return [context, message, details, hint].filter(Boolean).join(' ')
}

/**
 * Reads the per-game session ID from localStorage.
 * This is the "current player" identity for this browser.
 */
function getSessionId(gameId: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(`porra_mundial_session_${gameId}`)
}

function getCreatorSessionId(gameId: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(`porra_mundial_creator_${gameId}`)
}

/**
 * Persists the current player's sessionId for a given game.
 */
export function persistSessionId(gameId: string, sessionId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`porra_mundial_session_${gameId}`, sessionId)
  }
}

/**
 * Persists the creator's sessionId in a dedicated key that is never overwritten
 * by the join flow. This allows the creator to join their own game as a named
 * player without losing admin access.
 */
export function persistCreatorSessionId(gameId: string, sessionId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`porra_mundial_creator_${gameId}`, sessionId)
  }
}

// ─── DB → LocalGame mapper ────────────────────────────────────────────────────

function dbToLocalGame(
  g: DbGame,
  phases: DbTournamentPhase[],
  matches: DbMatch[],
  players: DbGamePlayer[],
  preds: DbPrediction[],
  scorers: DbScorerSelection[],
  winnerPicks: DbWinnerPick[]
): LocalGame {
  // Build a map from game_player.id → player for prediction/scorer lookup
  const playerById = new Map(players.map(p => [p.id, p]))

  return {
    id:               g.id,
    name:             g.name,
    inviteCode:       g.invite_code,
    creatorSessionId: g.creator_session_id,
    adminToken:       g.admin_token,
    status:           g.status,
    createdAt:        g.created_at,
    updatedAt:        g.updated_at ?? g.created_at,
    players: players.map(p => ({
      sessionId:   p.session_id,
      name:        p.player_name,
      joinedAt:    p.joined_at,
      playerToken: p.player_token,
    })),
    phases: phases.map(ph => ({
      phaseKey:  ph.phase_key as PhaseKey,
      isOpen:    ph.is_open,
      isLocked:  ph.is_locked,
      openedAt:  ph.opened_at ?? null,
      lockedAt:  ph.locked_at ?? null,
    })),
    matches: matches.map(m => ({
      id:             m.id,
      phaseKey:       m.phase_key as PhaseKey,
      matchNumber:    m.match_number,
      homeTeam:       m.home_team,
      awayTeam:       m.away_team,
      scheduledAt:    m.scheduled_at,
      predictionsLocked: m.predictions_locked,
      homeGoals:      m.home_goals ?? null,
      awayGoals:      m.away_goals ?? null,
      resultEntered:  m.result_entered,
      teamsConfirmed: m.teams_confirmed,
    })),
    predictions: preds.map(pr => {
      const pl = playerById.get(pr.game_player_id)
      return {
        id:                  pr.id,
        sessionId:           pl?.session_id ?? '',
        matchId:             pr.match_id,
        homeGoalsPredicted:  pr.home_goals_predicted,
        awayGoalsPredicted:  pr.away_goals_predicted,
        createdAt:           pr.created_at,
        updatedAt:           pr.updated_at,
      }
    }),
    scorerSelections: scorers.map(s => {
      const pl = playerById.get(s.game_player_id)
      return {
        id:          s.id,
        phaseKey:    s.phase_key as PhaseKey,
        sessionId:   pl?.session_id ?? '',
        playerName:  s.player_name,
        goalsScored: s.goals_scored,
        isLocked:    s.is_locked,
        createdAt:   s.created_at,
        updatedAt:   s.updated_at,
      }
    }),
    winnerPicks: winnerPicks.map(w => {
      const pl = playerById.get(w.game_player_id)
      return {
        id:           w.id,
        sessionId:    pl?.session_id ?? '',
        teamName:     w.team_name,
        awardedPoints: w.awarded_points,
        isLocked:     w.is_locked,
        createdAt:    w.created_at,
        updatedAt:    w.updated_at,
      }
    }),
  }
}

// ─── Phase definitions ────────────────────────────────────────────────────────

const ALL_PHASES: PhaseKey[] = ['LEAGUE', 'R16', 'R8', 'R4', 'R2', 'FINAL']

// ─── Context value type ───────────────────────────────────────────────────────

interface GameStoreContextValue {
  // Loading / error state
  isLoading: boolean
  error: string | null
  hasLegacyData: boolean       // true if old porra_mundial_store key exists with games
  dismissLegacyBanner: () => void

  // In-memory cache
  games: Record<string, LocalGame>
  storageAvailable: boolean

  // Sync reads (from cache / localStorage)
  getGame: (gameId: string) => LocalGame | null
  getMySession: (gameId: string) => LocalPlayer | null
  getIsCreator: (gameId: string) => boolean

  // Async — DB backed
  fetchGame: (gameId: string) => Promise<LocalGame | null>
  createGame: (name: string, creatorName?: string) => Promise<LocalGame>
  joinGame: (inviteCode: string, playerName: string) => Promise<
    { game: LocalGame; sessionId: string; playerToken: string } | { error: string }
  >
  redeemPlayerToken: (gameId: string, token: string) => Promise<
    { sessionId: string; playerName: string } | { error: 'not_found' | 'no_game' }
  >
  redeemAdminToken: (gameId: string, token: string) => Promise<
    { sessionId: string } | { error: 'not_found' | 'no_game' }
  >
  savePrediction:      (gameId: string, p: PredictionInput) => Promise<void>
  savePredictions:     (gameId: string, ps: PredictionInput[]) => Promise<void>
  overridePrediction:  (gameId: string, targetSessionId: string, p: PredictionInput) => Promise<void>
  overridePredictions: (gameId: string, targetSessionId: string, ps: PredictionInput[]) => Promise<void>
  saveScorerSelection: (gameId: string, phaseKey: PhaseKey, playerName: string) => Promise<void>
  saveWinnerPick:      (gameId: string, teamName: string) => Promise<void>
  openPhase:           (gameId: string, phaseKey: PhaseKey) => Promise<void>
  lockPhase:           (gameId: string, phaseKey: PhaseKey) => Promise<void>
  lockGame:            (gameId: string) => Promise<void>
  blockMatches:        (gameId: string, matchIds: string[]) => Promise<void>
  downloadActionLogs:  (gameId: string) => Promise<{ count: number }>
  saveResults:         (gameId: string, phaseKey: PhaseKey, results: ResultInput[]) => Promise<void>
  deleteGame:          (gameId: string) => Promise<void>
  exportGame:          (gameId: string) => string      // still sync — encodes in-memory cache
  importGame:          (encoded: string) => Promise<{ game: LocalGame; sessionId: string | null } | { error: string }>
  updateMatchTeams:    (gameId: string, matchId: string, homeTeam: string, awayTeam: string) => Promise<void>
  savePhaseMatches:    (gameId: string, updates: MatchTeamUpdate[]) => Promise<void>
}

const GameStoreContext = createContext<GameStoreContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function GameStoreProvider({ children }: { children: ReactNode }) {
  const [games, setGames]                     = useState<Record<string, LocalGame>>({})
  const [storageAvailable, setStorageAvailable] = useState(true)
  const [isLoading, setIsLoading]             = useState(false)
  const [error, setError]                     = useState<string | null>(null)
  const [hasLegacyData, setHasLegacyData]     = useState(false)

  // On mount: check localStorage availability and legacy data flag
  useEffect(() => {
    if (typeof window === 'undefined') return
    const available = isLocalStorageAvailable()
    setStorageAvailable(available)
    if (available) {
      const dismissed = localStorage.getItem('porra_mundial_legacy_dismissed')
      if (!dismissed) {
        try {
          const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
          if (raw) {
            const parsed = JSON.parse(raw) as LocalStore
            if (Object.keys(parsed?.games ?? {}).length > 0) {
              setHasLegacyData(true)
            }
          }
        } catch {
          // ignore parse errors
        }
      }
    }
  }, [])

  // Refetch open games when tab becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        Object.keys(games).forEach(gameId => {
          fetchGame(gameId).catch(() => {/* ignore — error already set in state */})
        })
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.keys(games).join(',')])

  // ── Cache helper ──

  function setCachedGame(game: LocalGame) {
    setGames(prev => ({ ...prev, [game.id]: game }))
  }

  // ── Legacy banner ──

  function dismissLegacyBanner() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('porra_mundial_legacy_dismissed', '1')
    }
    setHasLegacyData(false)
  }

  async function logGameAction(
    gameId: string,
    actorSessionId: string,
    actionType: string,
    actionDetails: ActionLogDetails = {}
  ): Promise<void> {
    const client = supabaseWithSession(actorSessionId)
    await client.from('game_action_logs').insert({
      id: generateUUID(),
      game_id: gameId,
      actor_session_id: actorSessionId,
      action_type: actionType,
      action_details: actionDetails,
      created_at: new Date().toISOString(),
    })
  }

  async function safeLogGameAction(
    gameId: string,
    actorSessionId: string,
    actionType: string,
    actionDetails: ActionLogDetails = {}
  ): Promise<void> {
    try {
      await logGameAction(gameId, actorSessionId, actionType, actionDetails)
    } catch {
      // Do not break gameplay if logging fails.
    }
  }

  // ─── fetchGame ──────────────────────────────────────────────────────────────

  async function fetchGame(gameId: string): Promise<LocalGame | null> {
    setIsLoading(true)
    setError(null)
    try {
      // 1. game row
      const { data: gameRow, error: gErr } = await supabase
        .from('games').select('*').eq('id', gameId).single()
      if (gErr) {
        setError(formatSupabaseError('Failed to load game.', gErr))
        return null
      }
      if (!gameRow) return null

      // 2. phases
      const { data: phases } = await supabase
        .from('tournament_phases').select('*').eq('game_id', gameId)

      // 3. matches (via tournament_phase_id IN ...)
      const phaseIds = (phases ?? []).map((p: DbTournamentPhase) => p.id)
      const { data: matchRows } = await supabase
        .from('matches').select('*').in('tournament_phase_id', phaseIds)

      // 4. players
      const { data: players } = await supabase
        .from('game_players').select('*').eq('game_id', gameId)

      // 5. predictions
      const playerIds = (players ?? []).map((p: DbGamePlayer) => p.id)
      const { data: preds } = await supabase
        .from('predictions').select('*').in('game_player_id', playerIds)

      // 6. scorer selections
      const { data: scorers } = await supabase
        .from('scorer_selections').select('*').in('game_player_id', playerIds)

      // 7. winner picks
      const { data: winnerPicks } = await supabase
        .from('winner_picks').select('*').in('game_player_id', playerIds)

      const localGame = dbToLocalGame(
        gameRow as DbGame,
        (phases ?? []) as DbTournamentPhase[],
        (matchRows ?? []) as DbMatch[],
        (players ?? []) as DbGamePlayer[],
        (preds ?? []) as DbPrediction[],
        (scorers ?? []) as DbScorerSelection[],
        (winnerPicks ?? []) as DbWinnerPick[]
      )
      setCachedGame(localGame)
      return localGame
    } catch {
      setError('Could not connect to game server. Check your connection and refresh.')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // ─── createGame ─────────────────────────────────────────────────────────────

  async function createGame(name: string, creatorName: string = 'Creator'): Promise<LocalGame> {
    const gameId             = generateUUID()
    const creatorSessionId   = generateUUID()
    const adminToken         = generateUUID()
    const creatorPlayerToken = generateUUID()
    const now                = new Date().toISOString()
    const seededCreatorName  = creatorName.trim() || 'Creator'

    // Unique invite code (retry up to 10x)
    let inviteCode = generateInviteCode()
    for (let i = 0; i < 10; i++) {
      const { data, error: codeCheckErr } = await supabase
        .from('games').select('id').eq('invite_code', inviteCode).single()
      if (codeCheckErr && codeCheckErr.code !== 'PGRST116') {
        throw new Error(formatSupabaseError('Failed to validate invite code.', codeCheckErr))
      }
      if (!data) break
      inviteCode = generateInviteCode()
    }

    // INSERT game
    const { error: gameInsertErr } = await supabase.from('games').insert({
      id: gameId,
      creator_session_id: creatorSessionId,
      admin_token: adminToken,
      name,
      invite_code: inviteCode,
      status: 'OPEN',
      tournament_phase: 'LEAGUE',
      created_at: now,
      updated_at: now,
    })
    if (gameInsertErr) {
      throw new Error(formatSupabaseError('Failed to create game.', gameInsertErr))
    }

    // INSERT 6 phases
    const phaseRows = ALL_PHASES.map(pk => ({
      id:         generateUUID(),
      game_id:    gameId,
      phase_key:  pk,
      is_open:    pk === 'LEAGUE',
      is_locked:  false,
      opened_at:  pk === 'LEAGUE' ? now : null,
      created_at: now,
    }))
    const { data: insertedPhases, error: phaseInsertErr } = await supabase
      .from('tournament_phases').insert(phaseRows).select()
    if (phaseInsertErr) {
      throw new Error(formatSupabaseError('Failed to create tournament phases.', phaseInsertErr))
    }

    // Build phaseKey → phase_id map
    const phaseIdMap = new Map<PhaseKey, string>(
      ((insertedPhases ?? []) as DbTournamentPhase[]).map(p => [p.phase_key as PhaseKey, p.id])
    )

    // Bulk INSERT 104 matches
    const matchRows = MATCH_DATA.map(m => ({
      id:                   generateUUID(),
      tournament_phase_id:  phaseIdMap.get(m.phase_key as PhaseKey)!,
      phase_key:            m.phase_key,
      match_number:         m.match_number,
      home_team:            m.home_team,
      away_team:            m.away_team,
      scheduled_at:         m.scheduled_at,
      predictions_locked:   false,
      result_entered:       false,
      teams_confirmed:      m.phase_key === 'LEAGUE',
      created_at:           now,
    }))
    const { error: matchInsertErr } = await supabase.from('matches').insert(matchRows)
    if (matchInsertErr) {
      throw new Error(formatSupabaseError('Failed to seed matches.', matchInsertErr))
    }

    // INSERT creator as player
    const { error: playerInsertErr } = await supabase.from('game_players').insert({
      id:           generateUUID(),
      game_id:      gameId,
      session_id:   creatorSessionId,
      player_name:  seededCreatorName,
      player_token: creatorPlayerToken,
      total_score:  0,
      joined_at:    now,
    })
    if (playerInsertErr) {
      throw new Error(formatSupabaseError('Failed to add creator player.', playerInsertErr))
    }

    await safeLogGameAction(gameId, creatorSessionId, 'game_created', {
      gameName: name,
      creatorName: seededCreatorName,
      inviteCode,
    })

    // Persist identity keys to localStorage
    persistSessionId(gameId, creatorSessionId)
    persistCreatorSessionId(gameId, creatorSessionId)
    if (typeof window !== 'undefined') {
      localStorage.setItem(`porra_mundial_admin_token_${gameId}`, adminToken)
    }

    // Fetch and return assembled game
    const game = await fetchGame(gameId)
    if (!game) {
      throw new Error('Game was created but could not be loaded. Refresh and try again.')
    }
    return game
  }

  // ─── joinGame ───────────────────────────────────────────────────────────────

  async function joinGame(
    inviteCode: string,
    playerName: string
  ): Promise<{ game: LocalGame; sessionId: string; playerToken: string } | { error: string }> {
    // 1. Lookup game
    const { data: gameRow, error: gameLookupErr } = await supabase
      .from('games').select('*').eq('invite_code', inviteCode.toUpperCase()).single()
    if (gameLookupErr && gameLookupErr.code !== 'PGRST116') {
      return { error: formatSupabaseError('Failed to look up game.', gameLookupErr) }
    }
    if (!gameRow) return { error: 'No game found with that code. Check and try again.' }
    if ((gameRow as DbGame).status !== 'OPEN') {
      return { error: 'This game is no longer accepting new players.' }
    }

    const gameId = (gameRow as DbGame).id

    // 2. Check for existing player with same name (case-insensitive)
    const { data: existing, error: existingErr } = await supabase
      .from('game_players')
      .select('session_id, player_token')
      .eq('game_id', gameId)
      .ilike('player_name', playerName.trim())
      .single()
    if (existingErr && existingErr.code !== 'PGRST116') {
      return { error: formatSupabaseError('Failed to check existing player.', existingErr) }
    }

    if (existing) {
      persistSessionId(gameId, (existing as DbGamePlayer).session_id)
      await safeLogGameAction(gameId, (existing as DbGamePlayer).session_id, 'player_rejoined', {
        playerName: playerName.trim(),
      })
      const game = await fetchGame(gameId)
      if (!game) return { error: 'Joined game but failed to load it. Please refresh and try again.' }
      return {
        game,
        sessionId: (existing as DbGamePlayer).session_id,
        playerToken: (existing as DbGamePlayer).player_token,
      }
    }

    // 3. New player
    const sessionId   = generateUUID()
    const playerToken = generateUUID()
    const { error: joinInsertErr } = await supabase.from('game_players').insert({
      id:           generateUUID(),
      game_id:      gameId,
      session_id:   sessionId,
      player_name:  playerName.trim(),
      player_token: playerToken,
      total_score:  0,
      joined_at:    new Date().toISOString(),
    })
    if (joinInsertErr) {
      return { error: formatSupabaseError('Failed to join game.', joinInsertErr) }
    }

    await safeLogGameAction(gameId, sessionId, 'player_joined', {
      playerName: playerName.trim(),
    })

    persistSessionId(gameId, sessionId)
    if (typeof window !== 'undefined') {
      localStorage.setItem(`porra_mundial_player_token_${gameId}`, playerToken)
    }
    const game = await fetchGame(gameId)
    if (!game) return { error: 'Joined game but failed to load it. Please refresh and try again.' }
    return { game, sessionId, playerToken }
  }

  // ─── getGame — sync from cache ───────────────────────────────────────────────

  function getGame(gameId: string): LocalGame | null {
    return games[gameId] ?? null
  }

  // ─── getMySession — sync from cache + localStorage ──────────────────────────

  function getMySession(gameId: string): LocalPlayer | null {
    if (typeof window === 'undefined') return null
    const sessionId = getSessionId(gameId)
    if (!sessionId) return null
    const game = games[gameId]
    if (!game) return null
    return game.players.find((p) => p.sessionId === sessionId) ?? null
  }

  // ─── getIsCreator — sync, checks dedicated creator key ──────────────────────

  function getIsCreator(gameId: string): boolean {
    if (typeof window === 'undefined') return false
    const game = games[gameId]
    if (!game) return false

    const creatorKey = `porra_mundial_creator_${gameId}`
    const sessionKey = `porra_mundial_session_${gameId}`
    const storedCreatorId = localStorage.getItem(creatorKey)

    if (storedCreatorId) {
      return storedCreatorId === game.creatorSessionId
    }

    // Migration: no creator key yet — check if current session key IS the creator session
    const currentSessionId = localStorage.getItem(sessionKey)
    if (currentSessionId && currentSessionId === game.creatorSessionId) {
      localStorage.setItem(creatorKey, game.creatorSessionId)
      return true
    }

    return false
  }

  // ─── redeemPlayerToken ───────────────────────────────────────────────────────

  async function redeemPlayerToken(
    gameId: string,
    token: string
  ): Promise<{ sessionId: string; playerName: string } | { error: 'not_found' | 'no_game' }> {
    // Check cache first
    const cachedGame = games[gameId]
    if (cachedGame) {
      const player = cachedGame.players.find(p => p.playerToken === token)
      if (!player) return { error: 'not_found' }
      return { sessionId: player.sessionId, playerName: player.name }
    }

    // Fallback: fetch from DB
    const { data: gameRow } = await supabase
      .from('games').select('id').eq('id', gameId).single()
    if (!gameRow) return { error: 'no_game' }

    const { data: player } = await supabase
      .from('game_players')
      .select('session_id, player_name')
      .eq('game_id', gameId)
      .eq('player_token', token)
      .single()

    if (!player) return { error: 'not_found' }
    return {
      sessionId:  (player as DbGamePlayer).session_id,
      playerName: (player as DbGamePlayer).player_name,
    }
  }

  // ─── redeemAdminToken ────────────────────────────────────────────────────────

  async function redeemAdminToken(
    gameId: string,
    token: string
  ): Promise<{ sessionId: string } | { error: 'not_found' | 'no_game' }> {
    // Check cache first
    const cachedGame = games[gameId]
    if (cachedGame) {
      if (cachedGame.adminToken !== token) return { error: 'not_found' }
      return { sessionId: cachedGame.creatorSessionId }
    }

    // Fallback: fetch from DB
    const { data: gameRow } = await supabase
      .from('games')
      .select('creator_session_id, admin_token')
      .eq('id', gameId)
      .single()

    if (!gameRow) return { error: 'no_game' }
    if ((gameRow as DbGame).admin_token !== token) return { error: 'not_found' }
    return { sessionId: (gameRow as DbGame).creator_session_id }
  }

  // ─── savePredictions ────────────────────────────────────────────────────────

  async function savePredictions(gameId: string, predictions: PredictionInput[]): Promise<void> {
    const mySessionId = getSessionId(gameId)
    if (!mySessionId) return

    const game = games[gameId]
    if (game) {
      const blockedMatchIds = predictions
        .filter((p) => game.matches.find((m) => m.id === p.matchId)?.predictionsLocked)
        .map((p) => p.matchId)

      if (blockedMatchIds.length > 0) {
        throw new Error('One or more selected matches are blocked by the admin and cannot be edited.')
      }
    }

    const { data: player } = await supabase
      .from('game_players')
      .select('id')
      .eq('game_id', gameId)
      .eq('session_id', mySessionId)
      .single()
    if (!player) return

    const now = new Date().toISOString()
    const rows = predictions.map(p => ({
      id:                    generateUUID(),
      match_id:              p.matchId,
      game_player_id:        (player as DbGamePlayer).id,
      home_goals_predicted:  p.homeGoalsPredicted,
      away_goals_predicted:  p.awayGoalsPredicted,
      created_at:            now,
      updated_at:            now,
    }))

    // Players can edit predictions until admin blocks the match.
    await supabase.from('predictions').upsert(rows, {
      onConflict: 'match_id,game_player_id',
      ignoreDuplicates: false,
    })

    await safeLogGameAction(gameId, mySessionId, 'predictions_saved', {
      count: predictions.length,
      matchIds: predictions.map((p) => p.matchId),
    })

    await fetchGame(gameId)
  }

  // ─── savePrediction (single) ────────────────────────────────────────────────

  async function savePrediction(gameId: string, p: PredictionInput): Promise<void> {
    return savePredictions(gameId, [p])
  }

  // ─── overridePredictions (admin) ────────────────────────────────────────────

  async function overridePredictions(
    gameId: string,
    targetSessionId: string,
    predictions: PredictionInput[]
  ): Promise<void> {
    if (!getIsCreator(gameId)) return
    const creatorSessionId = getCreatorSessionId(gameId)
    if (!creatorSessionId) return

    const { data: player } = await supabase
      .from('game_players')
      .select('id')
      .eq('game_id', gameId)
      .eq('session_id', targetSessionId)
      .single()
    if (!player) return

    const now = new Date().toISOString()
    const rows = predictions.map(p => ({
      id:                    generateUUID(),
      match_id:              p.matchId,
      game_player_id:        (player as DbGamePlayer).id,
      home_goals_predicted:  p.homeGoalsPredicted,
      away_goals_predicted:  p.awayGoalsPredicted,
      created_at:            now,
      updated_at:            now,
    }))

    // ON CONFLICT DO UPDATE — admin CAN overwrite
    await supabase.from('predictions').upsert(rows, {
      onConflict: 'match_id,game_player_id',
      ignoreDuplicates: false,
    })

    await safeLogGameAction(gameId, creatorSessionId, 'predictions_overridden', {
      targetSessionId,
      count: predictions.length,
      matchIds: predictions.map((p) => p.matchId),
    })

    await fetchGame(gameId)
  }

  // ─── overridePrediction (single) ────────────────────────────────────────────

  async function overridePrediction(
    gameId: string,
    targetSessionId: string,
    p: PredictionInput
  ): Promise<void> {
    return overridePredictions(gameId, targetSessionId, [p])
  }

  // ─── saveScorerSelection ────────────────────────────────────────────────────

  async function saveScorerSelection(
    gameId: string,
    phaseKey: PhaseKey,
    playerName: string
  ): Promise<void> {
    const mySessionId = getSessionId(gameId)
    if (!mySessionId) return

    const { data: player } = await supabase
      .from('game_players')
      .select('id')
      .eq('game_id', gameId)
      .eq('session_id', mySessionId)
      .single()
    if (!player) return

    // Look up the phase row to get tournament_phase_id
    const { data: phaseRow } = await supabase
      .from('tournament_phases')
      .select('id')
      .eq('game_id', gameId)
      .eq('phase_key', phaseKey)
      .single()
    if (!phaseRow) return

    const now = new Date().toISOString()
    const row = {
      id:                   generateUUID(),
      tournament_phase_id:  (phaseRow as DbTournamentPhase).id,
      game_player_id:       (player as DbGamePlayer).id,
      phase_key:            phaseKey,
      player_name:          playerName,
      goals_scored:         0,
      is_locked:            false,
      created_at:           now,
      updated_at:           now,
    }

    // Scorer selection is final once submitted — ON CONFLICT DO NOTHING
    await supabase.from('scorer_selections').upsert(row, {
      onConflict: 'tournament_phase_id,game_player_id',
      ignoreDuplicates: true,
    })

    await safeLogGameAction(gameId, mySessionId, 'scorer_selected', {
      phaseKey,
      playerName,
    })

    await fetchGame(gameId)
  }

  async function saveWinnerPick(gameId: string, teamName: string): Promise<void> {
    const mySessionId = getSessionId(gameId)
    if (!mySessionId) return

    const game = games[gameId]
    if (game) {
      const deadlinePassed = game.matches.some((m) => m.predictionsLocked || m.resultEntered)
      if (deadlinePassed) {
        throw new Error('Winner picks are closed after the first match is blocked or has a result.')
      }
      const existingPick = (game.winnerPicks ?? []).find((w) => w.sessionId === mySessionId)
      if (existingPick) {
        throw new Error('You already submitted a winner pick. It cannot be changed.')
      }
    }

    const { data: player } = await supabase
      .from('game_players')
      .select('id')
      .eq('game_id', gameId)
      .eq('session_id', mySessionId)
      .single()
    if (!player) return

    const now = new Date().toISOString()
    const row = {
      id:            generateUUID(),
      game_player_id: (player as DbGamePlayer).id,
      team_name:     teamName.trim(),
      awarded_points: 0,
      is_locked:     false,
      created_at:    now,
      updated_at:    now,
    }

    await supabase.from('winner_picks').upsert(row, {
      onConflict: 'game_player_id',
      ignoreDuplicates: true,
    })

    await safeLogGameAction(gameId, mySessionId, 'winner_pick_submitted', {
      teamName: teamName.trim(),
    })

    await fetchGame(gameId)
  }

  // ─── openPhase ──────────────────────────────────────────────────────────────

  async function openPhase(gameId: string, phaseKey: PhaseKey): Promise<void> {
    const creatorSessionId = getCreatorSessionId(gameId)
    if (!creatorSessionId) return
    const client = supabaseWithSession(creatorSessionId)
    await client.from('tournament_phases')
      .update({ is_open: true, opened_at: new Date().toISOString() })
      .eq('game_id', gameId).eq('phase_key', phaseKey)
    await safeLogGameAction(gameId, creatorSessionId, 'phase_opened', { phaseKey })
    await fetchGame(gameId)
  }

  // ─── lockPhase ──────────────────────────────────────────────────────────────

  async function lockPhase(gameId: string, phaseKey: PhaseKey): Promise<void> {
    const creatorSessionId = getCreatorSessionId(gameId)
    if (!creatorSessionId) return
    const client = supabaseWithSession(creatorSessionId)
    await client.from('tournament_phases')
      .update({ is_locked: true, locked_at: new Date().toISOString() })
      .eq('game_id', gameId).eq('phase_key', phaseKey)
    await safeLogGameAction(gameId, creatorSessionId, 'phase_locked', { phaseKey })
    await fetchGame(gameId)
  }

  // ─── lockGame ───────────────────────────────────────────────────────────────

  async function lockGame(gameId: string): Promise<void> {
    const creatorSessionId = getCreatorSessionId(gameId)
    if (!creatorSessionId) return

    const client = supabaseWithSession(creatorSessionId)
    const now = new Date().toISOString()

    await client.from('games')
      .update({ status: 'COMPLETED', updated_at: now })
      .eq('id', gameId)

    await client.from('tournament_phases')
      .update({ is_locked: true, locked_at: now })
      .eq('game_id', gameId)
      .eq('is_locked', false)

    await safeLogGameAction(gameId, creatorSessionId, 'game_locked', {})

    await fetchGame(gameId)
  }

  async function blockMatches(gameId: string, matchIds: string[]): Promise<void> {
    const creatorSessionId = getCreatorSessionId(gameId)
    if (!creatorSessionId || matchIds.length === 0) return

    const client = supabaseWithSession(creatorSessionId)
    await client.from('matches')
      .update({ predictions_locked: true })
      .in('id', matchIds)

    await safeLogGameAction(gameId, creatorSessionId, 'matches_blocked', {
      count: matchIds.length,
      matchIds,
    })

    await fetchGame(gameId)
  }

  async function downloadActionLogs(gameId: string): Promise<{ count: number }> {
    const creatorSessionId = getCreatorSessionId(gameId)
    if (!creatorSessionId) return { count: 0 }

    const client = supabaseWithSession(creatorSessionId)
    const { data, error: logsErr } = await client
      .from('game_action_logs')
      .select('created_at,actor_session_id,action_type,action_details')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true })

    if (logsErr) {
      throw new Error(formatSupabaseError('Failed to download logs.', logsErr))
    }

    const logs = (data ?? []) as Pick<DbGameActionLog, 'created_at' | 'actor_session_id' | 'action_type' | 'action_details'>[]

    if (typeof window !== 'undefined') {
      const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `game-${gameId}-action-logs.json`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    }

    await safeLogGameAction(gameId, creatorSessionId, 'logs_downloaded', { count: logs.length })

    return { count: logs.length }
  }

  // ─── saveResults ────────────────────────────────────────────────────────────

  async function saveResults(
    gameId: string,
    _phaseKey: PhaseKey,
    results: ResultInput[]
  ): Promise<void> {
    const creatorSessionId = getCreatorSessionId(gameId)
    if (!creatorSessionId) return
    const client = supabaseWithSession(creatorSessionId)

    // Batch updates — Promise.all since supabase-js UPDATE must target one row at a time
    await Promise.all(results.map(r =>
      client.from('matches')
        .update({
          home_goals:      r.homeGoals,
          away_goals:      r.awayGoals,
          result_entered:  true,
        })
        .eq('id', r.matchId)
    ))

    await safeLogGameAction(gameId, creatorSessionId, 'results_saved', {
      count: results.length,
      matchIds: results.map((r) => r.matchId),
    })

    await fetchGame(gameId)
  }

  // ─── deleteGame ─────────────────────────────────────────────────────────────

  async function deleteGame(gameId: string): Promise<void> {
    const creatorSessionId = getCreatorSessionId(gameId) ?? ''
    const client = supabaseWithSession(creatorSessionId)
    if (creatorSessionId) {
      await safeLogGameAction(gameId, creatorSessionId, 'game_deleted', {})
    }
    await client.from('games').delete().eq('id', gameId)
    // Cascades delete tournament_phases → matches, game_players → predictions/scorer_selections

    // Clean localStorage
    if (typeof window !== 'undefined') {
      for (const key of ['session', 'creator', 'player_token', 'admin_token']) {
        localStorage.removeItem(`porra_mundial_${key}_${gameId}`)
      }
    }
    setGames(prev => {
      const { [gameId]: _, ...rest } = prev
      return rest
    })
  }

  // ─── exportGame — still sync, encodes in-memory cache ───────────────────────

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

  // ─── importGame — creates a new game in Supabase (different ID) ──────────────

  async function importGame(
    encoded: string
  ): Promise<{ game: LocalGame; sessionId: string | null } | { error: string }> {
    try {
      const data = JSON.parse(decodeURIComponent(atob(encoded))) as {
        v: number
        game: LocalGame
        sessionId: string | null
        at: string
      }
      if (!data.game?.id) return { error: 'Invalid game data' }

      const sourceGame = data.game

      // Create a new game in Supabase with the same name (new ID)
      const gameId             = generateUUID()
      const creatorSessionId   = sourceGame.creatorSessionId
      const adminToken         = sourceGame.adminToken
      const now                = new Date().toISOString()

      // INSERT game
      const { error: insertErr } = await supabase.from('games').insert({
        id:                 gameId,
        creator_session_id: creatorSessionId,
        admin_token:        adminToken,
        name:               sourceGame.name,
        invite_code:        generateInviteCode(),
        status:             sourceGame.status,
        tournament_phase:   'LEAGUE',
        created_at:         now,
        updated_at:         now,
      })
      if (insertErr) return { error: 'Failed to import game. Please try again.' }

      await safeLogGameAction(gameId, creatorSessionId, 'game_imported', {
        sourceGameId: sourceGame.id,
        sourceExportTimestamp: data.at,
      })

      // INSERT phases
      const phaseRows = sourceGame.phases.map(ph => ({
        id:         generateUUID(),
        game_id:    gameId,
        phase_key:  ph.phaseKey,
        is_open:    ph.isOpen,
        is_locked:  ph.isLocked,
        opened_at:  ph.openedAt ?? null,
        locked_at:  ph.lockedAt ?? null,
        created_at: now,
      }))
      const { data: insertedPhases } = await supabase
        .from('tournament_phases').insert(phaseRows).select()

      const phaseIdMap = new Map<string, string>(
        ((insertedPhases ?? []) as DbTournamentPhase[]).map(p => [p.phase_key, p.id])
      )

      // INSERT matches
      const importedMatchIdMap = new Map<string, string>()

      if (sourceGame.matches.length > 0) {
        const matchRows = sourceGame.matches.map(m => {
          const newMatchId = generateUUID()
          importedMatchIdMap.set(m.id, newMatchId)

          return {
            id:                   newMatchId,
            tournament_phase_id:  phaseIdMap.get(m.phaseKey)!,
            phase_key:            m.phaseKey,
            match_number:         m.matchNumber,
            home_team:            m.homeTeam,
            away_team:            m.awayTeam,
            scheduled_at:         m.scheduledAt,
            predictions_locked:   m.predictionsLocked ?? false,
            result_entered:       m.resultEntered,
            home_goals:           m.homeGoals ?? null,
            away_goals:           m.awayGoals ?? null,
            teams_confirmed:      m.teamsConfirmed,
            created_at:           now,
          }
        })
        await supabase.from('matches').insert(matchRows)
      }

      // INSERT players
      const playerIdMap = new Map<string, string>() // sessionId → game_player.id
      for (const p of sourceGame.players) {
        const playerId = generateUUID()
        playerIdMap.set(p.sessionId, playerId)
        await supabase.from('game_players').insert({
          id:           playerId,
          game_id:      gameId,
          session_id:   p.sessionId,
          player_name:  p.name,
          player_token: p.playerToken,
          total_score:  0,
          joined_at:    p.joinedAt,
        })
      }

      // INSERT predictions
      if (sourceGame.predictions.length > 0) {
        const matchIdRemap = (oldMatchId: string) => importedMatchIdMap.get(oldMatchId) ?? null
        const predRows = sourceGame.predictions
          .map(pr => {
            const newMatchId   = matchIdRemap(pr.matchId)
            const newPlayerId  = playerIdMap.get(pr.sessionId)
            if (!newMatchId || !newPlayerId) return null
            return {
              id:                    generateUUID(),
              match_id:              newMatchId,
              game_player_id:        newPlayerId,
              home_goals_predicted:  pr.homeGoalsPredicted,
              away_goals_predicted:  pr.awayGoalsPredicted,
              created_at:            pr.createdAt,
              updated_at:            pr.updatedAt,
            }
          })
          .filter((r): r is NonNullable<typeof r> => r !== null)
        if (predRows.length > 0) {
          await supabase.from('predictions').insert(predRows)
        }
      }

      // INSERT winner picks
      if ((sourceGame.winnerPicks ?? []).length > 0) {
        const winnerPickRows = (sourceGame.winnerPicks ?? [])
          .map((w) => {
            const newPlayerId = playerIdMap.get(w.sessionId)
            if (!newPlayerId) return null
            return {
              id:            generateUUID(),
              game_player_id: newPlayerId,
              team_name:     w.teamName,
              awarded_points: w.awardedPoints ?? 0,
              is_locked:     w.isLocked,
              created_at:    w.createdAt,
              updated_at:    w.updatedAt,
            }
          })
          .filter((r): r is NonNullable<typeof r> => r !== null)

        if (winnerPickRows.length > 0) {
          await supabase.from('winner_picks').insert(winnerPickRows)
        }
      }

      // Persist localStorage keys
      if (data.sessionId && typeof window !== 'undefined') {
        localStorage.setItem(`porra_mundial_session_${gameId}`, data.sessionId)
        if (data.sessionId === creatorSessionId) {
          localStorage.setItem(`porra_mundial_creator_${gameId}`, data.sessionId)
          localStorage.setItem(`porra_mundial_admin_token_${gameId}`, adminToken)
        }
      }

      const game = await fetchGame(gameId)
      if (!game) return { error: 'Game imported but could not be loaded.' }
      return { game, sessionId: data.sessionId ?? null }
    } catch {
      return { error: 'Invalid export code. Please check and try again.' }
    }
  }

  // ─── updateMatchTeams ────────────────────────────────────────────────────────

  async function updateMatchTeams(
    gameId: string,
    matchId: string,
    homeTeam: string,
    awayTeam: string
  ): Promise<void> {
    const creatorSessionId = getCreatorSessionId(gameId)
    if (!creatorSessionId) return
    const client = supabaseWithSession(creatorSessionId)
    await client.from('matches')
      .update({
        home_team:       homeTeam.trim(),
        away_team:       awayTeam.trim(),
        teams_confirmed: true,
      })
      .eq('id', matchId)
    await safeLogGameAction(gameId, creatorSessionId, 'match_teams_updated', {
      matchId,
      homeTeam: homeTeam.trim(),
      awayTeam: awayTeam.trim(),
    })
    await fetchGame(gameId)
  }

  // ─── savePhaseMatches ────────────────────────────────────────────────────────

  async function savePhaseMatches(
    gameId: string,
    updates: MatchTeamUpdate[]
  ): Promise<void> {
    const creatorSessionId = getCreatorSessionId(gameId)
    if (!creatorSessionId) return
    const client = supabaseWithSession(creatorSessionId)

    await Promise.all(updates.map(u =>
      client.from('matches')
        .update({
          home_team:       u.homeTeam.trim(),
          away_team:       u.awayTeam.trim(),
          teams_confirmed: true,
        })
        .eq('id', u.matchId)
    ))

    await safeLogGameAction(gameId, creatorSessionId, 'phase_matches_saved', {
      count: updates.length,
      updates,
    })

    await fetchGame(gameId)
  }

  return (
    <GameStoreContext.Provider
      value={{
        isLoading,
        error,
        hasLegacyData,
        dismissLegacyBanner,
        games,
        storageAvailable,
        getGame,
        getMySession,
        getIsCreator,
        fetchGame,
        createGame,
        joinGame,
        redeemPlayerToken,
        redeemAdminToken,
        savePrediction,
        savePredictions,
        overridePrediction,
        overridePredictions,
        saveScorerSelection,
        saveWinnerPick,
        openPhase,
        lockPhase,
        lockGame,
        blockMatches,
        downloadActionLogs,
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
