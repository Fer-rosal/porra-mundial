// ── DB row shapes returned by Supabase queries ────────────────────────────────
// LocalGame and related client types live in game-store.tsx.

export interface DbGame {
  id: string
  creator_session_id: string
  admin_token: string
  name: string
  invite_code: string
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED'
  tournament_phase: string
  created_at: string
  updated_at: string
}

export interface DbGamePlayer {
  id: string
  game_id: string
  session_id: string
  player_name: string
  player_token: string
  total_score: number
  joined_at: string
}

export interface DbTournamentPhase {
  id: string
  game_id: string
  phase_key: string
  is_open: boolean
  is_locked: boolean
  opened_at: string | null
  locked_at: string | null
  created_at: string
}

export interface DbMatch {
  id: string
  tournament_phase_id: string
  phase_key: string
  match_number: number
  home_team: string
  away_team: string
  scheduled_at: string
  predictions_locked: boolean
  result_entered: boolean
  home_goals: number | null
  away_goals: number | null
  teams_confirmed: boolean
  created_at: string
}

export interface DbPrediction {
  id: string
  match_id: string
  game_player_id: string
  home_goals_predicted: number
  away_goals_predicted: number
  created_at: string
  updated_at: string
}

export interface DbScorerSelection {
  id: string
  tournament_phase_id: string
  game_player_id: string
  phase_key: string
  player_name: string
  goals_scored: number
  is_locked: boolean
  created_at: string
  updated_at: string
}

export interface DbGameActionLog {
  id: string
  game_id: string
  actor_session_id: string
  action_type: string
  action_details: Record<string, unknown>
  created_at: string
}

// ── Legacy types — kept for backward-compatibility with components and scoring.ts ──
// These types will be removed once all callers are migrated to LocalGame / DB types.

export type TournamentPhase = 'LEAGUE' | '1/16' | '1/8' | '1/4' | '1/2' | 'FINAL'
export type PhaseKey = 'LEAGUE' | 'R16' | 'R8' | 'R4' | 'R2' | 'FINAL'

export interface Match {
  id: string
  tournament_phase_id?: string
  match_number: number
  home_team: string
  away_team: string
  scheduled_at: string
  result_entered: boolean
  home_goals?: number
  away_goals?: number
  created_at?: string
}

export interface PhaseScore {
  phase_key: TournamentPhase
  prediction_score: number
  scorer_score: number
  phase_total: number
}

export interface ErrorResponse {
  error: string
}
