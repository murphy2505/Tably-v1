import { z } from "zod";

export const menuCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  channel: z.string().min(1),
  layoutType: z.string().min(1),
  columns: z.number().int().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional()
});
export const menuUpdateSchema = menuCreateSchema.partial();

export const courseCreateSchema = z.object({
  name: z.string().min(1),
  shortLabel: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional()
});
export const courseUpdateSchema = courseCreateSchema.partial();

export const menuItemCreateSchema = z.object({
  menuId: z.string().min(1),
  productId: z.string().min(1),
  variantId: z.string().optional(),
  courseId: z.string().optional(),
  sortOrder: z.number().int().optional(),
  priceOverrideCents: z.number().int().optional(),
  isActive: z.boolean().optional()
});
export const menuItemUpdateSchema = menuItemCreateSchema.partial();
