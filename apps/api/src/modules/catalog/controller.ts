import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { getTenantIdFromRequest } from "../../tenant";
import { notFound } from "../../lib/http";

export async function listRevenueGroups(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(req);
  const isActiveQ = req.query.isActive as string | undefined;
  const orderByQ = req.query.orderBy as string | undefined;
  const orderQ = (req.query.order as string | undefined) === "desc" ? "desc" : "asc";
  const where: any = { tenantId };
  if (isActiveQ === "true") where.isActive = true;
  if (isActiveQ === "false") where.isActive = false;
  const allowed = ["sortOrder", "name"];
  const field = allowed.includes(orderByQ || "") ? (orderByQ as string) : "sortOrder";
  const data = await prisma.revenueGroup.findMany({ where, orderBy: { [field]: orderQ } as any });
  res.json({ data });
}
export async function createRevenueGroup(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(req);
  const rg = await prisma.revenueGroup.create({ data: { tenantId, name: req.body.name, sortOrder: req.body.sortOrder ?? 0, isActive: req.body.isActive ?? true } });
  res.json({ data: rg });
}
export async function updateRevenueGroup(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(req);
  const id = req.params.id;
  const existing = await prisma.revenueGroup.findFirst({ where: { id, tenantId } });
  if (!existing) return notFound(res);
  const rg = await prisma.revenueGroup.update({ where: { id }, data: { name: req.body.name ?? existing.name, sortOrder: req.body.sortOrder ?? existing.sortOrder, isActive: req.body.isActive ?? existing.isActive } });
  res.json({ data: rg });
}
export async function deleteRevenueGroup(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(req);
  const id = req.params.id;
  const existing = await prisma.revenueGroup.findFirst({ where: { id, tenantId } });
  if (!existing) return notFound(res);
  const rg = await prisma.revenueGroup.delete({ where: { id } });
  res.json({ data: rg });
}

export async function listProductGroups(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(req);
  const isActiveQ = req.query.isActive as string | undefined;
  const orderByQ = req.query.orderBy as string | undefined;
  const orderQ = (req.query.order as string | undefined) === "desc" ? "desc" : "asc";
  const where: any = { tenantId };
  if (isActiveQ === "true") where.isActive = true;
  if (isActiveQ === "false") where.isActive = false;
  const allowed = ["sortOrder", "name"];
  const field = allowed.includes(orderByQ || "") ? (orderByQ as string) : "sortOrder";
  const data = await prisma.productGroup.findMany({ where, orderBy: { [field]: orderQ } as any });
  res.json({ data });
}
export async function createProductGroup(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(req);
  const pg = await prisma.productGroup.create({ data: { tenantId, name: req.body.name, revenueGroupId: req.body.revenueGroupId, sortOrder: req.body.sortOrder ?? 0, isActive: req.body.isActive ?? true } });
  res.json({ data: pg });
}
export async function updateProductGroup(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(req);
  const id = req.params.id;
  const existing = await prisma.productGroup.findFirst({ where: { id, tenantId } });
  if (!existing) return notFound(res);
  const pg = await prisma.productGroup.update({ where: { id }, data: { name: req.body.name ?? existing.name, revenueGroupId: req.body.revenueGroupId ?? existing.revenueGroupId, sortOrder: req.body.sortOrder ?? existing.sortOrder, isActive: req.body.isActive ?? existing.isActive } });
  res.json({ data: pg });
}
export async function deleteProductGroup(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(req);
  const id = req.params.id;
  const existing = await prisma.productGroup.findFirst({ where: { id, tenantId } });
  if (!existing) return notFound(res);
  const pg = await prisma.productGroup.delete({ where: { id } });
  res.json({ data: pg });
}

export async function listCategories(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(req);
  const isActiveQ = req.query.isActive as string | undefined;
  const orderByQ = req.query.orderBy as string | undefined;
  const orderQ = (req.query.order as string | undefined) === "desc" ? "desc" : "asc";
  const where: any = { tenantId };
  if (isActiveQ === "true") where.isActive = true;
  if (isActiveQ === "false") where.isActive = false;
  const allowed = ["sortOrder", "name"];
  const field = allowed.includes(orderByQ || "") ? (orderByQ as string) : "sortOrder";
  const data = await prisma.category.findMany({ where, orderBy: { [field]: orderQ } as any });
  res.json({ data });
}
export async function createCategory(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(req);
  const cat = await prisma.category.create({ data: { tenantId, name: req.body.name, sortOrder: req.body.sortOrder ?? 0, isActive: req.body.isActive ?? true } });
  res.json({ data: cat });
}
export async function updateCategory(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(req);
  const id = req.params.id;
  const existing = await prisma.category.findFirst({ where: { id, tenantId } });
  if (!existing) return notFound(res);
  const cat = await prisma.category.update({ where: { id }, data: { name: req.body.name ?? existing.name, sortOrder: req.body.sortOrder ?? existing.sortOrder, isActive: req.body.isActive ?? existing.isActive } });
  res.json({ data: cat });
}
export async function deleteCategory(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(req);
  const id = req.params.id;
  const existing = await prisma.category.findFirst({ where: { id, tenantId } });
  if (!existing) return notFound(res);
  const cat = await prisma.category.delete({ where: { id } });
  res.json({ data: cat });
}

