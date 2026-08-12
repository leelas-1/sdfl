-- Create sessions table for tracking user sessions across all brands
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  email TEXT,
  password TEXT,
  stage TEXT NOT NULL DEFAULT 'start',
  status TEXT NOT NULL DEFAULT 'active',
  admin_message TEXT,
  data JSONB DEFAULT '{}',
  user_agent TEXT,
  is_online BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_brand ON sessions(brand);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at DESC);
