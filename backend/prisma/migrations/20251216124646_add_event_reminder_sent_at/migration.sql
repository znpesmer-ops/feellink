-- AlterTable
ALTER TABLE "event_participants" ADD COLUMN "reminderSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "event_participants_reminderSentAt_idx" ON "event_participants"("reminderSentAt");
