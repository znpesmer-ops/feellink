-- AlterTable
ALTER TABLE "users" ADD COLUMN     "coverPhoto" TEXT,
ADD COLUMN     "totalLikes" INTEGER NOT NULL DEFAULT 0;
