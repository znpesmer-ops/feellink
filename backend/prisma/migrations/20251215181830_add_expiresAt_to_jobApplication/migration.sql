-- AlterTable: Add expiresAt and reminderSentAt to job_applications
ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3);

-- CreateIndex: Add index on expiresAt for efficient queries
CREATE INDEX IF NOT EXISTS "job_applications_expiresAt_idx" ON "job_applications"("expiresAt");
