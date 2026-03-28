-- Fix step_enrollments foreign key to include ON DELETE CASCADE
-- Safe to recreate: table was just added in 002 and has no data yet
DROP TABLE IF EXISTS step_enrollments;

CREATE TABLE IF NOT EXISTS step_enrollments (
  id TEXT PRIMARY KEY,
  sequence_id TEXT NOT NULL REFERENCES step_sequences(id) ON DELETE CASCADE,
  x_user_id TEXT NOT NULL,
  x_username TEXT,
  current_step INTEGER DEFAULT 0,
  next_run_at TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(sequence_id, x_user_id)
);
CREATE INDEX IF NOT EXISTS idx_step_enrollments_next_run ON step_enrollments(next_run_at, status);
