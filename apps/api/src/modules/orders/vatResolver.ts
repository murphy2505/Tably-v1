import { prisma } from "../../lib/prisma";

export type VatSource = "MENUITEM" | "PRODUCT" | "TENANT";

export async function resolveVatRateForOrderLine(params: { tenantId: string; productId: string; menuItemId?: string | null }): Promise<{ vatRateId: string | null; vatRateBps: number; source: VatSource }> {
  const { tenantId, productId, menuItemId } = params;

  // 1) Menu item override (MenuCardItem)
  if (menuItemId) {
    const mci = await prisma.menuCardItem.findFirst({ where: { id: menuItemId, tenantId }, include: { vatRate: true } });
    if (mci?.vatRate?.rate != null) {
      return { vatRateId: mci.vatRate.id, vatRateBps: mci.vatRate.rate * 100, source: "MENUITEM" };
    }
  }

  // 2) Product VAT (leading)
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId }, include: { vatRate: true } });
  if (product?.vatRate?.rate != null) {
    return { vatRateId: product.vatRate.id, vatRateBps: product.vatRate.rate * 100, source: "PRODUCT" };
  }

  // 3) Tenant default: pick 21% if available else any active
  const defaultVat = await prisma.vatRate.findFirst({ where: { tenantId, isActive: true, rate: 21 } })
    || await prisma.vatRate.findFirst({ where: { tenantId, isActive: true }, orderBy: { sortOrder: "asc" } });
  const bps = (defaultVat?.rate ?? 21) * 100;
  return { vatRateId: defaultVat?.id ?? null, vatRateBps: bps, source: "TENANT" };
}
