-- CreateEnum
CREATE TYPE "CallBookingStatus" AS ENUM ('AWAITING_PAYMENT', 'PAID', 'SCHEDULED');

-- CreateTable
CREATE TABLE "CallBooking" (
    "id" TEXT NOT NULL,
    "status" "CallBookingStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "tokenAddress" TEXT NOT NULL,
    "tokenSymbol" TEXT NOT NULL,
    "tokenDecimals" INTEGER NOT NULL,
    "amountRaw" TEXT NOT NULL,
    "payerWallet" TEXT,
    "recipient" TEXT NOT NULL,
    "txHash" TEXT,
    "paidAt" TIMESTAMP(3),
    "schedulingUrl" TEXT,
    "calendlyEventUri" TEXT,
    "calendlyInviteeUri" TEXT,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "cancelUrl" TEXT,
    "rescheduleUrl" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CallBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CallBooking_txHash_key" ON "CallBooking"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "CallBooking_calendlyInviteeUri_key" ON "CallBooking"("calendlyInviteeUri");

-- CreateIndex
CREATE INDEX "CallBooking_userId_createdAt_idx" ON "CallBooking"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CallBooking_status_idx" ON "CallBooking"("status");

-- AddForeignKey
ALTER TABLE "CallBooking" ADD CONSTRAINT "CallBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