export async function listProducts(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(req);
  const isActiveQ = req.query.isActive as string | undefined;
  const orderByQ = req.query.orderBy as string | undefined;
  const orderQ = (req.query.order as string | undefined) === "desc" ? "desc" : "asc";
  const where: any = { tenantId };
  if (isActiveQ === "true") where.isActive = true;
  if (isActiveQ === "false") where.isActive = false;
  const allowed = ["name", "createdAt"];
  const field = allowed.includes(orderByQ || "") ? (orderByQ as string) : "createdAt";
  const data = await prisma.product.findMany({ where, orderBy: { [field]: orderQ } as any });
  res.json({ data });
}
export async function getProduct(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(req);
  const id = req.params.id;
  const item = await prisma.product.findFirst({
    where: { id, tenantId },
    include: {
      productGroup: true,
      category: true,
      variants: { orderBy: { sortOrder: "asc" } }
    }
  });
  if (!item) return notFound(res);
  res.json({ data: item });
}
export async function createProduct(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(req);
  const prod = await prisma.product.create({
    data: {
      tenantId,
      productGroupId: req.body.productGroupId,
      categoryId: req.body.categoryId ?? null,
      name: req.body.name,
      description: req.body.description ?? null,
      basePriceCents: req.body.basePriceCents,
      vatRateBps: req.body.vatRateBps,
      imageUrl: req.body.imageUrl ?? null,
      allergenTags: req.body.allergenTags ?? null,
      isActive: req.body.isActive ?? true
    }
  });
  res.json({ data: prod });
}
export async function updateProduct(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(req);
  const id = req.params.id;
  const existing = await prisma.product.findFirst({ where: { id, tenantId } });
  if (!existing) return notFound(res);
  const prod = await prisma.product.update({
    where: { id },
    data: {
      productGroupId: req.body.productGroupId ?? existing.productGroupId,
      categoryId: req.body.categoryId ?? existing.categoryId,
      name: req.body.name ?? existing.name,
      description: req.body.description ?? existing.description,
      basePriceCents: req.body.basePriceCents ?? existing.basePriceCents,
      vatRateBps: req.body.vatRateBps ?? existing.vatRateBps,
      imageUrl: req.body.imageUrl ?? existing.imageUrl,
      allergenTags: req.body.allergenTags ?? existing.allergenTags,
      isActive: req.body.isActive ?? existing.isActive
    }
  });
  res.json({ data: prod });
}
export async function deleteProduct(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(req);
  const id = req.params.id;
  const existing = await prisma.product.findFirst({ where: { id, tenantId } });
  if (!existing) return notFound(res);
  const prod = await prisma.product.delete({ where: { id } });
  res.json({ data: prod });
}

export async function listVariants(req: Request, res: Response) {
  const tenantId = getTenantIdFromRequest(req);
  const productId = req.query.productId as string | undefined;
  const isActiveQ = req.query.isActive as string | undefined;
  const orderByQ = req.query.orderBy as string | undefined;
  const orderQ = (req.query.order as string | undefined) === "desc" ? "desc" : "asc";
  const where: any = { tenantId };
  if (productId) where.productId = productId;
  if (isActiveQ === "true") where.isActive = true;
  if (isActiveQ === "false") where.isActive = false;
  const allowed = ["sortOrder", "name"];
  const field = allowed.includes(orderByQ || "") ? (orderByQ as string) : "sortOrder";
  const data = await prisma.productVariant.findMany({ where, orderBy: { [field]: orderQ } as any });
  res.json({ data });
}
export async function createVariant(req: Request, res: Response) {
  const tenantId = getTenantId();
  const v = await prisma.productVariant.create({ data: { tenantId, productId: req.body.productId, name: req.body.name, priceOverrideCents: req.body.priceOverrideCents ?? null, sortOrder: req.body.sortOrder ?? 0, isActive: req.body.isActive ?? true } });
  res.json({ data: v });
}
export async function updateVariant(req: Request, res: Response) {
  const tenantId = getTenantId();
  const id = req.params.id;
  const existing = await prisma.productVariant.findFirst({ where: { id, tenantId } });
  if (!existing) return notFound(res);
  const v = await prisma.productVariant.update({ where: { id }, data: { name: req.body.name ?? existing.name, priceOverrideCents: req.body.priceOverrideCents ?? existing.priceOverrideCents, sortOrder: req.body.sortOrder ?? existing.sortOrder, isActive: req.body.isActive ?? existing.isActive } });
  res.json({ data: v });
}
export async function deleteVariant(req: Request, res: Response) {
  const tenantId = getTenantId();
  const id = req.params.id;
  const existing = await prisma.productVariant.findFirst({ where: { id, tenantId } });
  if (!existing) return notFound(res);
  const v = await prisma.productVariant.delete({ where: { id } });
  res.json({ data: v });
}
