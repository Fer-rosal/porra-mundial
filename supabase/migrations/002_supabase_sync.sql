-- Migration 002: Supabase Sync — Cross-Device Game Persistence
-- Migrates all game state from localStorage model to DB-backed anonymous sessions.
-- DO NOT modify 001_create_schema.sql.

-- Drop server-side scoring tables (scoring is computed client-side in local-scoring.ts)
DROP TABLE IF EXISTS scorer_points CASCADE;
DROP TABLE IF EXISTS phase_scores CASCADE;

-- ── games: replace admin_id with creator_session_id + admin_token ──────────────
ALTER TABLE games DROP COLUMN admin_id;

ALTER TABLE games
  ADD COLUMN creator_session_id TEXT NOT NULL DEFAULT 'MIGRATION_PLACEHOLDER',
  ADD COLUMN admin_token        TEXT NOT NULL DEFAULT 'MIGRATION_PLACEHOLDER';

-- Remove placeholder defaults (real INSERTs will always provide these)
ALTER TABLE games ALTER COLUMN creator_session_id DROP DEFAULT;
ALTER TABLE games ALTER COLUMN admin_token        DROP DEFAULT;

ALTER TABLE games
  ADD CONSTRAINT creator_session_id_uuid CHECK (
    creator_session_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ),
  ADD CONSTRAINT admin_token_uuid CHECK (
    admin_token ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

DROP INDEX IF EXISTS idx_games_admin_id;
CREATE INDEX idx_games_creator_session_id ON games(creator_session_id);

-- ── game_players: replace auth0_user_id with session_id + player_name + player_token ──
ALTER TABLE game_players DROP COLUMN auth0_user_id;

ALTER TABLE game_players
  ADD COLUMN session_id   TEXT NOT NULL DEFAULT 'MIGRATION_PLACEHOLDER',
  ADD COLUMN player_name  TEXT NOT NULL DEFAULT 'MIGRATION_PLACEHOLDER',
  ADD COLUMN player_token TEXT NOT NULL DEFAULT 'MIGRATION_PLACEHOLDER';

ALTER TABLE game_players ALTER COLUMN session_id   DROP DEFAULT;
ALTER TABLE game_players ALTER COLUMN player_name  DROP DEFAULT;
ALTER TABLE game_players ALTER COLUMN player_token DROP DEFAULT;

ALTER TABLE game_players
  ADD CONSTRAINT session_id_uuid CHECK (
    session_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

ALTER TABLE game_players
  DROP CONSTRAINT IF EXISTS game_players_game_id_auth0_user_id_key;
ALTER TABLE game_players
  ADD CONSTRAINT game_players_game_id_session_id_key UNIQUE (game_id, session_id);

DROP INDEX IF EXISTS idx_game_players_auth0_user_id;
CREATE INDEX idx_game_players_session_id    ON game_players(session_id);
CREATE INDEX idx_game_players_player_token  ON game_players(player_token);

-- ── matches: add phase_key (direct lookup) + teams_confirmed ──────────────────
ALTER TABLE matches
  ADD COLUMN phase_key       TEXT    NOT NULL DEFAULT 'LEAGUE',
  ADD COLUMN teams_confirmed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE matches ALTER COLUMN phase_key DROP DEFAULT;

CREATE INDEX idx_matches_phase_key ON matches(phase_key);

-- ── scorer_selections: add phase_key (direct lookup) ─────────────────────────
ALTER TABLE scorer_selections
  ADD COLUMN phase_key TEXT NOT NULL DEFAULT 'LEAGUE';

ALTER TABLE scorer_selections ALTER COLUMN phase_key DROP DEFAULT;

CREATE INDEX idx_scorer_selections_phase_key ON scorer_selections(phase_key);

-- ── Row-Level Security ────────────────────────────────────────────────────────
ALTER TABLE games              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_phases  ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players       ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorer_selections  ENABLE ROW LEVEL SECURITY;

-- Helper: extract x-session-id from request headers
-- In Supabase, request headers are accessible via current_setting('request.headers')::json

-- games
CREATE POLICY games_select ON games FOR SELECT USING (true);
CREATE POLICY games_insert ON games FOR INSERT WITH CHECK (true);
CREATE POLICY games_update ON games FOR UPDATE
  USING (
    creator_session_id = (current_setting('request.headers', true)::json)->>'x-session-id'
  );
CREATE POLICY games_delete ON games FOR DELETE
  USING (
    creator_session_id = (current_setting('request.headers', true)::json)->>'x-session-id'
  );

-- tournament_phases (admin-only writes)
CREATE POLICY tp_select ON tournament_phases FOR SELECT USING (true);
CREATE POLICY tp_insert ON tournament_phases FOR INSERT WITH CHECK (true);
CREATE POLICY tp_update ON tournament_phases FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM games g
    WHERE g.id = tournament_phases.game_id
      AND g.creator_session_id =
            (current_setting('request.headers', true)::json)->>'x-session-id'
  )
);

-- matches (admin-only writes)
CREATE POLICY matches_select ON matches FOR SELECT USING (true);
CREATE POLICY matches_insert ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY matches_update ON matches FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM tournament_phases tp
    JOIN games g ON g.id = tp.game_id
    WHERE tp.id = matches.tournament_phase_id
      AND g.creator_session_id =
            (current_setting('request.headers', true)::json)->>'x-session-id'
  )
);

-- game_players (open insert; no client-side update/delete)
CREATE POLICY gp_select ON game_players FOR SELECT USING (true);
CREATE POLICY gp_insert ON game_players FOR INSERT WITH CHECK (true);

-- predictions (permissive for MVP — any anon-key client may write)
CREATE POLICY pred_select ON predictions FOR SELECT USING (true);
CREATE POLICY pred_insert ON predictions FOR INSERT WITH CHECK (true);
CREATE POLICY pred_update ON predictions FOR UPDATE USING (true);

-- scorer_selections (same as predictions)
CREATE POLICY ss_select ON scorer_selections FOR SELECT USING (true);
CREATE POLICY ss_insert ON scorer_selections FOR INSERT WITH CHECK (true);
CREATE POLICY ss_update ON scorer_selections FOR UPDATE USING (true);
