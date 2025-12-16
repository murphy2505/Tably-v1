import { Router } from "express";
import { asyncHandler } from "../../lib/http";
import { getWebshopStatus, getWebshopSettings, updateWebshopSettings } from "./controller";

export const webshopRouter = Router();

webshopRouter.get("/core/webshop/status", asyncHandler(getWebshopStatus));
webshopRouter.get("/core/webshop/settings", asyncHandler(getWebshopSettings));
webshopRouter.put("/core/webshop/settings", asyncHandler(updateWebshopSettings));
