import { Router } from "express";
import { printTestReceipt } from "../services/printer/starPrinter";
import { printEpsonTestReceipt } from "../services/printer/epsonPrinter";

const router = Router();

// POST /print/test  → Star (AUX printer)
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

export default router;
