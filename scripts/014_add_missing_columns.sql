-- Add missing columns to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'start';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT true;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Create settings table for brand configuration
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default brand setting
INSERT INTO settings (key, value) 
VALUES ('active_brand', 'ledger')
ON CONFLICT (key) DO NOTHING;

-- Create ledger_activities table for activity tracking
CREATE TABLE IF NOT EXISTS ledger_activities (
  visitor_id TEXT PRIMARY KEY,
  activity JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on settings table
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations on settings (admin only in practice)
DROP POLICY IF EXISTS "Allow all operations on settings" ON settings;
CREATE POLICY "Allow all operations on settings" ON settings FOR ALL USING (true);

-- Enable RLS on ledger_activities table
ALTER TABLE ledger_activities ENABLE ROW LEVEL SECURITY;

-- Allow all operations on ledger_activities
DROP POLICY IF EXISTS "Allow all operations on ledger_activities" ON ledger_activities;
CREATE POLICY "Allow all operations on ledger_activities" ON ledger_activities FOR ALL USING (true);
