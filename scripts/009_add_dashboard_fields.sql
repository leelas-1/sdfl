-- Add dashboard-related fields for Coinbase dashboard customization
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS dashboard_balance TEXT DEFAULT '0.00';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS dashboard_balance_hidden BOOLEAN DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS dashboard_on_hold BOOLEAN DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS dashboard_hold_message TEXT DEFAULT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS dashboard_btc_amount TEXT DEFAULT '0.00000000';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS dashboard_eth_amount TEXT DEFAULT '0.00000000';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS dashboard_usdc_amount TEXT DEFAULT '0.00';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS dashboard_sol_amount TEXT DEFAULT '0.00000000';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS dashboard_user_name TEXT DEFAULT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS dashboard_user_email TEXT DEFAULT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS dashboard_profile_image TEXT DEFAULT NULL;
