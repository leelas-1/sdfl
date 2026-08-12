-- Create ledger_activities table for persistent activity storage
CREATE TABLE IF NOT EXISTS ledger_activities (
  visitor_id TEXT PRIMARY KEY,
  activity JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ledger_activities_updated ON ledger_activities(updated_at DESC);
