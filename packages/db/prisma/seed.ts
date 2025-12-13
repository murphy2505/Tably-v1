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
    create: { id: DEFAULT_TENANT_ID, name: "Cafetaria ’t Centrum" }
  });

  // Cleanup scoped data to ensure idempotent seed for demo
  await prisma.menuItem.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });
  await prisma.productVariant.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });
  await prisma.product.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });
  await prisma.category.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });
  await prisma.productGroup.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });
  await prisma.revenueGroup.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });
  await prisma.course.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });
  await prisma.menu.deleteMany({ where: { tenantId: DEFAULT_TENANT_ID } });

  // RevenueGroups
  const rgFriet = await prisma.revenueGroup.create({ data: { tenantId: DEFAULT_TENANT_ID, name: "Friet", sortOrder: 1 } });
  const rgSnacks = await prisma.revenueGroup.create({ data: { tenantId: DEFAULT_TENANT_ID, name: "Snacks", sortOrder: 2 } });
  const rgDrank = await prisma.revenueGroup.create({ data: { tenantId: DEFAULT_TENANT_ID, name: "Drank", sortOrder: 3 } });

  // ProductGroups
  const pgFriet = await prisma.productGroup.create({ data: { tenantId: DEFAULT_TENANT_ID, name: "Friet basis", revenueGroupId: rgFriet.id, sortOrder: 1 } });
  const pgSnacks = await prisma.productGroup.create({ data: { tenantId: DEFAULT_TENANT_ID, name: "Snacks basis", revenueGroupId: rgSnacks.id, sortOrder: 2 } });
  const pgDrank = await prisma.productGroup.create({ data: { tenantId: DEFAULT_TENANT_ID, name: "Drank basis", revenueGroupId: rgDrank.id, sortOrder: 3 } });

  // Categories
  const catFriet = await prisma.category.create({ data: { tenantId: DEFAULT_TENANT_ID, name: "Friet", sortOrder: 1 } });
  const catSnacks = await prisma.category.create({ data: { tenantId: DEFAULT_TENANT_ID, name: "Snacks", sortOrder: 2 } });
  const catDrank = await prisma.category.create({ data: { tenantId: DEFAULT_TENANT_ID, name: "Drank", sortOrder: 3 } });

  // Products
  const pFriet = await prisma.product.create({
    data: {
      tenantId: DEFAULT_TENANT_ID,
      productGroupId: pgFriet.id,
      categoryId: catFriet.id,
      name: "Friet",
      description: "Heerlijke friet",
      basePriceCents: 250,
      vatRateBps: 900,
      isActive: true
    }
  });
  const pFrikandel = await prisma.product.create({
    data: {
      tenantId: DEFAULT_TENANT_ID,
      productGroupId: pgSnacks.id,
      categoryId: catSnacks.id,
      name: "Frikandel",
      description: "Klassieke snack",
      basePriceCents: 250,
      vatRateBps: 900,
      isActive: true
    }
  });
  const pCola = await prisma.product.create({
    data: {
      tenantId: DEFAULT_TENANT_ID,
      productGroupId: pgDrank.id,
      categoryId: catDrank.id,
      name: "Cola",
      description: "Verfrissende drank",
      basePriceCents: 250,
      vatRateBps: 900,
      isActive: true
    }
  });

  // Variants
  const vFrietK = await prisma.productVariant.create({ data: { tenantId: DEFAULT_TENANT_ID, productId: pFriet.id, name: "Klein", priceOverrideCents: 250, sortOrder: 1 } });
  const vFrietM = await prisma.productVariant.create({ data: { tenantId: DEFAULT_TENANT_ID, productId: pFriet.id, name: "Middel", priceOverrideCents: 300, sortOrder: 2 } });
  const vFrietG = await prisma.productVariant.create({ data: { tenantId: DEFAULT_TENANT_ID, productId: pFriet.id, name: "Groot", priceOverrideCents: 350, sortOrder: 3 } });

  const vFrik = await prisma.productVariant.create({ data: { tenantId: DEFAULT_TENANT_ID, productId: pFrikandel.id, name: "Standaard", priceOverrideCents: 250, sortOrder: 1 } });
  const vCola33 = await prisma.productVariant.create({ data: { tenantId: DEFAULT_TENANT_ID, productId: pCola.id, name: "33cl", priceOverrideCents: 250, sortOrder: 1 } });

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
      sortOrder: 1
    }
  });

  // Courses (optional but created)
  const cSnacks = await prisma.course.create({ data: { tenantId: DEFAULT_TENANT_ID, name: "Snacks", shortLabel: "Snacks", sortOrder: 1 } });
  const cDrank = await prisma.course.create({ data: { tenantId: DEFAULT_TENANT_ID, name: "Drank", shortLabel: "Drank", sortOrder: 2 } });

  // Menu items: add variants as tiles
  const itemsData = [
    { productId: pFriet.id, variantId: vFrietK.id, sortOrder: 1 },
    { productId: pFriet.id, variantId: vFrietM.id, sortOrder: 2 },
    { productId: pFriet.id, variantId: vFrietG.id, sortOrder: 3 },
    { productId: pFrikandel.id, variantId: vFrik.id, sortOrder: 4 },
    { productId: pCola.id, variantId: vCola33.id, sortOrder: 5 }
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
        courseId: item.productId === pCola.id ? cDrank.id : cSnacks.id
      }
    });
  }

  console.log("Seed complete for tenant:", DEFAULT_TENANT_ID);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
