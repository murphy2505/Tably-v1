/*
  Warnings:

  - You are about to drop the column `vatRateBps` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `vatRate` on the `ProductGroup` table. All the data in the column will be lost.
  - Made the column `categoryId` on table `Product` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";

-- DropIndex
DROP INDEX "RevenueGroup_tenantId_sortOrder_idx";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "defaultRevenueGroupId" TEXT,
ADD COLUMN     "defaultVatRateId" TEXT;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "vatRateBps",
ADD COLUMN     "revenueGroupId" TEXT,
ADD COLUMN     "vatRateId" TEXT,
ALTER COLUMN "categoryId" SET NOT NULL,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ProductGroup" DROP COLUMN "vatRate",
ADD COLUMN     "vatRateId" TEXT,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "RevenueGroup" ADD COLUMN     "code" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropEnum
DROP TYPE "VatRate";

-- CreateTable
CREATE TABLE "VatRate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VatRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VatRate_tenantId_isActive_sortOrder_idx" ON "VatRate"("tenantId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "Product_tenantId_revenueGroupId_idx" ON "Product"("tenantId", "revenueGroupId");

-- CreateIndex
CREATE INDEX "Product_tenantId_vatRateId_idx" ON "Product"("tenantId", "vatRateId");

-- CreateIndex
CREATE INDEX "RevenueGroup_tenantId_isActive_sortOrder_idx" ON "RevenueGroup"("tenantId", "isActive", "sortOrder");

-- AddForeignKey
ALTER TABLE "VatRate" ADD CONSTRAINT "VatRate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductGroup" ADD CONSTRAINT "ProductGroup_vatRateId_fkey" FOREIGN KEY ("vatRateId") REFERENCES "VatRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_defaultRevenueGroupId_fkey" FOREIGN KEY ("defaultRevenueGroupId") REFERENCES "RevenueGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_defaultVatRateId_fkey" FOREIGN KEY ("defaultVatRateId") REFERENCES "VatRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_revenueGroupId_fkey" FOREIGN KEY ("revenueGroupId") REFERENCES "RevenueGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_vatRateId_fkey" FOREIGN KEY ("vatRateId") REFERENCES "VatRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
