-- Fix dashboard column names to match code expectations
-- Drop old columns if they exist and add correct ones

-- Add correct dashboard columns
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
