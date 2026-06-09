export type TournamentPhase = 'LEAGUE' | '1/16' | '1/8' | '1/4' | '1/2' | 'FINAL';

export interface Game {
  id: string;
  admin_id: string;
  name: string;
  invite_code: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
  tournament_phase: TournamentPhase;
  player_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface TournamentPhaseData {
  id: string;
  game_id: string;
  phase_key: TournamentPhase;
  is_open: boolean;
  is_locked: boolean;
  opened_at?: string;
  locked_at?: string;
  created_at: string;
}

export interface Match {
  id: string;
  tournament_phase_id?: string;
  match_number: number;
  home_team: string;
  away_team: string;
  scheduled_at: string;
  result_entered: boolean;
  home_goals?: number;
  away_goals?: number;
  created_at?: string;
}

export interface Prediction {
  id: string;
  match_id: string;
  game_player_id?: string;
  home_goals_predicted: number;
  away_goals_predicted: number;
  created_at: string;
  updated_at: string;
  home_team?: string;
  away_team?: string;
}

export interface ScorerSelection {
  id: string;
  tournament_phase_id: string;
  game_player_id: string;
  player_name: string;
  goals_scored?: number;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface GamePlayer {
  id: string;
  game_id: string;
  auth0_user_id: string;
  total_score: number;
  player_name?: string;
  joined_at: string;
}

export interface PhaseScore {
  phase_key: TournamentPhase;
  prediction_score: number;
  scorer_score: number;
  phase_total: number;
}

export interface LeaderboardEntry {
  game_player_id: string;
  player_name: string;
  league_score?: number;
  round_of_16_score?: number;
  quarter_finals_score?: number;
  semi_finals_score?: number;
  finals_score?: number;
  total_score: number;
  phase_scores?: PhaseScore[];
}

export interface CurrentPhaseResponse {
  phase_key: TournamentPhase;
  is_open: boolean;
  is_locked: boolean;
  opened_at?: string;
  locked_at?: string;
  matches: Match[];
}

export interface MyPredictionsResponse {
  phase_key: TournamentPhase;
  predictions: Prediction[];
  scorer_selection?: ScorerSelection;
}

export interface MyScoreResponse {
  game_player_id: string;
  phase_scores: PhaseScore[];
  total_score: number;
}

export interface AuthUser {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
}

export interface ErrorResponse {
  error: string;
}

export interface Leaderboard {
  game_player_id: string;
  player_name: string;
  phase_1_score: number;
  phase_2_score: number;
  phase_3_score: number;
  phase_4_score: number;
  phase_5_score: number;
  phase_6_score: number;
  total_score: number;
}
