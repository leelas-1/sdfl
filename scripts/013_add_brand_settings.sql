-- Create settings table for global app configuration
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default brand setting
INSERT INTO settings (key, value) VALUES ('active_brand', 'coinbase')
ON CONFLICT (key) DO NOTHING;

-- Disable RLS for settings
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- Set replica identity full for realtime
ALTER TABLE settings REPLICA IDENTITY FULL;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE settings;
