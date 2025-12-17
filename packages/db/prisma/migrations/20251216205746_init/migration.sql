-- CreateTable
CREATE TABLE "MenuCardItemModifierGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "menuCardItemId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "minSelectOverride" INTEGER,
    "maxSelectOverride" INTEGER,

    CONSTRAINT "MenuCardItemModifierGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MenuCardItemModifierGroup_tenantId_menuCardItemId_isActive__idx" ON "MenuCardItemModifierGroup"("tenantId", "menuCardItemId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MenuCardItemModifierGroup_tenantId_menuCardItemId_groupId_key" ON "MenuCardItemModifierGroup"("tenantId", "menuCardItemId", "groupId");

-- AddForeignKey
ALTER TABLE "MenuCardItemModifierGroup" ADD CONSTRAINT "MenuCardItemModifierGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuCardItemModifierGroup" ADD CONSTRAINT "MenuCardItemModifierGroup_menuCardItemId_fkey" FOREIGN KEY ("menuCardItemId") REFERENCES "MenuCardItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuCardItemModifierGroup" ADD CONSTRAINT "MenuCardItemModifierGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
