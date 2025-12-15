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
  vatRateId: z.string().min(1).optional().nullable(),
  revenueGroupId: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional()
});
export const productGroupUpdateSchema = productGroupCreateSchema.partial();

export const categoryCreateSchema = z.object({
  name: z.string().min(1),
  defaultVatRateId: z.string().min(1).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional()
});
export const categoryUpdateSchema = categoryCreateSchema.partial();

export const productCreateSchema = z.object({
  productGroupId: z.string().min(1),
  categoryId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  basePriceCents: z.number().int(),
  vatRateId: z.string().min(1).optional().nullable(),
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
