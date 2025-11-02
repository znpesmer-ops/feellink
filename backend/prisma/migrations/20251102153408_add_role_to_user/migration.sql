-- AlterTable
ALTER TABLE "users" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER';

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'CORPORATE', 'ADMIN');

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT,
ALTER COLUMN "role" TYPE "Role" USING ("role"::"Role");

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'USER';

