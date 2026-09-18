-- Adds PENDING_REVIEW and REJECTED to ListingStatus for the creator
-- approval queue. Purely additive: existing rows and every existing
-- ACTIVE/DRAFT/SOLD/CANCELLED value are unaffected. Postgres requires
-- each enum value added in its own statement, outside a transaction
-- block with other DDL, which is why this migration is intentionally
-- just these two lines.
ALTER TYPE "ListingStatus" ADD VALUE 'PENDING_REVIEW';
ALTER TYPE "ListingStatus" ADD VALUE 'REJECTED';
