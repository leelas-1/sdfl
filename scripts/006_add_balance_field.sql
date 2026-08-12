-- Add balance field to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS balance_selection TEXT;
