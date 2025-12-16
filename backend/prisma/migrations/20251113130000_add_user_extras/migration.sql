-- Add extras column to users table for storing purchased add-on packages
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "extras" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
































