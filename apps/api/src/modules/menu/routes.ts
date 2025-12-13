import { Router } from "express";
import { asyncHandler, validationError } from "../../lib/http";
import { menuCreateSchema, menuUpdateSchema, courseCreateSchema, courseUpdateSchema, menuItemCreateSchema, menuItemUpdateSchema } from "./schema";
import * as ctrl from "./controller";

export const menuRouter = Router();

// Menus
menuRouter.get("/menus", asyncHandler(ctrl.listMenus));
menuRouter.post("/menus", (req, res, next) => {
  const parsed = menuCreateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  return asyncHandler(ctrl.createMenu)(req, res, next);
});
menuRouter.put("/menus/:id", (req, res, next) => {
  const parsed = menuUpdateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  return asyncHandler(ctrl.updateMenu)(req, res, next);
});
menuRouter.delete("/menus/:id", asyncHandler(ctrl.deleteMenu));

// Courses
menuRouter.get("/courses", asyncHandler(ctrl.listCourses));
menuRouter.post("/courses", (req, res, next) => {
  const parsed = courseCreateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  return asyncHandler(ctrl.createCourse)(req, res, next);
});
menuRouter.put("/courses/:id", (req, res, next) => {
  const parsed = courseUpdateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  return asyncHandler(ctrl.updateCourse)(req, res, next);
});
menuRouter.delete("/courses/:id", asyncHandler(ctrl.deleteCourse));

// Menu Items
menuRouter.get("/menu-items", asyncHandler(ctrl.listMenuItems));
menuRouter.post("/menu-items", (req, res, next) => {
  const parsed = menuItemCreateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  return asyncHandler(ctrl.createMenuItem)(req, res, next);
});
menuRouter.put("/menu-items/:id", (req, res, next) => {
  const parsed = menuItemUpdateSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error.issues);
  return asyncHandler(ctrl.updateMenuItem)(req, res, next);
});
menuRouter.delete("/menu-items/:id", asyncHandler(ctrl.deleteMenuItem));

// Active POS Menu
menuRouter.get("/active-pos-menu", asyncHandler(ctrl.getActivePosMenu));
