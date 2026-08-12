-- Add wallet popup fields to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS show_wallet_popup BOOLEAN DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS wallet_popup_type TEXT DEFAULT 'link';
