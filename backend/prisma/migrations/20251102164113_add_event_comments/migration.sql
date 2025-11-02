-- AlterTable
ALTER TABLE "events" ADD COLUMN "ticketUrl" TEXT;

-- CreateTable
CREATE TABLE "event_comments" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "event_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_comments_eventId_idx" ON "event_comments"("eventId");

-- CreateIndex
CREATE INDEX "event_comments_authorId_idx" ON "event_comments"("authorId");

-- CreateIndex
CREATE INDEX "event_comments_createdAt_idx" ON "event_comments"("createdAt");

-- AddForeignKey
ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_comments" ADD CONSTRAINT "event_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

