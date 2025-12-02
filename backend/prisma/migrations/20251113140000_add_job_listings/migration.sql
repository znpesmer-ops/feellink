-- CreateTable
CREATE TABLE "job_listings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "company" TEXT,
    "location" TEXT,
    "salary" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "job_listings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_listings_createdAt_idx" ON "job_listings"("createdAt");

-- CreateIndex
CREATE INDEX "job_listings_createdById_idx" ON "job_listings"("createdById");

-- AddForeignKey
ALTER TABLE "job_listings"
ADD CONSTRAINT "job_listings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

















