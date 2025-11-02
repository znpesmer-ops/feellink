-- CreateTable
CREATE TABLE "ticket_purchases" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "qrUrl" TEXT,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticket_purchases_code_key" ON "ticket_purchases"("code");

-- CreateIndex
CREATE INDEX "ticket_purchases_ticketId_idx" ON "ticket_purchases"("ticketId");

-- CreateIndex
CREATE INDEX "ticket_purchases_userId_idx" ON "ticket_purchases"("userId");

-- CreateIndex
CREATE INDEX "ticket_purchases_code_idx" ON "ticket_purchases"("code");

-- CreateIndex
CREATE INDEX "ticket_purchases_used_idx" ON "ticket_purchases"("used");

-- CreateIndex
CREATE INDEX "ticket_purchases_createdAt_idx" ON "ticket_purchases"("createdAt");

-- AddForeignKey
ALTER TABLE "ticket_purchases" ADD CONSTRAINT "ticket_purchases_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_purchases" ADD CONSTRAINT "ticket_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

