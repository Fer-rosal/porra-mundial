-- Migration 004: Per-match prediction lock
-- Allows admin to block predictions for specific matches without entering results.

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS predictions_locked BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_matches_predictions_locked ON matches(predictions_locked);
