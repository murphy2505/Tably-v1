import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getEnv(key: string, fallback?: string): string {
  const val = process.env[key];
  if (val && val.length > 0) return val;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing env ${key}`);
}

async function main() {
  const DEFAULT_TENANT_ID = getEnv("DEFAULT_TENANT_ID", "cafetaria-centrum");

  // Upsert tenant
  await prisma.tenant.upsert({
    where: { id: DEFAULT_TENANT_ID },
    update: {},
    create: { id: DEFAULT_TENANT_ID, name: "Cafetaria ’t Centrum" },
  });

  // Cleanup (idempotent)
  await prisma.menuItem.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });
  await prisma.menu.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });
  await prisma.course.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });

  await prisma.productVariant.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });
  await prisma.product.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });

  await prisma.category.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });
  await prisma.productGroup.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });
  await prisma.revenueGroup.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });
  await prisma.vatRate.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });
  await prisma.tenantSettings.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });
  await prisma.menuCardItem.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });
  await prisma.menuCardSchedule.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });
  await prisma.menuCard.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });
  await prisma.productModifierGroup.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });
  await prisma.modifierOption.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });
  await prisma.modifierGroup.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });

  // VatRates (seed idempotent via upsert)
  // 0% is used for emballage/statiegeld/doorbelasting.
  const vatZero = await prisma.vatRate.upsert({
    where: { id: `${DEFAULT_TENANT_ID}-VAT-0` },
    update: { name: "Geen BTW (0%)", rate: 0, sortOrder: 0, isActive: true },
    create: { id: `${DEFAULT_TENANT_ID}-VAT-0`, tenantId: DEFAULT_TENANT_ID, name: "Geen BTW (0%)", rate: 0, sortOrder: 0, isActive: true },
  });
  const vatLow = await prisma.vatRate.upsert({
    where: { id: `${DEFAULT_TENANT_ID}-VAT-9` },
    update: { name: "Laag (9%)", rate: 9, sortOrder: 1, isActive: true },
    create: { id: `${DEFAULT_TENANT_ID}-VAT-9`, tenantId: DEFAULT_TENANT_ID, name: "Laag (9%)", rate: 9, sortOrder: 1, isActive: true },
  });
  const vatHigh = await prisma.vatRate.upsert({
    where: { id: `${DEFAULT_TENANT_ID}-VAT-21` },
    update: { name: "Hoog (21%)", rate: 21, sortOrder: 2, isActive: true },
    create: { id: `${DEFAULT_TENANT_ID}-VAT-21`, tenantId: DEFAULT_TENANT_ID, name: "Hoog (21%)", rate: 21, sortOrder: 2, isActive: true },
  });

  // RevenueGroups (omzetgroepen)
  const rgFriet = await prisma.revenueGroup.create({
    data: { tenantId: DEFAULT_TENANT_ID, name: "Friet", code: "FRIET", sortOrder: 1, isActive: true },
  });
  const rgSnacks = await prisma.revenueGroup.create({
    data: { tenantId: DEFAULT_TENANT_ID, name: "Snacks", code: "SNACKS", sortOrder: 2, isActive: true },
  });
  const rgDrank = await prisma.revenueGroup.create({
    data: { tenantId: DEFAULT_TENANT_ID, name: "Dranken", code: "DRINKS", sortOrder: 3, isActive: true },
  });
  const rgOverig = await prisma.revenueGroup.create({
    data: { tenantId: DEFAULT_TENANT_ID, name: "Overig", code: "OTHER", sortOrder: 4, isActive: true },
  });

  // ProductGroups (defaults)
  const pgFriet = await prisma.productGroup.create({
    data: {
      tenantId: DEFAULT_TENANT_ID,
      name: "Friet",
      code: "FRIET",
      revenueGroupId: rgFriet.id,
      vatRateId: vatLow.id,
      sortOrder: 1,
      isActive: true,
    },
  });
  const pgSnacks = await prisma.productGroup.create({
    data: {
      tenantId: DEFAULT_TENANT_ID,
      name: "Snacks",
      code: "SNACKS",
      revenueGroupId: rgSnacks.id,
      vatRateId: vatLow.id,
      sortOrder: 2,
      isActive: true,
    },
  });
  const pgDrank = await prisma.productGroup.create({
    data: {
      tenantId: DEFAULT_TENANT_ID,
      name: "Dranken",
      code: "DRINKS",
      revenueGroupId: rgDrank.id,
      vatRateId: vatHigh.id,
      sortOrder: 3,
      isActive: true,
    },
  });
  const pgOverig = await prisma.productGroup.create({
    data: {
      tenantId: DEFAULT_TENANT_ID,
      name: "Overig",
      code: "OTHER",
      revenueGroupId: rgOverig.id,
      vatRateId: vatHigh.id,
      sortOrder: 4,
      isActive: true,
    },
  });

  // Categories with defaults
  const catFriet = await prisma.category.create({
    data: {
      tenantId: DEFAULT_TENANT_ID,
      name: "Friet",
      sortOrder: 1,
      isActive: true,
      defaultRevenueGroupId: rgFriet.id,
      defaultVatRateId: vatLow.id,
    },
  });
  const catSnacks = await prisma.category.create({
    data: {
      tenantId: DEFAULT_TENANT_ID,
      name: "Snacks",
      sortOrder: 2,
      isActive: true,
      defaultRevenueGroupId: rgSnacks.id,
      defaultVatRateId: vatLow.id,
    },
  });
  const catDrank = await prisma.category.create({
    data: {
      tenantId: DEFAULT_TENANT_ID,
      name: "Frisdranken",
      sortOrder: 3,
      isActive: true,
      defaultRevenueGroupId: rgDrank.id,
      defaultVatRateId: vatHigh.id,
    },
  });
  const catCocktails = await prisma.category.create({
    data: {
      tenantId: DEFAULT_TENANT_ID,
      name: "Cocktails",
      sortOrder: 4,
      isActive: true,
      defaultRevenueGroupId: rgDrank.id,
      defaultVatRateId: vatHigh.id,
    },
  });

  // Products (explicit overrides set for predictable demo data)
  const pFriet = await prisma.product.create({
    data: {
      tenantId: DEFAULT_TENANT_ID,
      productGroupId: pgFriet.id,
      categoryId: catFriet.id,
      name: "Friet",
      description: "Heerlijke friet",
      basePriceCents: 250,
      vatRateId: vatLow.id,
      revenueGroupId: rgFriet.id,
      isActive: true,
    },
  });

  const pFrikandel = await prisma.product.create({
    data: {
      tenantId: DEFAULT_TENANT_ID,
      productGroupId: pgSnacks.id,
      categoryId: catSnacks.id,
      name: "Frikandel",
      description: "Klassieke snack",
      basePriceCents: 250,
      vatRateId: vatLow.id,
      revenueGroupId: rgSnacks.id,
      isActive: true,
    },
  });

  const pCola = await prisma.product.create({
    data: {
      tenantId: DEFAULT_TENANT_ID,
      productGroupId: pgDrank.id,
      categoryId: catDrank.id,
      name: "Cola",
      description: "Verfrissende drank",
      basePriceCents: 250,
      vatRateId: vatHigh.id,
      revenueGroupId: rgDrank.id,
      isActive: true,
    },
  });

  // Variants (no priceOverrideCents in Step 1 schema)
  const vFrietK = await prisma.productVariant.create({
    data: { tenantId: DEFAULT_TENANT_ID, productId: pFriet.id, name: "Klein", sortOrder: 1, isActive: true },
  });
  const vFrietM = await prisma.productVariant.create({
    data: { tenantId: DEFAULT_TENANT_ID, productId: pFriet.id, name: "Middel", sortOrder: 2, isActive: true },
  });
  const vFrietG = await prisma.productVariant.create({
    data: { tenantId: DEFAULT_TENANT_ID, productId: pFriet.id, name: "Groot", sortOrder: 3, isActive: true },
  });

  const vFrik = await prisma.productVariant.create({
    data: { tenantId: DEFAULT_TENANT_ID, productId: pFrikandel.id, name: "Standaard", sortOrder: 1, isActive: true },
  });

  const vCola33 = await prisma.productVariant.create({
    data: { tenantId: DEFAULT_TENANT_ID, productId: pCola.id, name: "33cl", sortOrder: 1, isActive: true },
  });

  // Menu
  const menu = await prisma.menu.create({
    data: {
      tenantId: DEFAULT_TENANT_ID,
      name: "Kassa basis",
      slug: "kassa-basis",
      channel: "BOTH",
      layoutType: "GRID",
      columns: 4,
      isActive: true,
      sortOrder: 1,
    },
  });

  // Courses
  const cSnacks = await prisma.course.create({
    data: { tenantId: DEFAULT_TENANT_ID, name: "Snacks", shortLabel: "Snacks", sortOrder: 1, isActive: true },
  });
  const cDrank = await prisma.course.create({
    data: { tenantId: DEFAULT_TENANT_ID, name: "Drank", shortLabel: "Drank", sortOrder: 2, isActive: true },
  });

  // Menu items: variants as tiles
  const itemsData = [
    { productId: pFriet.id, variantId: vFrietK.id, sortOrder: 1, courseId: cSnacks.id },
    { productId: pFriet.id, variantId: vFrietM.id, sortOrder: 2, courseId: cSnacks.id },
    { productId: pFriet.id, variantId: vFrietG.id, sortOrder: 3, courseId: cSnacks.id },
    { productId: pFrikandel.id, variantId: vFrik.id, sortOrder: 4, courseId: cSnacks.id },
    { productId: pCola.id, variantId: vCola33.id, sortOrder: 5, courseId: cDrank.id },
  ];

  for (const item of itemsData) {
    await prisma.menuItem.create({
      data: {
        tenantId: DEFAULT_TENANT_ID,
        menuId: menu.id,
        productId: item.productId,
        variantId: item.variantId,
        sortOrder: item.sortOrder,
        isActive: true,
        courseId: item.courseId,
      },
    });
  }

  // MenuCard: Standaard (BOTH), no schedules -> always active
  const card = await prisma.menuCard.create({
    data: {
      tenantId: DEFAULT_TENANT_ID,
      name: "Standaard",
      channel: "BOTH",
      sortOrder: 1,
      isActive: true,
    },
  });
  for (const it of itemsData) {
    await prisma.menuCardItem.create({
      data: {
        tenantId: DEFAULT_TENANT_ID,
        menuCardId: card.id,
        productId: it.productId,
        variantId: it.variantId,
        sortOrder: it.sortOrder,
      },
    });
  }

  // Modifiers: Sauzen group with options (idempotent), attach to all Friet sizes (MenuCardItems)
  const grpSauzen = await prisma.modifierGroup.upsert({
    where: { id: `${DEFAULT_TENANT_ID}-grp-sauzen` },
    update: { name: "Sauzen", minSelect: 1, maxSelect: 1, isActive: true, sortOrder: 1 },
    create: { id: `${DEFAULT_TENANT_ID}-grp-sauzen`, tenantId: DEFAULT_TENANT_ID, name: "Sauzen", minSelect: 1, maxSelect: 1, sortOrder: 1, isActive: true },
  });
  await prisma.modifierOption.upsert({
    where: { id: `${DEFAULT_TENANT_ID}-opt-mayo` },
    update: { name: "Mayo", priceDeltaCents: 0, isActive: true, sortOrder: 1, groupId: grpSauzen.id, tenantId: DEFAULT_TENANT_ID },
    create: { id: `${DEFAULT_TENANT_ID}-opt-mayo`, tenantId: DEFAULT_TENANT_ID, groupId: grpSauzen.id, name: "Mayo", priceDeltaCents: 0, sortOrder: 1, isActive: true },
  });
  await prisma.modifierOption.upsert({
    where: { id: `${DEFAULT_TENANT_ID}-opt-curry` },
    update: { name: "Curry", priceDeltaCents: 0, isActive: true, sortOrder: 2, groupId: grpSauzen.id, tenantId: DEFAULT_TENANT_ID },
    create: { id: `${DEFAULT_TENANT_ID}-opt-curry`, tenantId: DEFAULT_TENANT_ID, groupId: grpSauzen.id, name: "Curry", priceDeltaCents: 0, sortOrder: 2, isActive: true },
  });
  await prisma.modifierOption.upsert({
    where: { id: `${DEFAULT_TENANT_ID}-opt-joppie` },
    update: { name: "Joppie", priceDeltaCents: 50, isActive: true, sortOrder: 3, groupId: grpSauzen.id, tenantId: DEFAULT_TENANT_ID },
    create: { id: `${DEFAULT_TENANT_ID}-opt-joppie`, tenantId: DEFAULT_TENANT_ID, groupId: grpSauzen.id, name: "Joppie", priceDeltaCents: 50, sortOrder: 3, isActive: true },
  });

  // Find MenuCardItems for Friet sizes
  const frietItems = await prisma.menuCardItem.findMany({
    where: { tenantId: DEFAULT_TENANT_ID, menuCardId: card.id, productId: pFriet.id, variantId: { in: [vFrietK.id, vFrietM.id, vFrietG.id] } },
    orderBy: { sortOrder: "asc" },
  });
  const attachedLabels: string[] = [];
  for (const it of frietItems) {
    // Ensure idempotent link: unique by (tenantId, menuCardItemId, groupId)
    const uniqueKey = { tenantId_menuCardItemId_groupId: { tenantId: DEFAULT_TENANT_ID, menuCardItemId: it.id, groupId: grpSauzen.id } } as any;
    const existingLink = await prisma.menuCardItemModifierGroup.findUnique({ where: uniqueKey });
    if (!existingLink) {
      await prisma.menuCardItemModifierGroup.create({
        data: {
          tenantId: DEFAULT_TENANT_ID,
          menuCardItemId: it.id,
          groupId: grpSauzen.id,
          sortOrder: 1,
          isActive: true,
          minSelectOverride: null,
          maxSelectOverride: null,
        },
      });
    }
    // Determine human label based on variant
    let label = "Friet";
    if (it.variantId === vFrietK.id) label = "Friet Klein";
    else if (it.variantId === vFrietM.id) label = "Friet Middel";
    else if (it.variantId === vFrietG.id) label = "Friet Groot";
    attachedLabels.push(label);
  }
  console.log(`Attached Sauzen to: ${attachedLabels.join(", ")}`);

  console.log("Seed complete for tenant:", DEFAULT_TENANT_ID);

  // Webshop tenant settings default: simple hours, no closures
  const openingHours = {
    days: {
      "0": [{ start: "11:30", end: "20:00" }],
      "1": [{ start: "11:30", end: "20:00" }],
      "2": [{ start: "11:30", end: "20:00" }],
      "3": [{ start: "11:30", end: "20:00" }],
      "4": [{ start: "11:30", end: "21:00" }],
      "5": [{ start: "11:30", end: "21:00" }],
      "6": [{ start: "11:30", end: "21:00" }],
    },
  } as any;
  await prisma.tenantSettings.create({
    data: {
      tenantId: DEFAULT_TENANT_ID,
      webshopEnabled: true,
      webshopTimezone: "Europe/Amsterdam",
      openingHours,
      closures: [],
      messageClosed: "Momenteel gesloten",
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
