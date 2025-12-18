import express from "express";
import cors from "cors";
import { getTenantIdFromRequest } from "./tenant";
import { catalogRouter } from "./modules/catalog/routes";
import { asyncHandler } from "./lib/http";
import { listVatRates } from "./modules/catalog/controller";
import { menuRouter } from "./modules/menu/routes";
import { ordersRouter } from "./modules/orders/routes";
import { menuCardsRouter } from "./modules/menuCards/routes";
import { webshopRouter } from "./modules/webshop/routes";
import { modifiersRouter } from "./modules/modifiers/routes";
import { settingsRouter } from "./modules/settings/routes";
import { errorMiddleware, serviceUnavailable } from "./lib/http";
import printRouter from "./routes/print";
import { prisma } from "./lib/prisma";
import { ensureTenant } from "./ensureTenant";

export function createServer() {
  const app = express();
  const port = Number(process.env.PORT || 4002);
  const dbUrl = process.env.DATABASE_URL || "";

  function maskDbUrl(url?: string) {
    if (!url) return "";
    try {
      const u = new URL(url);
      if (u.password) u.password = "***";
      return u.toString();
    } catch {
      return url.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
    }
  }

  console.log(`[api] PORT=${port}`);
  console.log(`[api] DATABASE_URL=${maskDbUrl(dbUrl)}`);
  // Sanity check: ensure Prisma delegates exist after generate
  try {
    const hasOrderSeq = typeof (prisma as any).orderSequence?.findMany === "function";
    const hasReceiptSeq = typeof (prisma as any).receiptSequence?.findMany === "function";
    console.log(`[api] prisma delegates: orderSequence=${hasOrderSeq} receiptSequence=${hasReceiptSeq}`);
  } catch (e) {
    console.log(`[api] prisma delegates check failed:`, e);
  }

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

  app.use((req, res, next) => {
    // Resolve tenant from header; in production, require it explicitly
    const tenantId = getTenantIdFromRequest(req);
    const isProd = process.env.NODE_ENV === "production";
    if (!tenantId && isProd) {
      return res.status(400).json({ error: { message: "TENANT_ID_REQUIRED" } });
    }
    next();
  });

  // Ensure tenant exists for subsequent routes (not applied to /health or /ready)
  app.use(ensureTenant);

  // Alias for tax rates outside catalog namespace for POS/Web
  app.get("/core/tax-rates", asyncHandler(listVatRates));

  app.use("/core/catalog", catalogRouter);
  app.use("/core/menu", menuRouter);
  app.use("/", modifiersRouter);
  app.use("/", menuCardsRouter);
  app.use("/", webshopRouter);
  app.use("/", settingsRouter);
  app.use("/", ordersRouter);
  app.use("/print", printRouter);

  app.use(errorMiddleware);

  return app;
}
