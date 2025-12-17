-- CreateEnum
CREATE TYPE "MenuChannel" AS ENUM ('POS', 'WEB', 'BOTH');

-- AlterTable
ALTER TABLE "OrderLine" ADD COLUMN     "modifiers" JSONB;

-- CreateTable
CREATE TABLE "ModifierGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minSelect" INTEGER NOT NULL DEFAULT 0,
    "maxSelect" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModifierGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModifierOption" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceDeltaCents" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ModifierOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductModifierGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductModifierGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuCard" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "MenuChannel" NOT NULL DEFAULT 'BOTH',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuCardSchedule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "menuCardId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "MenuCardSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuCardItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "menuCardId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MenuCardItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "webshopEnabled" BOOLEAN NOT NULL DEFAULT true,
    "webshopTimezone" TEXT NOT NULL DEFAULT 'Europe/Amsterdam',
    "openingHours" JSONB NOT NULL,
    "closures" JSONB NOT NULL,
    "messageClosed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModifierGroup_tenantId_isActive_sortOrder_idx" ON "ModifierGroup"("tenantId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "ModifierOption_tenantId_groupId_isActive_sortOrder_idx" ON "ModifierOption"("tenantId", "groupId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductModifierGroup_tenantId_productId_sortOrder_idx" ON "ProductModifierGroup"("tenantId", "productId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProductModifierGroup_tenantId_productId_groupId_key" ON "ProductModifierGroup"("tenantId", "productId", "groupId");

-- CreateIndex
CREATE INDEX "MenuCard_tenantId_isActive_sortOrder_idx" ON "MenuCard"("tenantId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "MenuCardSchedule_tenantId_menuCardId_enabled_dayOfWeek_idx" ON "MenuCardSchedule"("tenantId", "menuCardId", "enabled", "dayOfWeek");

-- CreateIndex
CREATE INDEX "MenuCardItem_tenantId_menuCardId_sortOrder_idx" ON "MenuCardItem"("tenantId", "menuCardId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TenantSettings_tenantId_key" ON "TenantSettings"("tenantId");

-- AddForeignKey
ALTER TABLE "ModifierGroup" ADD CONSTRAINT "ModifierGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModifierOption" ADD CONSTRAINT "ModifierOption_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModifierOption" ADD CONSTRAINT "ModifierOption_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductModifierGroup" ADD CONSTRAINT "ProductModifierGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductModifierGroup" ADD CONSTRAINT "ProductModifierGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductModifierGroup" ADD CONSTRAINT "ProductModifierGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuCard" ADD CONSTRAINT "MenuCard_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuCardSchedule" ADD CONSTRAINT "MenuCardSchedule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuCardSchedule" ADD CONSTRAINT "MenuCardSchedule_menuCardId_fkey" FOREIGN KEY ("menuCardId") REFERENCES "MenuCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuCardItem" ADD CONSTRAINT "MenuCardItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuCardItem" ADD CONSTRAINT "MenuCardItem_menuCardId_fkey" FOREIGN KEY ("menuCardId") REFERENCES "MenuCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuCardItem" ADD CONSTRAINT "MenuCardItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuCardItem" ADD CONSTRAINT "MenuCardItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSettings" ADD CONSTRAINT "TenantSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
