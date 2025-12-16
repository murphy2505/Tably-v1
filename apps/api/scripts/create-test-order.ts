import { prisma } from "../src/lib/prisma";

async function main() {
  const tenantId = process.env.DEFAULT_TENANT_ID || "cafetaria-centrum";
  const order = await prisma.order.create({
    data: {
      tenantId,
      status: "OPEN" as any,
      lines: {
        create: [
          { tenantId, title: "Koffie", qty: 2, priceCents: 250 },
          { tenantId, title: "Appeltaart", qty: 1, priceCents: 350 },
        ],
      },
    },
    include: { lines: true },
  });
  console.log("created order", order.id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});