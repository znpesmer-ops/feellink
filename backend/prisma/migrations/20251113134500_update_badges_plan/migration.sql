-- Add ORI plan option if not already present
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'ORI';

-- Convert badges column from JSON to TEXT[]
ALTER TABLE "users"
ALTER COLUMN "badges" DROP DEFAULT;

ALTER TABLE "users"
ALTER COLUMN "badges"
TYPE TEXT[]
USING ARRAY[]::TEXT[];

ALTER TABLE "users"
ALTER COLUMN "badges"
SET DEFAULT ARRAY[]::TEXT[];
































