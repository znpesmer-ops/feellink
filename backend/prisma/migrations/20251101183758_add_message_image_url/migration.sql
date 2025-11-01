-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "imageUrl" TEXT,
ALTER COLUMN "content" DROP NOT NULL;
