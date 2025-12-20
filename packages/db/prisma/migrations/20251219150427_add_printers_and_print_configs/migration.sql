-- CreateEnum
CREATE TYPE "PrinterDriver" AS ENUM ('ESC_POS_TCP', 'EPOS_HTTP', 'STARPRNT');

-- CreateEnum
CREATE TYPE "PrintTemplate" AS ENUM ('CUSTOMER_RECEIPT', 'KITCHEN_TICKET', 'QR_CARD');

-- CreateEnum
CREATE TYPE "PrintPlan" AS ENUM ('NEVER', 'ON_PAY', 'ON_SEND_TO_KDS', 'MANUAL');

-- CreateEnum
CREATE TYPE "PrintChannel" AS ENUM ('POS', 'WEB', 'TAKEAWAY', 'DELIVERY');

-- CreateTable
CREATE TABLE "Printer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "driver" "PrinterDriver" NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 9100,
    "httpUrl" TEXT,
    "paperWidth" INTEGER NOT NULL DEFAULT 80,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Printer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "template" "PrintTemplate" NOT NULL,
    "plan" "PrintPlan" NOT NULL DEFAULT 'MANUAL',
    "targetPrinters" TEXT[],
    "channels" "PrintChannel"[],
    "areas" TEXT[],
    "prepStations" TEXT[],
    "ignoreLinesWithoutPrepStation" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrintConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Printer_tenantId_isActive_idx" ON "Printer"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "PrintConfig_tenantId_isActive_idx" ON "PrintConfig"("tenantId", "isActive");

-- AddForeignKey
ALTER TABLE "Printer" ADD CONSTRAINT "Printer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintConfig" ADD CONSTRAINT "PrintConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
