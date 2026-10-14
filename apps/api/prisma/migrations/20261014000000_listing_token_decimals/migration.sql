-- A listing can be priced in any ERC-20 entered by address, so the token's
-- decimals are stored with it.
ALTER TABLE "Listing" ADD COLUMN "tokenDecimals" INTEGER;
