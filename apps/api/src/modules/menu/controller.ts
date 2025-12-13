import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { getTenantId } from "../../tenant";
import { notFound } from "../../lib/http";

export async function listMenus(_req: Request, res: Response) {
  const tenantId = getTenantId();
  const data = await prisma.menu.findMany({ where: { tenantId }, orderBy: { sortOrder: "asc" } });
  res.json({ data });
}
export async function createMenu(req: Request, res: Response) {
  const tenantId = getTenantId();
  const m = await prisma.menu.create({
    data: {
      tenantId,
      name: req.body.name,
      slug: req.body.slug,
      channel: req.body.channel,
      layoutType: req.body.layoutType,
      columns: req.body.columns ?? 4,
      sortOrder: req.body.sortOrder ?? 0,
      isActive: req.body.isActive ?? true
    }
  });
  res.json({ data: m });
}
export async function updateMenu(req: Request, res: Response) {
  const tenantId = getTenantId();
  const id = req.params.id;
  const existing = await prisma.menu.findFirst({ where: { id, tenantId } });
  if (!existing) return notFound(res);
  const m = await prisma.menu.update({
    where: { id },
    data: {
      name: req.body.name ?? existing.name,
      slug: req.body.slug ?? existing.slug,
      channel: req.body.channel ?? existing.channel,
      layoutType: req.body.layoutType ?? existing.layoutType,
      columns: req.body.columns ?? existing.columns,
      sortOrder: req.body.sortOrder ?? existing.sortOrder,
      isActive: req.body.isActive ?? existing.isActive
    }
  });
  res.json({ data: m });
}
export async function deleteMenu(req: Request, res: Response) {
  const tenantId = getTenantId();
  const id = req.params.id;
  const existing = await prisma.menu.findFirst({ where: { id, tenantId } });
  if (!existing) return notFound(res);
  const m = await prisma.menu.delete({ where: { id } });
  res.json({ data: m });
}

export async function listCourses(_req: Request, res: Response) {
  const tenantId = getTenantId();
  const data = await prisma.course.findMany({ where: { tenantId }, orderBy: { sortOrder: "asc" } });
  res.json({ data });
}
export async function createCourse(req: Request, res: Response) {
  const tenantId = getTenantId();
  const c = await prisma.course.create({ data: { tenantId, name: req.body.name, shortLabel: req.body.shortLabel ?? null, sortOrder: req.body.sortOrder ?? 0, isActive: req.body.isActive ?? true } });
  res.json({ data: c });
}
export async function updateCourse(req: Request, res: Response) {
  const tenantId = getTenantId();
  const id = req.params.id;
  const existing = await prisma.course.findFirst({ where: { id, tenantId } });
  if (!existing) return notFound(res);
  const c = await prisma.course.update({ where: { id }, data: { name: req.body.name ?? existing.name, shortLabel: req.body.shortLabel ?? existing.shortLabel, sortOrder: req.body.sortOrder ?? existing.sortOrder, isActive: req.body.isActive ?? existing.isActive } });
  res.json({ data: c });
}
export async function deleteCourse(req: Request, res: Response) {
  const tenantId = getTenantId();
  const id = req.params.id;
  const existing = await prisma.course.findFirst({ where: { id, tenantId } });
  if (!existing) return notFound(res);
  const c = await prisma.course.delete({ where: { id } });
  res.json({ data: c });
}

export async function listMenuItems(req: Request, res: Response) {
  const tenantId = getTenantId();
  const menuId = req.query.menuId as string | undefined;
  const where: any = { tenantId };
  if (menuId) where.menuId = menuId;
  const data = await prisma.menuItem.findMany({ where, orderBy: { sortOrder: "asc" } });
  res.json({ data });
}
export async function createMenuItem(req: Request, res: Response) {
  const tenantId = getTenantId();
  const mi = await prisma.menuItem.create({
    data: {
      tenantId,
      menuId: req.body.menuId,
      productId: req.body.productId,
      variantId: req.body.variantId ?? null,
      courseId: req.body.courseId ?? null,
      sortOrder: req.body.sortOrder ?? 0,
      priceOverrideCents: req.body.priceOverrideCents ?? null,
      isActive: req.body.isActive ?? true
    }
  });
  res.json({ data: mi });
}
export async function updateMenuItem(req: Request, res: Response) {
  const tenantId = getTenantId();
  const id = req.params.id;
  const existing = await prisma.menuItem.findFirst({ where: { id, tenantId } });
  if (!existing) return notFound(res);
  const mi = await prisma.menuItem.update({
    where: { id },
    data: {
      menuId: req.body.menuId ?? existing.menuId,
      productId: req.body.productId ?? existing.productId,
      variantId: req.body.variantId ?? existing.variantId,
      courseId: req.body.courseId ?? existing.courseId,
      sortOrder: req.body.sortOrder ?? existing.sortOrder,
      priceOverrideCents: req.body.priceOverrideCents ?? existing.priceOverrideCents,
      isActive: req.body.isActive ?? existing.isActive
    }
  });
  res.json({ data: mi });
}
export async function deleteMenuItem(req: Request, res: Response) {
  const tenantId = getTenantId();
  const id = req.params.id;
  const existing = await prisma.menuItem.findFirst({ where: { id, tenantId } });
  if (!existing) return notFound(res);
  const mi = await prisma.menuItem.delete({ where: { id } });
  res.json({ data: mi });
}

export async function getActivePosMenu(_req: Request, res: Response) {
  const tenantId = getTenantId();
  const menu = await prisma.menu.findFirst({ where: { tenantId, isActive: true }, orderBy: { sortOrder: "asc" } });
  if (!menu) return res.json({ data: null });
  const items = await prisma.menuItem.findMany({
    where: { tenantId, menuId: menu.id },
    orderBy: { sortOrder: "asc" },
    include: {
      product: true,
      variant: true,
      course: true
    }
  });
  res.json({ data: { menu, items } });
}
