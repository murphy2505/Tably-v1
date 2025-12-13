import express from "express";
import cors from "cors";
import { getTenantId } from "./tenant";
import { catalogRouter } from "./modules/catalog/routes";
import { menuRouter } from "./modules/menu/routes";
import { errorMiddleware } from "./lib/http";

export function createServer() {
  const app = express();

  const origin = process.env.CORS_ORIGIN || "http://localhost:5173";
  app.use(cors({ origin, credentials: false }));
  app.use(express.json());

  app.use((req, _res, next) => {
    // Validate tenant existence early
    getTenantId();
    next();
  });

  app.use("/core/catalog", catalogRouter);
  app.use("/core/menu", menuRouter);

  app.use(errorMiddleware);

  return app;
}
