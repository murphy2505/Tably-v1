-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "subtotalExclVatCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalInclVatCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "vatBreakdown" JSONB;

-- AlterTable
ALTER TABLE "OrderLine" ADD COLUMN     "vatRateBps" INTEGER NOT NULL DEFAULT 2100;
