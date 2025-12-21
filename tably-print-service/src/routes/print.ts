import { Router, Request, Response } from "express";
import { printEscposTest, EscposDriver } from "../drivers/escposTcp";
import { printStarprntTest } from "../drivers/starprnt";

const router = Router();

// POST /print/test
// body: { printer: { driver: "ESC_POS_TCP" | "STAR_ESC_POS_TCP" | "STARPRNT", host: string, port?: number } }
router.post("/test", async (req: Request, res: Response) => {
  try {
    const body = req.body as unknown;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ ok: false, error: "INVALID_PAYLOAD" });
    }

    const printer = (body as any).printer;
    if (!printer || typeof printer !== "object") {
      return res.status(400).json({ ok: false, error: "INVALID_PAYLOAD" });
    }

    const { driver, host, port: portRaw } = printer as { driver?: unknown; host?: unknown; port?: unknown };
    if (typeof driver !== "string" || typeof host !== "string" || host.trim() === "") {
      return res.status(400).json({ ok: false, error: "MISSING_PRINTER_FIELDS" });
    }

    const port = portRaw == null ? 9100 : Number(portRaw);
    if (!Number.isFinite(port) || port <= 0) {
      return res.status(400).json({ ok: false, error: "PORT_INVALID" });
    }

    if (driver === "STARPRNT") {
      return res.status(400).json({ ok: false, error: "STARPRNT_NOT_SUPPORTED_YET" });
    }

    if (driver !== "ESC_POS_TCP" && driver !== "STAR_ESC_POS_TCP") {
      return res.status(400).json({ ok: false, error: "UNKNOWN_DRIVER" });
    }

    await printEscposTest(host, port, driver as EscposDriver);
    return res.json({ ok: true });
  } catch (e: any) {
    const message = e?.message || String(e);
    const code = (e && (e.code || e.errno)) || undefined;
    let status = 500;
    let error = message;
    if (/PRINTER_TIMEOUT|PRINT_TIMEOUT/i.test(message)) { status = 504; error = "PRINTER_TIMEOUT"; }
    else if (code === "ECONNREFUSED") { status = 502; error = "PRINTER_CONNECTION_REFUSED"; }
    else if (code === "EHOSTUNREACH" || code === "ENETUNREACH") { status = 502; error = "PRINTER_UNREACHABLE"; }
    return res.status(status).json({ ok: false, error, details: { code, message } });
  }
});

export default router;
