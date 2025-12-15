import express from "express";
import cors from "cors";
import { getTenantIdFromRequest } from "./tenant";
import { catalogRouter } from "./modules/catalog/routes";
import { menuRouter } from "./modules/menu/routes";
import { errorMiddleware, serviceUnavailable } from "./lib/http";
import { prisma } from "./lib/prisma";
import { ensureTenant } from "./ensureTenant";

export function createServer() {
  const app = express();

  const allowedOrigins = [
    "http://localhost:5173",
    "http://192.168.2.12:5173",
  ];
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl) and same-origin
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    })
  );
  app.use(express.json());

  // Health endpoints (minimal)
  app.get("/health", (_req, res) => {
    res.json({ data: { ok: true, service: "api", time: new Date().toISOString() } });
  });
  app.get("/ready", async (_req, res) => {
    try {
      // Simple connectivity check via Prisma
      await prisma.tenant.count({ take: 1 });
      return res.json({ data: { ok: true } });
    } catch (_e) {
      return serviceUnavailable(res);
    }
  });

  app.use((req, _res, next) => {
    // Validate tenant existence early using optional override header
    getTenantIdFromRequest(req);
    next();
  });

  // Ensure tenant exists for subsequent routes (not applied to /health or /ready)
  app.use(ensureTenant);

  app.use("/core/catalog", catalogRouter);
  app.use("/core/menu", menuRouter);

  app.use(errorMiddleware);

  return app;
}
