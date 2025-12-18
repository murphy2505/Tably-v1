-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "receiptIssuedAt" TIMESTAMP(3),
ADD COLUMN     "receiptLabel" TEXT,
ADD COLUMN     "receiptNo" INTEGER;

-- AlterTable
ALTER TABLE "TenantSettings" ADD COLUMN     "receiptPrefix" TEXT;

-- CreateTable
CREATE TABLE "ReceiptSequence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dateCode" TEXT NOT NULL,
    "nextSeq" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptSequence_tenantId_dateCode_key" ON "ReceiptSequence"("tenantId", "dateCode");

-- AddForeignKey
ALTER TABLE "ReceiptSequence" ADD CONSTRAINT "ReceiptSequence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
