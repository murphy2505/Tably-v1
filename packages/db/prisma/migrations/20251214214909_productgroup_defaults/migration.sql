/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,name]` on the table `ProductGroup` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `ProductGroup` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VatRate" AS ENUM ('HIGH', 'LOW', 'ZERO');

-- DropForeignKey
ALTER TABLE "ProductGroup" DROP CONSTRAINT "ProductGroup_revenueGroupId_fkey";

-- DropIndex
DROP INDEX "ProductGroup_tenantId_revenueGroupId_idx";

-- AlterTable
ALTER TABLE "ProductGroup" ADD COLUMN     "code" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "vatRate" "VatRate" NOT NULL DEFAULT 'HIGH',
ALTER COLUMN "revenueGroupId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ProductGroup_tenantId_name_idx" ON "ProductGroup"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductGroup_tenantId_name_key" ON "ProductGroup"("tenantId", "name");

-- AddForeignKey
ALTER TABLE "ProductGroup" ADD CONSTRAINT "ProductGroup_revenueGroupId_fkey" FOREIGN KEY ("revenueGroupId") REFERENCES "RevenueGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
