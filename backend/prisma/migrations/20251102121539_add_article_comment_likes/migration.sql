-- CreateTable
CREATE TABLE "article_comment_likes" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_comment_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "article_comment_likes_commentId_idx" ON "article_comment_likes"("commentId");

-- CreateIndex
CREATE INDEX "article_comment_likes_userId_idx" ON "article_comment_likes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "article_comment_likes_commentId_userId_key" ON "article_comment_likes"("commentId", "userId");

-- AddForeignKey
ALTER TABLE "article_comment_likes" ADD CONSTRAINT "article_comment_likes_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "article_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_comment_likes" ADD CONSTRAINT "article_comment_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
