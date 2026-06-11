-- Migration 005: Tournament winner picks (+10 admin-awarded bonus)
 UUID NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  awarded_points INTEGER NOT NULL DEFAULT 0,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (game_player_id)
);
CREATE TABLE IF NOT EXISTS winner_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_player_id

CREATE INDEX IF NOT EXISTS idx_winner_picks_game_player_id ON winner_picks(game_player_id);

ALTER TABLE winner_picks ENABLE ROW LEVEL SECURITY;

CREATE POLICY winner_picks_select ON winner_picks
  FOR SELECT USING (true);

CREATE POLICY winner_picks_insert ON winner_picks
  FOR INSERT WITH CHECK (true);

CREATE POLICY winner_picks_update ON winner_picks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM game_players gp
      JOIN games g ON g.id = gp.game_id
      WHERE gp.id = winner_picks.game_player_id
        AND g.creator_session_id = (current_setting('request.headers', true)::json)->>'x-session-id'
    )
  );
