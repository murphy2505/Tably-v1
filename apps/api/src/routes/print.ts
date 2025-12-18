import { Router } from "express";
import { prisma } from "../lib/prisma";

import { printTestReceipt } from "../services/printer/starPrinter";
import { printEpsonTestReceipt } from "../services/printer/epsonPrinter";
import { printEpsonCounterReceipt, printEpsonQrReceipt } from "../services/printer/epsonReceipts";

const router = Router();

// POST /print/test → Star (AUX printer)
router.post("/test", async (_req, res) => {
  try {
    await printTestReceipt();
    res.json({ ok: true });
  } catch (e: any) {
    console.error("[print.star.test] error", e);
    res.status(500).json({ error: { message: "PRINT_FAILED", details: e?.message || String(e) } });
  }
});

// POST /print/epson/test → Epson (MAIN printer)
router.post("/epson/test", async (_req, res) => {
  try {
    await printEpsonTestReceipt();
    res.json({ ok: true });
  } catch (e: any) {
    console.error("[print.epson.test] error", e);
    res.status(500).json({ error: { message: "PRINT_FAILED", details: e?.message || String(e) } });
  }
});

// POST /print/epson/counter → Epson baliebon (body optioneel)
router.post("/epson/counter", async (req, res) => {
  try {
    const ip = req.body?.ip || "192.168.2.168";

    await printEpsonCounterReceipt(ip, {
      businessName: "Cafetaria ’t Centrum",
      addressLine: "Groesbeek",
      orderNo: req.body?.orderNo ?? "DEMO-001",
      createdAtIso: new Date().toISOString(),
      lines: req.body?.lines ?? [
        { qty: 1, title: "Friet Middel", unitPriceCents: 325 },
        { qty: 1, title: "Frikandel", unitPriceCents: 245 },
      ],
      subtotalCents: req.body?.subtotalCents ?? 570,
      vatCents: req.body?.vatCents ?? 99,
      totalCents: req.body?.totalCents ?? 669,
      paidWith: req.body?.paidWith ?? "PIN",
    });

    res.json({ ok: true });
  } catch (e: any) {
    console.error("[print.epson.counter] error", e);
    res.status(500).json({ error: { message: "PRINT_FAILED", details: e?.message || String(e) } });
  }
});

// POST /print/epson/qr → Epson QR/klantenkaart ticket
router.post("/epson/qr", async (req, res) => {
  try {
    const ip = req.body?.ip || "192.168.2.168";
    const qrText = String(req.body?.qrText || "");

    await printEpsonQrReceipt(ip, {
      businessName: "Cafetaria ’t Centrum",
      title: req.body?.title ?? "Klantenkaart",
      subtitle: req.body?.subtitle ?? "Scan deze QR om te koppelen",
      qrText: qrText || "tably://loyalty/demo",
      footer: req.body?.footer ?? "Bewaar deze bon of maak een foto",
    });

    res.json({ ok: true });
  } catch (e: any) {
    console.error("[print.epson.qr] error", e);
    res.status(500).json({ error: { message: "PRINT_FAILED", details: e?.message || String(e) } });
  }
});

// POST /print/order/:orderId → print echte order (Epson counter)
router.post("/order/:orderId", async (req, res) => {
  try {
    const orderId = String(req.params.orderId);
    const ip = req.body?.ip || "192.168.2.168";

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { lines: true }, // <- FIX: geen product/variant relations
    });

    if (!order) {
      return res.status(404).json({ error: { message: "NOT_FOUND", details: "ORDER_NOT_FOUND" } });
    }

    const receiptLines = (order as any).lines.map((l: any) => {
      const title = l.title ?? l.name ?? l.productName ?? "Item";
      const unitPriceCents = Number(l.unitPriceCents ?? l.priceCents ?? l.unitPrice ?? 0);
      const qty = Number(l.qty ?? l.quantity ?? 1);
      return { qty, title, unitPriceCents };
    });

    const subtotalCents =
      typeof (order as any).subtotalCents === "number"
        ? (order as any).subtotalCents
        : receiptLines.reduce((sum: number, it: any) => sum + it.qty * it.unitPriceCents, 0);

    const vatCents =
      typeof (order as any).vatCents === "number" ? (order as any).vatCents : 0;

    const totalCents =
      typeof (order as any).totalCents === "number" ? (order as any).totalCents : subtotalCents + vatCents;

    await printEpsonCounterReceipt(ip, {
      businessName: "Cafetaria ’t Centrum",
      addressLine: "Groesbeek",
      orderNo: (order as any).receiptLabel ?? (order as any).receiptNo ?? (order as any).number ?? String(order.id).slice(-6),
      createdAtIso: (order as any).createdAt?.toISOString?.() ?? new Date().toISOString(),
      lines: receiptLines,
      subtotalCents,
      vatCents,
      totalCents,
      paidWith: (order as any).paidWith ?? (order as any).paymentMethod ?? "PIN",
    });

    res.json({ ok: true });
  } catch (e: any) {
    console.error("[print.order] error", e);
    res.status(500).json({ error: { message: "PRINT_FAILED", details: e?.message || String(e) } });
  }
});

export default router;
