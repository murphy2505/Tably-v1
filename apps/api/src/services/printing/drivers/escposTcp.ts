import net from "net";
import { buildEscposReceiptPayload, escposAsciiSafe, type PrinterLike, type PrintJob } from "../index";
import { escposTcpTestPrint } from "../../printer/escposTcp";

export async function printEscposTcpDriver(printer: PrinterLike, job: PrintJob): Promise<void> {
  const host = printer.host;
  const port = Number(printer.port || 9100);
  if (!host || !Number.isFinite(port)) throw new Error("PRINTER_HOST_PORT_REQUIRED");

  if (job.kind === "TEST") {
    console.log("[print][ESCPOS] start TEST", { name: printer.name, host, port });
    await escposTcpTestPrint(host, port, "ESC_POS_TCP");
    console.log("[print][ESCPOS] done TEST");
    return;
  }

  if (job.kind === "RECEIPT") {
    const driver = printer.driver === "STAR_ESC_POS_TCP" ? "STAR_ESC_POS_TCP" : "ESC_POS_TCP" as const;
    const asciiMode = printer.escposAsciiMode !== false; // default ON
    const payload = buildEscposReceiptPayload(job.payload?.order ?? job.payload, driver, asciiMode);

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

  throw new Error(`JOB_NOT_SUPPORTED:${job.kind}`);
}
