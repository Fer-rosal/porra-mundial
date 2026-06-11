-- Migration 003: game action logs audit trail
-- Adds persistent per-game action logging for players/admin and supports admin log export.

CREATE TABLE IF NOT EXISTS game_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  actor_session_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT game_action_logs_actor_session_uuid CHECK (
    actor_session_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  )
);

CREATE INDEX IF NOT EXISTS idx_game_action_logs_game_id_created_at
  ON game_action_logs(game_id, created_at);

CREATE INDEX IF NOT EXISTS idx_game_action_logs_actor_session_id
  ON game_action_logs(actor_session_id);

ALTER TABLE game_action_logs ENABLE ROW LEVEL SECURITY;

-- Creator can read logs for their own game.
CREATE POLICY gal_select_creator ON game_action_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM games g
    WHERE g.id = game_action_logs.game_id
      AND g.creator_session_id = (current_setting('request.headers', true)::json)->>'x-session-id'
  )
);

-- Any participant (creator or player) can insert logs for their own session only.
CREATE POLICY gal_insert_participant ON game_action_logs
FOR INSERT
WITH CHECK (
  actor_session_id = (current_setting('request.headers', true)::json)->>'x-session-id'
  AND (
    EXISTS (
      SELECT 1
      FROM games g
      WHERE g.id = game_action_logs.game_id
        AND g.creator_session_id = game_action_logs.actor_session_id
    )
    OR EXISTS (
      SELECT 1
      FROM game_players gp
      WHERE gp.game_id = game_action_logs.game_id
        AND gp.session_id = game_action_logs.actor_session_id
    )
  )
);
