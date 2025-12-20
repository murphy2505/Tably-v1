-- CreateEnum
CREATE TYPE "OrderKind" AS ENUM ('QUICK', 'TRACKED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'PARKED';
ALTER TYPE "OrderStatus" ADD VALUE 'VOIDED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "kind" "OrderKind" NOT NULL DEFAULT 'QUICK',
ADD COLUMN     "voidReason" TEXT;

-- CreateIndex
CREATE INDEX "Order_updatedAt_idx" ON "Order"("updatedAt");
