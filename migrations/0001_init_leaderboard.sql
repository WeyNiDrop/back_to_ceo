CREATE TABLE players (
  player_id TEXT PRIMARY KEY NOT NULL,
  nickname TEXT NOT NULL CHECK (length(nickname) BETWEEN 1 AND 24 AND nickname = trim(nickname)),
  created_at_ms INTEGER NOT NULL CHECK (created_at_ms >= 0)
) STRICT;

-- Only verified, completed runs are written here. The run ID makes retries idempotent.
CREATE TABLE runs (
  run_id TEXT PRIMARY KEY NOT NULL,
  player_id TEXT NOT NULL REFERENCES players (player_id),
  rules_version TEXT NOT NULL,
  started_at_ms INTEGER NOT NULL CHECK (started_at_ms >= 0),
  finished_at_ms INTEGER NOT NULL CHECK (finished_at_ms > started_at_ms),
  elapsed_ms INTEGER NOT NULL CHECK (elapsed_ms = finished_at_ms - started_at_ms),
  UNIQUE (run_id, player_id, rules_version, elapsed_ms, finished_at_ms)
) STRICT;

-- Store one ranked finish per player and rules version, pointing to the exact run.
CREATE TABLE best_times (
  player_id TEXT NOT NULL,
  rules_version TEXT NOT NULL,
  run_id TEXT NOT NULL,
  elapsed_ms INTEGER NOT NULL,
  finished_at_ms INTEGER NOT NULL,
  PRIMARY KEY (rules_version, player_id),
  FOREIGN KEY (run_id, player_id, rules_version, elapsed_ms, finished_at_ms)
    REFERENCES runs (run_id, player_id, rules_version, elapsed_ms, finished_at_ms)
) STRICT;

CREATE INDEX best_times_rank_idx
  ON best_times (rules_version, elapsed_ms, finished_at_ms, player_id);
