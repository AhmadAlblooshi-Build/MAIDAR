-- Migration: Add email verification fields to users table
-- Date: 2024-02-26
-- Description: Adds email_verified, verification_code, and verification_code_expires_at fields

BEGIN;

-- Add email verification fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index on email_verified for faster queries
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

-- Add comment
COMMENT ON COLUMN users.email_verified IS 'Whether the user has verified their email address';
COMMENT ON COLUMN users.verification_code IS '6-digit verification code for email verification';
COMMENT ON COLUMN users.verification_code_expires_at IS 'Expiration timestamp for verification code';

COMMIT;
