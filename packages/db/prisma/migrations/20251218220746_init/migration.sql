-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "draftIssuedAt" TIMESTAMP(3),
ADD COLUMN     "draftLabel" TEXT,
ADD COLUMN     "draftNo" INTEGER;

-- CreateTable
CREATE TABLE "OrderSequence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dateCode" TEXT NOT NULL,
    "nextSeq" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderSequence_tenantId_dateCode_key" ON "OrderSequence"("tenantId", "dateCode");

-- AddForeignKey
ALTER TABLE "OrderSequence" ADD CONSTRAINT "OrderSequence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
