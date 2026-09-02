-- CreateTable
CREATE TABLE "DailyProject" (
    "id" TEXT NOT NULL,
    "bidderWallet" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "websiteUrl" TEXT,
    "twitterUrl" TEXT,
    "youtubeUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "listingId" TEXT NOT NULL,
    "submittedByUserId" TEXT,

    CONSTRAINT "DailyProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyProject_listingId_idx" ON "DailyProject"("listingId");

-- CreateIndex
CREATE INDEX "DailyProject_bidderWallet_idx" ON "DailyProject"("bidderWallet");

-- CreateIndex
CREATE UNIQUE INDEX "DailyProject_listingId_bidderWallet_key" ON "DailyProject"("listingId", "bidderWallet");

-- AddForeignKey
ALTER TABLE "DailyProject" ADD CONSTRAINT "DailyProject_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyProject" ADD CONSTRAINT "DailyProject_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
