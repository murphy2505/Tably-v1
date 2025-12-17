import { Router } from "express";
import { asyncHandler } from "../../lib/http";
import * as ctrl from "./controller";

export const menuCardsRouter = Router();

menuCardsRouter.get("/core/menu-cards", asyncHandler(ctrl.listMenuCards));
// Place 'active' before ':id' to avoid capturing 'active' as an id
menuCardsRouter.get("/core/menu-cards/active", asyncHandler(ctrl.activeMenuCards));
menuCardsRouter.get("/core/menu-cards/:id", asyncHandler(ctrl.getMenuCardById));
menuCardsRouter.post("/core/menu-cards", asyncHandler(ctrl.createMenuCard));
menuCardsRouter.put("/core/menu-cards/:id", asyncHandler(ctrl.updateMenuCard));
menuCardsRouter.post("/core/menu-cards/:id/schedules", asyncHandler(ctrl.addSchedule));
menuCardsRouter.delete("/core/menu-cards/:id/schedules/:scheduleId", asyncHandler(ctrl.deleteSchedule));
menuCardsRouter.post("/core/menu-cards/:id/items", asyncHandler(ctrl.addMenuCardItem));
