-- AlterTable: Add type column to posts table
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'post';
