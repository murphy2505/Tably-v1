import { Router } from "express";
import { asyncHandler } from "../../lib/http";
import { createGroup, createOption, deleteOption, listGroups, setProductGroups, updateGroup, updateOption, getProductModifierGroups } from "./controller";

export const modifiersRouter = Router();

modifiersRouter.get("/core/modifiers/groups", asyncHandler(listGroups));
modifiersRouter.post("/core/modifiers/groups", asyncHandler(createGroup));
modifiersRouter.put("/core/modifiers/groups/:id", asyncHandler(updateGroup));
modifiersRouter.post("/core/modifiers/groups/:id/options", asyncHandler(createOption));
modifiersRouter.put("/core/modifiers/options/:id", asyncHandler(updateOption));
modifiersRouter.delete("/core/modifiers/options/:id", asyncHandler(deleteOption));

modifiersRouter.post("/core/products/:id/modifier-groups", asyncHandler(setProductGroups));
modifiersRouter.get("/core/products/:id/modifier-groups", asyncHandler(getProductModifierGroups));
