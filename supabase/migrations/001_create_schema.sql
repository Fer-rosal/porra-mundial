-- Games table: container for tournament instances
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id TEXT NOT NULL,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  tournament_phase TEXT NOT NULL DEFAULT 'LEAGUE',
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  CONSTRAINT admin_id_valid CHECK (admin_id ~ '^[a-zA-Z0-9|@.-]+$')
);

-- Tournament phases: metadata per phase (League, 1/16, 1/8, 1/4, 1/2, Final)
CREATE TABLE tournament_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  phase_key TEXT NOT NULL,
  is_open BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  opened_at TIMESTAMP,
  locked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(game_id, phase_key)
);

-- Game players: player roster per game
CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  auth0_user_id TEXT NOT NULL,
  joined_at TIMESTAMP DEFAULT now(),
  total_score INTEGER DEFAULT 0,
  UNIQUE(game_id, auth0_user_id)
);

-- Matches: preloaded FIFA 2026 schedule per phase
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_phase_id UUID NOT NULL REFERENCES tournament_phases(id) ON DELETE CASCADE,
  match_number INTEGER NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  result_entered BOOLEAN DEFAULT false,
  home_goals INTEGER,
  away_goals INTEGER,
  created_at TIMESTAMP DEFAULT now()
);

-- Predictions: player's exact result bet per match
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  game_player_id UUID NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
  home_goals_predicted INTEGER NOT NULL,
  away_goals_predicted INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(match_id, game_player_id)
);

-- Scorer selections: one goalscorer per player per phase
CREATE TABLE scorer_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_phase_id UUID NOT NULL REFERENCES tournament_phases(id) ON DELETE CASCADE,
  game_player_id UUID NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  goals_scored INTEGER DEFAULT 0,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(tournament_phase_id, game_player_id)
);

-- Scorer points: admin-awarded goals per scorer per phase
CREATE TABLE scorer_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_player_id UUID NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
  tournament_phase_id UUID NOT NULL REFERENCES tournament_phases(id) ON DELETE CASCADE,
  goals_count INTEGER NOT NULL,
  awarded_at TIMESTAMP DEFAULT now(),
  awarded_by_admin_id TEXT NOT NULL,
  UNIQUE(game_player_id, tournament_phase_id)
);

-- Phase scores: aggregated score per player per phase
CREATE TABLE phase_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_player_id UUID NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
  tournament_phase_id UUID NOT NULL REFERENCES tournament_phases(id) ON DELETE CASCADE,
  prediction_score INTEGER NOT NULL DEFAULT 0,
  scorer_score INTEGER NOT NULL DEFAULT 0,
  phase_total INTEGER GENERATED ALWAYS AS (prediction_score + scorer_score) STORED,
  calculated_at TIMESTAMP DEFAULT now(),
  UNIQUE(game_player_id, tournament_phase_id)
);

-- Create indexes for common queries
CREATE INDEX idx_games_admin_id ON games(admin_id);
CREATE INDEX idx_games_invite_code ON games(invite_code);
CREATE INDEX idx_game_players_game_id ON game_players(game_id);
CREATE INDEX idx_game_players_auth0_user_id ON game_players(auth0_user_id);
CREATE INDEX idx_tournament_phases_game_id ON tournament_phases(game_id);
CREATE INDEX idx_matches_tournament_phase_id ON matches(tournament_phase_id);
CREATE INDEX idx_predictions_game_player_id ON predictions(game_player_id);
CREATE INDEX idx_predictions_match_id ON predictions(match_id);
CREATE INDEX idx_scorer_selections_game_player_id ON scorer_selections(game_player_id);
CREATE INDEX idx_scorer_selections_tournament_phase_id ON scorer_selections(tournament_phase_id);
CREATE INDEX idx_scorer_points_game_player_id ON scorer_points(game_player_id);
CREATE INDEX idx_scorer_points_tournament_phase_id ON scorer_points(tournament_phase_id);
CREATE INDEX idx_phase_scores_game_player_id ON phase_scores(game_player_id);
CREATE INDEX idx_phase_scores_tournament_phase_id ON phase_scores(tournament_phase_id);
