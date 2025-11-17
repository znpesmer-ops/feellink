CREATE TYPE "UserRole" AS ENUM ('art_lover', 'corporate', 'collector', 'artist');
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PRO');

-- Add new plan & badges columns
ALTER TABLE "users"
  ADD COLUMN "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
  ADD COLUMN "badges" JSONB NOT NULL DEFAULT '{"pro": false, "corporate_verified": false}';

-- Ensure legacy roles column exists for data migration on fresh databases
DO
$$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'roles'
  ) THEN
    ALTER TABLE "users"
      ADD COLUMN "roles" TEXT[] NOT NULL DEFAULT ARRAY[]::text[];
  END IF;
END;
$$;

-- Add temporary column for new enum-based roles
ALTER TABLE "users"
  ADD COLUMN "roles_new" "UserRole"[] NOT NULL DEFAULT ARRAY[]::"UserRole"[];

-- Migrate existing role data into the new enum array
UPDATE "users"
SET "roles_new" = (
  SELECT COALESCE(array_agg(DISTINCT mapped_role)::"UserRole"[], ARRAY[]::"UserRole"[])
  FROM (
    SELECT CASE
      WHEN lower(val) IN ('user', 'art_lover') THEN 'art_lover'
      WHEN lower(val) = 'corporate' THEN 'corporate'
      WHEN lower(val) = 'collector' THEN 'collector'
      WHEN lower(val) IN ('artist', 'museum') THEN 'artist'
      ELSE NULL
    END AS mapped_role
    FROM unnest(
      COALESCE("users"."roles", ARRAY[]::text[])
      || CASE
        WHEN "users"."role" IS NULL THEN ARRAY[]::text[]
        ELSE ARRAY[lower(CAST("users"."role" AS text))]
      END
    ) AS val
  ) mapped
  WHERE mapped_role IS NOT NULL
);

-- Replace old roles column with the new enum-based column
ALTER TABLE "users" DROP COLUMN "roles";
ALTER TABLE "users" RENAME COLUMN "roles_new" TO "roles";

-- Drop legacy single role column and enum
ALTER TABLE "users" DROP COLUMN "role";
DROP TYPE IF EXISTS "Role";





