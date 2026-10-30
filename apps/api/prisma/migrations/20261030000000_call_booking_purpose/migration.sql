-- CreateEnum
CREATE TYPE "CallPurpose" AS ENUM ('CALL', 'APPEAR', 'SPONSOR');

-- AlterTable
ALTER TABLE "CallBooking" ADD COLUMN     "purpose" "CallPurpose" NOT NULL DEFAULT 'CALL';
