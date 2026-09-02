-- Daily auctions can be reserved at fractional USDG (0.01), so price and
-- bid amounts are no longer whole units.
ALTER TABLE "Listing" ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION;
ALTER TABLE "ListingBid" ALTER COLUMN "amount" SET DATA TYPE DOUBLE PRECISION;
