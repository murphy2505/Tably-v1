import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { getTenantIdFromRequest } from "../../tenant";
import { notFound } from "../../lib/http";

// ===============================
// Shared list parsing / utilities
// ===============================
function parseIsActive(req: Request): boolean | undefined {
  const v = req.query.isActive as string | undefined;
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

function parseOrder(
  req: Request,
  allowedFields: string[],
  defaultField: string
): { field: string; order: "asc" | "desc" } {
  const orderByQ = req.query.orderBy as string | undefined;
  const orderQ = (req.query.order as string | undefined) === "desc" ? "desc" : "asc";
  const field = allowedFields.includes(orderByQ || "") ? (orderByQ as string) : defaultField;
  return { field, order: orderQ };
}

function validationError(
  res: Response,
  details: Array<{ path: (string | number)[]; message: string }>
) {
  return res.status(400).json({ error: { message: "VALIDATION_ERROR", details } });
}

// ===============================
// Revenue Groups
// ===============================
export async function listRevenueGroups(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const isActive = parseIsActive(req);
    const { field, order } = parseOrder(req, ["sortOrder", "name"], "sortOrder");

    const where: any = { tenantId };
    if (isActive !== undefined) where.isActive = isActive;

    const data = await prisma.revenueGroup.findMany({
      where,
      orderBy: { [field]: order } as any,
    });

    return res.json({ data });
  } catch (err) {
    console.error("listRevenueGroups error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

export async function createRevenueGroup(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);

    if (!req.body?.name || typeof req.body.name !== "string") {
      return validationError(res, [{ path: ["name"], message: "Required" }]);
    }

    const rg = await prisma.revenueGroup.create({
      data: {
        tenantId,
        name: req.body.name,
        sortOrder: req.body.sortOrder ?? 0,
        isActive: req.body.isActive ?? true,
      },
    });

    return res.json({ data: rg });
  } catch (err) {
    console.error("createRevenueGroup error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

export async function updateRevenueGroup(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const id = req.params.id;

    const existing = await prisma.revenueGroup.findFirst({ where: { id, tenantId } });
    if (!existing) return notFound(res);

    const rg = await prisma.revenueGroup.update({
      where: { id },
      data: {
        name: req.body.name ?? existing.name,
        sortOrder: req.body.sortOrder ?? existing.sortOrder,
        isActive: req.body.isActive ?? existing.isActive,
      },
    });

    return res.json({ data: rg });
  } catch (err) {
    console.error("updateRevenueGroup error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

export async function deleteRevenueGroup(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const id = req.params.id;

    const existing = await prisma.revenueGroup.findFirst({ where: { id, tenantId } });
    if (!existing) return notFound(res);

    const rg = await prisma.revenueGroup.delete({ where: { id } });
    return res.json({ data: rg });
  } catch (err) {
    console.error("deleteRevenueGroup error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

// ===============================
// VAT RATES
// ===============================
export async function listVatRates(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const data = await prisma.vatRate.findMany({
      where: { tenantId, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, rate: true }, // rate vs rateBps checken
    });
    return res.json({ data });
  } catch (err) {
    console.error("listVatRates error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

// ===============================
// Product Groups
// ===============================
export async function listProductGroups(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const isActive = parseIsActive(req);
    const { field, order } = parseOrder(req, ["sortOrder", "name"], "sortOrder");

    const where: any = { tenantId };
    if (isActive !== undefined) where.isActive = isActive;

    const data = await prisma.productGroup.findMany({
      where,
      orderBy: { [field]: order } as any,
      select: {
        id: true,
        name: true,
        code: true,
        vatRateId: true,
        revenueGroupId: true,
        sortOrder: true,
        isActive: true,
        vatRate: { select: { id: true, name: true, rate: true } }, // rate vs rateBps checken
      },
    });

    return res.json({ data });
  } catch (err) {
    console.error("listProductGroups error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

export async function createProductGroup(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);

    if (!req.body?.name || typeof req.body.name !== "string") {
      return validationError(res, [{ path: ["name"], message: "Required" }]);
    }

    const pg = await prisma.productGroup.create({
      data: {
        tenantId,
        name: req.body.name,
        code: req.body.code ?? null,
        vatRateId: req.body.vatRateId ?? null,
        revenueGroupId: req.body.revenueGroupId ?? null,
        sortOrder: req.body.sortOrder ?? 0,
        isActive: req.body.isActive ?? true,
      },
    });

    return res.json({ data: pg });
  } catch (err) {
    console.error("createProductGroup error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

export async function updateProductGroup(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const id = req.params.id;

    const existing = await prisma.productGroup.findFirst({ where: { id, tenantId } });
    if (!existing) return notFound(res);

    const pg = await prisma.productGroup.update({
      where: { id },
      data: {
        name: req.body.name ?? existing.name,
        code: req.body.code ?? existing.code,
        vatRateId: req.body.vatRateId ?? existing.vatRateId,
        revenueGroupId: req.body.revenueGroupId ?? existing.revenueGroupId,
        sortOrder: req.body.sortOrder ?? existing.sortOrder,
        isActive: req.body.isActive ?? existing.isActive,
      },
    });

    return res.json({ data: pg });
  } catch (err) {
    console.error("updateProductGroup error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

export async function deleteProductGroup(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const id = req.params.id;

    const existing = await prisma.productGroup.findFirst({ where: { id, tenantId } });
    if (!existing) return notFound(res);

    const count = await prisma.product.count({ where: { tenantId, productGroupId: id } });
    if (count > 0) {
      return res.status(409).json({
        error: "Productgroep kan niet verwijderd worden: er zijn gekoppelde producten.",
      });
    }

    const pg = await prisma.productGroup.delete({ where: { id } });
    return res.json({ data: pg });
  } catch (err) {
    console.error("deleteProductGroup error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

// ===============================
// Categories
// ===============================
export async function listCategories(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const isActive = parseIsActive(req);
    const { field, order } = parseOrder(req, ["sortOrder", "name"], "sortOrder");

    const where: any = { tenantId };
    if (isActive !== undefined) where.isActive = isActive;

    const data = await prisma.category.findMany({
      where,
      orderBy: { [field]: order } as any,
      select: {
        id: true,
        tenantId: true,
        name: true,
        sortOrder: true,
        isActive: true,
        defaultVatRateId: true,
        defaultVatRate: { select: { id: true, name: true, rate: true } }, // rate vs rateBps checken
      },
    });

    return res.json({ data });
  } catch (err) {
    console.error("listCategories error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

export async function createCategory(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);

    if (!req.body?.name || typeof req.body.name !== "string") {
      return validationError(res, [{ path: ["name"], message: "Required" }]);
    }

    const cat = await prisma.category.create({
      data: {
        tenantId,
        name: req.body.name,
        defaultVatRateId: req.body.defaultVatRateId ?? null,
        sortOrder: req.body.sortOrder ?? 0,
        isActive: req.body.isActive ?? true,
      },
    });

    return res.json({ data: cat });
  } catch (err) {
    console.error("createCategory error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

export async function updateCategory(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const id = req.params.id;

    const existing = await prisma.category.findFirst({ where: { id, tenantId } });
    if (!existing) return notFound(res);

    const cat = await prisma.category.update({
      where: { id },
      data: {
        name: req.body.name ?? existing.name,
        defaultVatRateId: req.body.defaultVatRateId ?? existing.defaultVatRateId,
        sortOrder: req.body.sortOrder ?? existing.sortOrder,
        isActive: req.body.isActive ?? existing.isActive,
      },
    });

    return res.json({ data: cat });
  } catch (err) {
    console.error("updateCategory error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

export async function deleteCategory(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const id = req.params.id;

    const existing = await prisma.category.findFirst({ where: { id, tenantId } });
    if (!existing) return notFound(res);

    const count = await prisma.product.count({ where: { tenantId, categoryId: id } });
    if (count > 0) return res.status(409).json({ error: "Categorie heeft gekoppelde producten" });

    const cat = await prisma.category.delete({ where: { id } });
    return res.json({ data: cat });
  } catch (err) {
    console.error("deleteCategory error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

// ===============================
// Products
// ===============================
export async function listProducts(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);

    const isActive = parseIsActive(req);
    const { field, order } = parseOrder(req, ["name", "createdAt"], "createdAt");

    const where: any = { tenantId };
    if (isActive !== undefined) where.isActive = isActive;

    const data = await prisma.product.findMany({
      where,
      orderBy: { [field]: order } as any,
      include: {
        productGroup: { select: { id: true, name: true, code: true } },
        category: { select: { id: true, name: true } },
        vatRate: { select: { id: true, name: true, rate: true } }, // rate vs rateBps checken
      },
    });

    return res.json({ data });
  } catch (err) {
    console.error("listProducts error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

export async function getProduct(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const id = req.params.id;

    const item = await prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        productGroup: { select: { id: true, name: true, code: true } },
        category: { select: { id: true, name: true } },
        vatRate: { select: { id: true, name: true, rate: true } }, // rate vs rateBps checken
        variants: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!item) return notFound(res);
    return res.json({ data: item });
  } catch (err) {
    console.error("getProduct error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

export async function createProduct(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);

    const details: Array<{ path: (string | number)[]; message: string }> = [];
    if (!req.body?.name) details.push({ path: ["name"], message: "Required" });
    if (!req.body?.productGroupId) details.push({ path: ["productGroupId"], message: "Required" });
    if (!req.body?.categoryId) details.push({ path: ["categoryId"], message: "Required" });
    if (typeof req.body?.basePriceCents !== "number" || !Number.isFinite(req.body.basePriceCents)) {
      details.push({ path: ["basePriceCents"], message: "Required" });
    }
    if (details.length) return validationError(res, details);

    // Determine default VAT rate (21%) when none provided
    let vatRateId: string | null = req.body.vatRateId ?? null;
    if (!vatRateId) {
      const defaultVat = await prisma.vatRate.findFirst({ where: { tenantId, isActive: true, rate: 21 }, select: { id: true } });
      vatRateId = defaultVat?.id ?? null;
    } else {
      // Validate provided vatRateId belongs to tenant
      const vr = await prisma.vatRate.findFirst({ where: { id: vatRateId, tenantId }, select: { id: true } });
      if (!vr) return validationError(res, [{ path: ["vatRateId"], message: "Onbekend BTW-tarief voor deze tenant" }]);
    }

    const prod = await prisma.product.create({
      data: {
        tenantId,
        productGroupId: req.body.productGroupId,
        categoryId: req.body.categoryId,
        name: req.body.name,
        description: req.body.description ?? null,
        basePriceCents: req.body.basePriceCents,
        vatRateId,
        imageUrl: req.body.imageUrl ?? null,
        allergenTags: req.body.allergenTags ?? null,
        isActive: req.body.isActive ?? true,
      },
    });

    return res.json({ data: prod });
  } catch (err) {
    console.error("createProduct error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

export async function updateProduct(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const id = req.params.id;

    const existing = await prisma.product.findFirst({ where: { id, tenantId } });
    if (!existing) return notFound(res);

    if (req.body.productGroupId) {
      const pg = await prisma.productGroup.findFirst({
        where: { id: req.body.productGroupId, tenantId },
      });
      if (!pg) return notFound(res);
    }

    // Validate selected vatRate if provided
    if (req.body.vatRateId) {
      const vr = await prisma.vatRate.findFirst({ where: { id: req.body.vatRateId, tenantId }, select: { id: true } });
      if (!vr) return validationError(res, [{ path: ["vatRateId"], message: "Onbekend BTW-tarief voor deze tenant" }]);
    }

    const prod = await prisma.product.update({
      where: { id },
      data: {
        productGroupId: req.body.productGroupId ?? existing.productGroupId,
        categoryId: req.body.categoryId ?? existing.categoryId,
        name: req.body.name ?? existing.name,
        description: req.body.description ?? existing.description,
        basePriceCents: req.body.basePriceCents ?? existing.basePriceCents,
        vatRateId: req.body.vatRateId ?? existing.vatRateId,
        imageUrl: req.body.imageUrl ?? existing.imageUrl,
        allergenTags: req.body.allergenTags ?? existing.allergenTags,
        isActive: req.body.isActive ?? existing.isActive,
      },
    });

    return res.json({ data: prod });
  } catch (err) {
    console.error("updateProduct error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

export async function deleteProduct(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const id = req.params.id;

    const existing = await prisma.product.findFirst({ where: { id, tenantId } });
    if (!existing) return notFound(res);

    const prod = await prisma.product.delete({ where: { id } });
    return res.json({ data: prod });
  } catch (err) {
    console.error("deleteProduct error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

// ===============================
// Variants
// ===============================
export async function listVariants(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const productId = req.query.productId as string | undefined;
    const isActive = parseIsActive(req);
    const { field, order } = parseOrder(req, ["sortOrder", "name"], "sortOrder");

    const where: any = { tenantId };
    if (productId) where.productId = productId;
    if (isActive !== undefined) where.isActive = isActive;

    const data = await prisma.productVariant.findMany({
      where,
      orderBy: { [field]: order } as any,
    });

    return res.json({ data });
  } catch (err) {
    console.error("listVariants error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

export async function createVariant(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);

    const details: Array<{ path: (string | number)[]; message: string }> = [];
    if (!req.body?.productId) details.push({ path: ["productId"], message: "Required" });
    if (!req.body?.name) details.push({ path: ["name"], message: "Required" });
    if (details.length) return validationError(res, details);

    const v = await prisma.productVariant.create({
      data: {
        tenantId,
        productId: req.body.productId,
        name: req.body.name,
        priceOverrideCents: req.body.priceOverrideCents ?? null,
        sortOrder: req.body.sortOrder ?? 0,
        isActive: req.body.isActive ?? true,
      },
    });

    return res.json({ data: v });
  } catch (err) {
    console.error("createVariant error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

export async function updateVariant(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const id = req.params.id;

    const existing = await prisma.productVariant.findFirst({ where: { id, tenantId } });
    if (!existing) return notFound(res);

    const v = await prisma.productVariant.update({
      where: { id },
      data: {
        name: req.body.name ?? existing.name,
        priceOverrideCents: req.body.priceOverrideCents ?? existing.priceOverrideCents,
        sortOrder: req.body.sortOrder ?? existing.sortOrder,
        isActive: req.body.isActive ?? existing.isActive,
      },
    });

    return res.json({ data: v });
  } catch (err) {
    console.error("updateVariant error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}

export async function deleteVariant(req: Request, res: Response) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const id = req.params.id;

    const existing = await prisma.productVariant.findFirst({ where: { id, tenantId } });
    if (!existing) return notFound(res);

    const v = await prisma.productVariant.delete({ where: { id } });
    return res.json({ data: v });
  } catch (err) {
    console.error("deleteVariant error", err);
    return res.status(500).json({ error: { message: "INTERNAL_ERROR" } });
  }
}
