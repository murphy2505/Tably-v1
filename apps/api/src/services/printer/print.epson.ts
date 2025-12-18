import { Router } from "express";
import { printEpsonReceipt } from "../services/printer/epsonFormatter";

const router = Router();

router.post("/test-epson", async (_req, res) => {
  try {
    await printEpsonReceipt("192.168.2.168", {
      businessName: "Cafetaria ’t Centrum",
      address: "Groesbeek",
      orderNo: "TEST-001",
      lines: [
        { qty: 1, title: "Friet Middel", priceCents: 325 },
        { qty: 1, title: "Frikandel", priceCents: 245 },
      ],
      subtotalCents: 570,
      vatCents: 99,
      totalCents: 669,
      paidWith: "PIN",
    });

    res.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
