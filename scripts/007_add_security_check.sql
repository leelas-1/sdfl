-- Add security check fields to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS security_responses jsonb DEFAULT '{}';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS security_location text DEFAULT 'Frankfurt, Germany';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS security_phone_last4 text DEFAULT '9548';
