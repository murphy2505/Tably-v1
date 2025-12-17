-- AlterTable
ALTER TABLE "MenuCardItem" ADD COLUMN     "vatRateId" TEXT;

-- AlterTable
ALTER TABLE "OrderLine" ADD COLUMN     "vatSource" TEXT NOT NULL DEFAULT 'PRODUCT';

-- AddForeignKey
ALTER TABLE "MenuCardItem" ADD CONSTRAINT "MenuCardItem_vatRateId_fkey" FOREIGN KEY ("vatRateId") REFERENCES "VatRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
