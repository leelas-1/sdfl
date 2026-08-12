-- Add new fields for verification options
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS phone_last4 TEXT DEFAULT '7842';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS verification_type TEXT DEFAULT 'phone';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS email_for_code TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS authenticator_code TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS email_code TEXT;

-- verification_type can be: 'phone', 'email', 'authenticator'
