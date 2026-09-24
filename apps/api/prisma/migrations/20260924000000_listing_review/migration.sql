-- Seller-submitted listings wait for an admin before they can go on-chain.
ALTER TYPE "ListingStatus" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW';
ALTER TYPE "ListingStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "reviewNote" TEXT;
