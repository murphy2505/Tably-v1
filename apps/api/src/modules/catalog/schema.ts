import { z } from "zod";

export const revenueGroupCreateSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional()
});
export const revenueGroupUpdateSchema = revenueGroupCreateSchema.partial();

export const productGroupCreateSchema = z.object({
  name: z.string().min(1).transform((s) => s.trim()),
  code: z.string().trim().optional().transform((s) => (s ? s.toUpperCase() : undefined)),
  vatRate: z.enum(["HIGH", "LOW", "ZERO"]),
  revenueGroupId: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional()
});
export const productGroupUpdateSchema = productGroupCreateSchema.partial();

export const categoryCreateSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional()
});
export const categoryUpdateSchema = categoryCreateSchema.partial();

export const productCreateSchema = z.object({
  productGroupId: z.string().min(1),
  categoryId: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  basePriceCents: z.number().int(),
  vatRateBps: z.number().int(),
  imageUrl: z.string().url().optional(),
  allergenTags: z.any().optional(),
  isActive: z.boolean().optional()
});
export const productUpdateSchema = productCreateSchema.partial();

export const variantCreateSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  priceOverrideCents: z.number().int().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional()
});
export const variantUpdateSchema = variantCreateSchema.partial();
