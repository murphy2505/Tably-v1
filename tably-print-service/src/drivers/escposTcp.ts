import net from "node:net";

function textLine(s: string): Buffer {
  const safe = s.replace(/[\u2013\u2014]/g, "-"); // replace en/em dashes to ASCII dash
  return Buffer.from(safe + "\n", "ascii");
}

export type EscposDriver = "ESC_POS_TCP" | "STAR_ESC_POS_TCP";

export async function printEscposTest(host: string, port: number, driver: EscposDriver = "ESC_POS_TCP"): Promise<void> {
  const socket = new net.Socket();

  const chunks: Buffer[] = [];
  const ESC = 0x1b;
  const GS = 0x1d;

  const cmd = (arr: number[]) => chunks.push(Buffer.from(arr));
  const writeText = (s: string) => chunks.push(textLine(s));

  // Initialize
  cmd([ESC, 0x40]);

  // Align center
  cmd([ESC, 0x61, 0x01]);

  // Double size
  cmd([GS, 0x21, 0x11]);
  writeText("Tably — Testbon");
  // Reset size
  cmd([GS, 0x21, 0x00]);

  // Spacing
  writeText("");

  // Left align
  cmd([ESC, 0x61, 0x00]);

  writeText("Protocol: ESC/POS TCP — OK");
  writeText(`Target: ${host}:${port}`);
  writeText(`Date: ${new Date().toLocaleString()}`);

  // Feed and cut: depend on driver
  if (driver === "STAR_ESC_POS_TCP") {
    // Star ESC/POS compatibility cut sequence:
    // Feed: ESC d 03 (1B 64 03)
    // Cut:  ESC i    (1B 69)
    cmd([ESC, 0x64, 0x03]);
    cmd([ESC, 0x69]);
  } else {
    // Epson-style GS V full cut
    cmd([ESC, 0x64, 0x05]); // feed 5 lines
    cmd([GS, 0x56, 0x42, 0x00]); // full cut
  }

  const payload = Buffer.concat(chunks);

  await new Promise<void>((resolve, reject) => {
    let done = false;
    let writeSucceeded = false;

    const finish = (err?: Error) => {
      if (done) return;
      done = true;
      try { socket.end(); } catch { /* noop */ }
      err ? reject(err) : resolve();
    };

    socket.setTimeout(3000);

    socket.once("timeout", () => {
      // Some printers keep the TCP session open; if we already wrote successfully,
      // consider a timeout as success to prevent false negatives.
      if (writeSucceeded) return finish();
      return finish(new Error("PRINTER_TIMEOUT"));
    });
    socket.once("error", (err: any) => {
      // Many ESC/POS printers hard-close the TCP connection causing ECONNRESET/EPIPE
      // after successfully receiving the payload. Treat that as success if write completed.
      const code = err?.code;
      if (writeSucceeded && (code === "ECONNRESET" || code === "EPIPE")) return finish();
      return finish(err);
    });
    socket.once("close", () => finish());

    socket.connect(port, host, () => {
      socket.write(payload, (err?: Error | null) => {
        if (err) return finish(err || undefined);
        writeSucceeded = true;
        // Let the printer process the buffer, then end our side gracefully
        setTimeout(() => {
          try { socket.end(); } catch { /* noop */ }
        }, 100);
      });
    });
  });
}
