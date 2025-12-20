import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { getTenantIdFromRequest } from "../../tenant";
import { escposTcpTestPrint, type EscposDriver } from "../../services/printer/escposTcp";

type Vendor = "STAR" | "EPSON" | "GENERIC_ESCPOS";
type PrintKind = "RECEIPT" | "QR_CARD" | "KITCHEN" | "BAR";

function toVendor(driver: string): Vendor {
  if (driver === "STAR_ESC_POS_TCP") return "STAR";
  // Simplify: map ESC_POS_TCP to GENERIC by default
  if (driver === "ESC_POS_TCP") return "GENERIC_ESCPOS";
  return "GENERIC_ESCPOS";
}

function driverFromVendor(vendor: Vendor): "ESC_POS_TCP" | "STAR_ESC_POS_TCP" {
  if (vendor === "STAR") return "STAR_ESC_POS_TCP" as const;
  return "ESC_POS_TCP" as const; // EPSON and GENERIC_ESCPOS default to ESC/POS TCP
}

export const hardwareRouter = Router();

// Printers CRUD
hardwareRouter.get("/hardware/printers", async (req, res) => {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const printers = await prisma.printer.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
    const data = printers.map((p) => ({
      id: p.id,
      tenantId: p.tenantId,
      name: p.name,
      vendor: toVendor(p.driver as any),
      host: p.host,
      port: p.port,
      paperWidthMm: p.paperWidth ?? 80,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
    res.json({ printers: data });
  } catch (e: any) {
    res.status(500).json({ error: { message: "LIST_FAILED", details: e?.message || String(e) } });
  }
});

hardwareRouter.post("/hardware/printers", async (req, res) => {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const { name, host, port, vendor, paperWidthMm, isActive } = req.body || {};
    if (!name || typeof name !== "string") return res.status(400).json({ error: { message: "NAME_REQUIRED" } });
    if (!host || typeof host !== "string") return res.status(400).json({ error: { message: "HOST_REQUIRED" } });
    const p = Number(port ?? 9100);
    if (!Number.isFinite(p) || p < 1 || p > 65535) return res.status(400).json({ error: { message: "PORT_INVALID" } });
    const drv = driverFromVendor((vendor as Vendor) || "GENERIC_ESCPOS");
    const paper = Number(paperWidthMm ?? 80);
    if (![58, 80].includes(paper)) return res.status(400).json({ error: { message: "PAPER_WIDTH_INVALID" } });

    const created = await prisma.printer.create({
      data: {
        tenantId,
        name,
        driver: drv as any,
        host,
        port: p,
        paperWidth: paper,
        isActive: Boolean(isActive ?? true),
      },
    });

    res.json({ printer: {
      id: created.id,
      tenantId: created.tenantId,
      name: created.name,
      vendor: toVendor(created.driver as any),
      host: created.host,
      port: created.port,
      paperWidthMm: created.paperWidth ?? 80,
      isActive: created.isActive,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    }});
  } catch (e: any) {
    res.status(500).json({ error: { message: "CREATE_FAILED", details: e?.message || String(e) } });
  }
});

hardwareRouter.patch("/hardware/printers/:id", async (req, res) => {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const id = String(req.params.id);
    const existing = await prisma.printer.findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: { message: "NOT_FOUND" } });
    const { name, host, port, vendor, paperWidthMm, isActive } = req.body || {};
    const update: any = {};
    if (typeof name === "string") update.name = name;
    if (typeof host === "string") update.host = host;
    if (port != null) {
      const p = Number(port);
      if (!Number.isFinite(p) || p < 1 || p > 65535) return res.status(400).json({ error: { message: "PORT_INVALID" } });
      update.port = p;
    }
    if (typeof paperWidthMm !== "undefined") {
      const paper = Number(paperWidthMm);
      if (![58, 80].includes(paper)) return res.status(400).json({ error: { message: "PAPER_WIDTH_INVALID" } });
      update.paperWidth = paper;
    }
    if (typeof isActive === "boolean") update.isActive = isActive;
    if (typeof vendor === "string") update.driver = driverFromVendor(vendor as Vendor) as any;

    const updated = await prisma.printer.update({ where: { id }, data: update });
    res.json({ printer: {
      id: updated.id,
      tenantId: updated.tenantId,
      name: updated.name,
      vendor: toVendor(updated.driver as any),
      host: updated.host,
      port: updated.port,
      paperWidthMm: updated.paperWidth ?? 80,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    }});
  } catch (e: any) {
    res.status(500).json({ error: { message: "UPDATE_FAILED", details: e?.message || String(e) } });
  }
});

hardwareRouter.delete("/hardware/printers/:id", async (req, res) => {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const id = String(req.params.id);
    const existing = await prisma.printer.findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: { message: "NOT_FOUND" } });
    await prisma.printer.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: "DELETE_FAILED", details: e?.message || String(e) } });
  }
});

  // Test print a specific printer
hardwareRouter.post("/hardware/printers/:id/test", async (req, res) => {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const id = String(req.params.id);
    const p = await prisma.printer.findFirst({ where: { id, tenantId } });
    if (!p) return res.status(404).json({ error: { message: "NOT_FOUND" } });

    const drv: EscposDriver = (p.driver as any) === "STAR_ESC_POS_TCP" ? "STAR_ESC_POS_TCP" : "ESC_POS_TCP";
    await escposTcpTestPrint(p.host, p.port, drv);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: "PRINT_FAILED", details: e?.message || String(e) } });
  }
});

// Print routes CRUD (tenant mapping)
hardwareRouter.get("/hardware/print-routes", async (req, res) => {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const routes = await prisma.printRoute.findMany({ where: { tenantId }, include: { printer: true } });
    const data = routes.map((r) => ({ id: r.id, tenantId: r.tenantId, kind: r.kind, printerId: r.printerId, isDefault: r.isDefault }));
    res.json({ routes: data });
  } catch (e: any) {
    res.status(500).json({ error: { message: "LIST_ROUTES_FAILED", details: e?.message || String(e) } });
  }
});

hardwareRouter.put("/hardware/print-routes", async (req, res) => {
  try {
    const tenantId = getTenantIdFromRequest(req);
    const payload = (req.body || {}) as { routes?: Array<{ kind: PrintKind; printerId: string; isDefault?: boolean }> };
    const routes = Array.isArray(payload.routes) ? payload.routes : [];
    const results: any[] = [];
    for (const r of routes) {
      if (!r || !r.kind || !r.printerId) continue;
      const data = { tenantId, kind: r.kind, printerId: r.printerId, isDefault: Boolean(r.isDefault) } as const;
      const upserted = await prisma.printRoute.upsert({
        where: { tenantId_kind: { tenantId, kind: r.kind } },
        update: { printerId: r.printerId, isDefault: Boolean(r.isDefault) },
        create: data as any,
      });
      results.push({ id: upserted.id, kind: upserted.kind, printerId: upserted.printerId, isDefault: upserted.isDefault });
    }
    res.json({ routes: results });
  } catch (e: any) {
    res.status(500).json({ error: { message: "UPSERT_ROUTES_FAILED", details: e?.message || String(e) } });
  }
});

export default hardwareRouter;
