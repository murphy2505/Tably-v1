import express, { Request, Response, NextFunction } from "express";
import cors, { CorsOptions } from "cors";
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
import hardwareRouter from "./modules/hardware/routes";
import sumupRouter from "./modules/payments/sumupRoutes";

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
  console.log("[sumup] enabled", { hasKey: !!process.env.SUMUP_API_KEY, hasToken: !!process.env.SUMUP_ACCESS_TOKEN });
  // Sanity check: ensure Prisma delegates exist after generate
  try {
    const hasOrderSeq = typeof (prisma as any).orderSequence?.findMany === "function";
    const hasReceiptSeq = typeof (prisma as any).receiptSequence?.findMany === "function";
    console.log(`[api] prisma delegates: orderSequence=${hasOrderSeq} receiptSequence=${hasReceiptSeq}`);
  } catch (e) {
    console.log(`[api] prisma delegates check failed:`, e);
  }

  const originRegex = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.2\.[0-9]+):5173$/;
  const corsOptions: CorsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl) and same-origin
      if (!origin) return callback(null, true);
      if (originRegex.test(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-tenant-id"],
  };
  app.use(cors(corsOptions));
  app.use(express.json());

  // Health endpoints (minimal)
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ data: { ok: true, service: "api", time: new Date().toISOString() } });
  });
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ data: { ok: true, service: "api", time: new Date().toISOString() } });
  });
  // Dev-only: tenant summary endpoint to aid debugging
  if (process.env.NODE_ENV !== "production") {
    app.get("/api/debug/tenant-summary", async (_req: Request, res: Response) => {
      try {
        const tenants = await prisma.tenant.findMany({ take: 10, orderBy: { createdAt: "desc" }, select: { id: true, name: true } });
        const orders = await prisma.order.findMany({ take: 5, orderBy: { createdAt: "desc" }, select: { id: true, tenantId: true, status: true, totalInclVatCents: true } });
        res.json({ tenants, orders });
      } catch (e: any) {
        res.status(500).json({ error: { message: "DEBUG_TENANT_SUMMARY_FAILED", details: e?.message || String(e) } });
      }
    });
  }
  app.get("/ready", async (_req: Request, res: Response) => {
    try {
      // Simple connectivity check via Prisma
      await prisma.tenant.count({ take: 1 });
      return res.json({ data: { ok: true } });
    } catch (_e) {
      return serviceUnavailable(res);
    }
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
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
  // Primary mounts under /api
  app.use("/api/hardware", hardwareRouter);
  app.use("/api/print", printRouter);
  app.use("/api/payments/sumup", sumupRouter);

  // Backwards compatibility mounts (temporary)
  app.use("/hardware", hardwareRouter);
  app.use("/print", printRouter);
  app.use("/payments/sumup", sumupRouter);

  app.use(errorMiddleware);

  return app;
}
