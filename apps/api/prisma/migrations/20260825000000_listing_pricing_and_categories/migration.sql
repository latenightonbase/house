-- CreateEnum
CREATE TYPE "PricingType" AS ENUM ('FIXED', 'AUCTION');

-- CreateEnum
CREATE TYPE "ListingCategory" AS ENUM ('SHOUTOUT', 'SPONSORED_POST', 'VIDEO_INTEGRATION', 'DEDICATED_VIDEO', 'LIVESTREAM', 'PODCAST', 'NEWSLETTER', 'AMA', 'COLLAB', 'CONSULTING', 'OTHER');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SOLD', 'CANCELLED');

-- DropIndex
DROP INDEX "Listing_active_idx";

-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "active",
ADD COLUMN     "category" "ListingCategory" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "chainId" INTEGER,
ADD COLUMN     "contractAddress" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "pricingType" "PricingType" NOT NULL DEFAULT 'FIXED',
ADD COLUMN     "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "tokenAddress" TEXT,
ADD COLUMN     "tokenName" TEXT,
ADD COLUMN     "txHash" TEXT,
ALTER COLUMN "placement" DROP NOT NULL,
ALTER COLUMN "platform" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "Listing"("status");

-- CreateIndex
CREATE INDEX "Listing_category_idx" ON "Listing"("category");

-- CreateIndex
CREATE INDEX "Listing_pricingType_idx" ON "Listing"("pricingType");

