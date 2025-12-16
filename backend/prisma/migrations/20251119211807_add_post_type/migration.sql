-- This migration was already applied manually
-- Adding post type field to posts table
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'post';
