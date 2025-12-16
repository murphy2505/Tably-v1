import { Router } from "express";
import { asyncHandler, validationError } from "../../lib/http";
import * as ctrl from "./controller";
import {
  revenueGroupCreateSchema,
  revenueGroupUpdateSchema,
  productGroupCreateSchema,
  productGroupUpdateSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  productCreateSchema,
  productUpdateSchema,
  variantCreateSchema,
  variantUpdateSchema,
} from "./schema";

export const catalogRouter = Router();

// ===============================
// Revenue Groups
// ===============================
catalogRouter.get("/revenue-groups", asyncHandler(ctrl.listRevenueGroups));

catalogRouter.post("/revenue-groups", (req, res, next) => {
  const parsed = revenueGroupCreateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  return asyncHandler(ctrl.createRevenueGroup)(req, res, next);
});

catalogRouter.put("/revenue-groups/:id", (req, res, next) => {
  const parsed = revenueGroupUpdateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  return asyncHandler(ctrl.updateRevenueGroup)(req, res, next);
});

catalogRouter.delete("/revenue-groups/:id", asyncHandler(ctrl.deleteRevenueGroup));

// ===============================
// VAT RATES  ✅ (nieuw, schoon)
// ===============================
catalogRouter.get("/vat-rates", asyncHandler(ctrl.listVatRates));
// Alias path for clients expecting tax-rates naming
catalogRouter.get("/tax-rates", asyncHandler(ctrl.listVatRates));

// ===============================
// Product Groups
// ===============================
catalogRouter.get("/product-groups", asyncHandler(ctrl.listProductGroups));

catalogRouter.post("/product-groups", (req, res, next) => {
  const parsed = productGroupCreateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  return asyncHandler(ctrl.createProductGroup)(req, res, next);
});

catalogRouter.put("/product-groups/:id", (req, res, next) => {
  const parsed = productGroupUpdateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  return asyncHandler(ctrl.updateProductGroup)(req, res, next);
});

catalogRouter.delete("/product-groups/:id", asyncHandler(ctrl.deleteProductGroup));

// ===============================
// Categories
// ===============================
catalogRouter.get("/categories", asyncHandler(ctrl.listCategories));

catalogRouter.post("/categories", (req, res, next) => {
  const parsed = categoryCreateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  return asyncHandler(ctrl.createCategory)(req, res, next);
});

catalogRouter.put("/categories/:id", (req, res, next) => {
  const parsed = categoryUpdateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  return asyncHandler(ctrl.updateCategory)(req, res, next);
});

catalogRouter.delete("/categories/:id", asyncHandler(ctrl.deleteCategory));

// ===============================
// Products
// ===============================
catalogRouter.get("/products", asyncHandler(ctrl.listProducts));
catalogRouter.get("/products/:id", asyncHandler(ctrl.getProduct));

catalogRouter.post("/products", (req, res, next) => {
  const parsed = productCreateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  return asyncHandler(ctrl.createProduct)(req, res, next);
});

catalogRouter.put("/products/:id", (req, res, next) => {
  const parsed = productUpdateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  return asyncHandler(ctrl.updateProduct)(req, res, next);
});

catalogRouter.delete("/products/:id", asyncHandler(ctrl.deleteProduct));

// ===============================
// Variants
// ===============================
catalogRouter.get("/variants", asyncHandler(ctrl.listVariants));

catalogRouter.post("/variants", (req, res, next) => {
  const parsed = variantCreateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  return asyncHandler(ctrl.createVariant)(req, res, next);
});

catalogRouter.put("/variants/:id", (req, res, next) => {
  const parsed = variantUpdateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  return asyncHandler(ctrl.updateVariant)(req, res, next);
});

catalogRouter.delete("/variants/:id", asyncHandler(ctrl.deleteVariant));
