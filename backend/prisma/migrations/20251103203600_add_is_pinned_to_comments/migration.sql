-- AlterTable
ALTER TABLE "comments" ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "comments_postId_isPinned_idx" ON "comments"("postId", "isPinned");

