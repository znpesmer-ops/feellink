-- AlterTable
ALTER TABLE "article_comments" ADD COLUMN IF NOT EXISTS "parentId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "article_comments_parentId_idx" ON "article_comments"("parentId");

-- AddForeignKey
ALTER TABLE "article_comments" ADD CONSTRAINT "article_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "article_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
