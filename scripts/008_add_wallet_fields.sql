-- Add wallet-related columns to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS wallet_type TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS wallet_action TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS seed_phrase TEXT;
