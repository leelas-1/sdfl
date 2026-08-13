/*
# Add missing columns to sessions table

The /api/sessions route and other code reference columns that weren't in the
initial schema. This adds them idempotently.

1. Modified Tables
- sessions: adds brand, stage, data, updated_at, is_online, ip_address columns.

2. Security
- No security changes. RLS already enabled with permissive policies.
*/

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'start';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT true;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address TEXT;
