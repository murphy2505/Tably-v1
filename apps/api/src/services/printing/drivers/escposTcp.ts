import net from "net";
import { escposAsciiSafe, type PrinterLike, type PrintJob } from "../index";
import { escposTcpTestPrint } from "../../printer/escposTcp";
import { buildReceipt80, buildTestCut, type DriverKind } from "../../printer/receiptTemplate";

export async function printEscposTcpDriver(printer: PrinterLike, job: PrintJob): Promise<void> {
  const host = printer.host;
  const port = Number(printer.port || 9100);
  if (!host || !Number.isFinite(port)) throw new Error("PRINTER_HOST_PORT_REQUIRED");

  if (job.kind === "TEST") {
    console.log("[print][ESCPOS] start TEST", { name: printer.name, host, port });
    const driver = printer.driver === "STAR_ESC_POS_TCP" ? "STAR_ESC_POS_TCP" : "ESC_POS_TCP" as const;
    await escposTcpTestPrint(host, port, driver);
    console.log("[print][ESCPOS] done TEST");
    return;
  }

  if (job.kind === "RECEIPT") {
    const driver: DriverKind = printer.driver === "STAR_ESC_POS_TCP" ? "STAR_ESC_POS_TCP" : "ESC_POS_TCP";
    const asciiMode = printer.escposAsciiMode !== false; // default ON
    const tenant = job.payload?.tenant ?? { name: "Cafetaria Centrum" };
    const raw = job.payload?.order ?? job.payload ?? {};
    const lines = Array.isArray(raw.lines)
      ? raw.lines.map((l: any) => ({ name: l.title ?? l.name ?? "Item", qty: Number(l.qty ?? 1), unitPriceCents: Number(l.priceCents ?? l.unitPriceCents ?? 0) }))
      : [];
    const subtotal = typeof raw.subtotalExclVatCents === "number" ? raw.subtotalExclVatCents : lines.reduce((s, l) => s + l.qty * l.unitPriceCents, 0);
    const total = typeof raw.totalInclVatCents === "number" ? raw.totalInclVatCents : subtotal;
    const vat = typeof raw.vatCents === "number" ? raw.vatCents : (total - subtotal);
    const order = {
      label: raw.receiptLabel ?? raw.draftLabel ?? raw.label ?? (raw.id ? String(raw.id).slice(-6) : "Test"),
      createdAt: raw.createdAt ?? new Date(),
      customerName: raw.customer?.name ?? null,
      tableName: null,
      lines,
      totals: { subtotalExVatCents: subtotal, vatCents: vat, totalInclVatCents: total, vatLabel: "BTW" },
      payment: { method: raw.paymentMethod ?? "PIN", paidAt: raw.paidAt ?? null },
    };
    const payload = buildReceipt80({ tenant, order, driver, asciiMode });

    console.log("[print][ESCPOS] connect", { name: printer.name, host, port });
    await new Promise<void>((resolve, reject) => {
      const socket = new net.Socket();
      let writeOk = false;
      let settled = false;
      const finish = (err?: any) => { if (settled) return; settled = true; try { socket.end(); } catch {} err ? reject(err) : resolve(); };
      socket.setTimeout(4000);
      socket.once("timeout", () => {
        if (writeOk) { console.log("[print][ESCPOS] timeout after write — success"); return finish(); }
        console.error("[print][ESCPOS] timeout before write");
        return finish(new Error("PRINT_TIMEOUT"));
      });
      socket.once("error", (err: any) => {
        const code = err?.code; console.error("[print][ESCPOS] error", { code, message: err?.message || String(err) });
        if (writeOk && (code === "ECONNRESET" || code === "EPIPE")) { console.log("[print][ESCPOS] post-write error treated as success", code); return finish(); }
        return finish(err);
      });
      socket.once("close", () => { console.log("[print][ESCPOS] close"); finish(); });
      socket.connect(port, host, () => {
        console.log("[print][ESCPOS] connected");
        console.log("[print][ESCPOS] encoding", { asciiMode, bytes: payload.length });
        socket.write(payload, (err) => {
          if (err) return finish(err);
          writeOk = true;
          console.log("[print][ESCPOS] write ok, ending");
          setTimeout(() => { try { socket.end(); } catch {} }, 100);
        });
      });
    });
    console.log("[print][ESCPOS] done RECEIPT");
    return;
  }

  if ((job as any).kind === "TEST_CUT") {
    const driver: DriverKind = printer.driver === "STAR_ESC_POS_TCP" ? "STAR_ESC_POS_TCP" : "ESC_POS_TCP";
    const payload = buildTestCut(driver);
    console.log("[print][ESCPOS] connect", { name: printer.name, host, port });
    await new Promise<void>((resolve, reject) => {
      const socket = new net.Socket();
      let writeOk = false; let settled = false;
      const finish = (err?: any) => { if (settled) return; settled = true; try { socket.end(); } catch {} err ? reject(err) : resolve(); };
      socket.setTimeout(4000);
      socket.once("timeout", () => { if (writeOk) return finish(); return finish(new Error("PRINT_TIMEOUT")); });
      socket.once("error", (err: any) => { if (writeOk && (err?.code === "ECONNRESET" || err?.code === "EPIPE")) return finish(); return finish(err); });
      socket.once("close", () => finish());
      socket.connect(port, host, () => {
        socket.write(payload, (err) => { if (err) return finish(err); writeOk = true; setTimeout(() => { try { socket.end(); } catch {} }, 100); });
      });
    });
    console.log("[print][ESCPOS] done TEST_CUT");
    return;
  }

  throw new Error(`JOB_NOT_SUPPORTED:${job.kind}`);
}

// Helper: send arbitrary ESC/POS payload to host:port
export async function sendEscposTcpRaw(host: string, port: number, payload: Buffer): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const socket = new net.Socket();
    let writeOk = false; let settled = false;
    const finish = (err?: any) => { if (settled) return; settled = true; try { socket.end(); } catch {} err ? reject(err) : resolve(); };
    socket.setTimeout(4000);
    socket.once("timeout", () => { if (writeOk) return finish(); return finish(new Error("PRINT_TIMEOUT")); });
    socket.once("error", (err: any) => { if (writeOk && (err?.code === "ECONNRESET" || err?.code === "EPIPE")) return finish(); return finish(err); });
    socket.once("close", () => finish());
    socket.connect(port, host, () => {
      socket.write(payload, (err) => { if (err) return finish(err); writeOk = true; setTimeout(() => { try { socket.end(); } catch {} }, 100); });
    });
  });
}
