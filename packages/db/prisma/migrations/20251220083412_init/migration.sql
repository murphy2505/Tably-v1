-- CreateEnum
CREATE TYPE "PrintKind" AS ENUM ('RECEIPT', 'QR_CARD', 'KITCHEN', 'BAR');

-- AlterTable
ALTER TABLE "Printer" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "PrintRoute" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" "PrintKind" NOT NULL,
    "printerId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintRoute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrintRoute_tenantId_idx" ON "PrintRoute"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PrintRoute_tenantId_kind_key" ON "PrintRoute"("tenantId", "kind");

-- AddForeignKey
ALTER TABLE "PrintRoute" ADD CONSTRAINT "PrintRoute_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
