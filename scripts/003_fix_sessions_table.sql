-- Drop and recreate sessions table with correct schema
DROP TABLE IF EXISTS sessions;

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  email TEXT,
  current_step TEXT DEFAULT 'email',
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  redirect_url TEXT,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (for demo purposes)
CREATE POLICY "Allow all operations on sessions" ON sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable realtime for sessions table
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
