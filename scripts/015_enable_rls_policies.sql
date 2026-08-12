-- Enable RLS and create permissive policies for login_attempts table
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Allow all operations on login_attempts" ON login_attempts;

-- Create permissive policy for all operations (service role will bypass RLS)
CREATE POLICY "Allow all operations on login_attempts" ON login_attempts
FOR ALL
USING (true)
WITH CHECK (true);
