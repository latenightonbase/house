-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "EmailOtpPurpose" AS ENUM ('VERIFY_EMAIL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER',
ADD COLUMN     "email" TEXT,
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateTable
CREATE TABLE "EmailOtp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashedCode" TEXT NOT NULL,
    "purpose" "EmailOtpPurpose" NOT NULL DEFAULT 'VERIFY_EMAIL',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "EmailOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailOtp_userId_idx" ON "EmailOtp"("userId");

-- CreateIndex
CREATE INDEX "EmailOtp_email_idx" ON "EmailOtp"("email");

-- CreateIndex
CREATE INDEX "EmailOtp_expiresAt_idx" ON "EmailOtp"("expiresAt");

-- AddForeignKey
ALTER TABLE "EmailOtp" ADD CONSTRAINT "EmailOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "isDaily" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "winnerWallet" TEXT,
ADD COLUMN     "settledAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Listing_isDaily_status_idx" ON "Listing"("isDaily", "status");

-- CreateTable
CREATE TABLE "ListingBid" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "bidderWallet" TEXT NOT NULL,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "listingId" TEXT NOT NULL,
    "bidderUserId" TEXT,

    CONSTRAINT "ListingBid_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingBid_listingId_idx" ON "ListingBid"("listingId");

-- CreateIndex
CREATE INDEX "ListingBid_bidderWallet_idx" ON "ListingBid"("bidderWallet");

-- CreateIndex
CREATE INDEX "ListingBid_createdAt_idx" ON "ListingBid"("createdAt");

-- AddForeignKey
ALTER TABLE "ListingBid" ADD CONSTRAINT "ListingBid_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingBid" ADD CONSTRAINT "ListingBid_bidderUserId_fkey" FOREIGN KEY ("bidderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
