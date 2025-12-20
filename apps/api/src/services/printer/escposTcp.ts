import net from "net";

export type EscposDriver = "ESC_POS_TCP" | "STAR_ESC_POS_TCP";

function buildEscposTest(ip: string, driver: EscposDriver = "ESC_POS_TCP"): Buffer {
  const lines: number[] = [];
  function push(...nums: number[]) { lines.push(...nums); }
  function text(s: string) { lines.push(...Buffer.from(s, "utf8")); }

  // Initialize
  push(0x1b, 0x40);
  // Bold on
  push(0x1b, 0x45, 0x01);
  text("Tably – Test bon\n");
  // Bold off
  push(0x1b, 0x45, 0x00);
  text(`ESC/POS TCP printer test\n`);
  text(`Driver: ${driver}\n`);
  text(`IP: ${ip}\n`);
  text(`Status: OK (if you see this)\n\n`);
  // Feed a few lines
  text("\n\n");
  // Cut depends on driver
  if (driver === "STAR_ESC_POS_TCP") {
    // Star ESC/POS compatibility: feed few lines then ESC i
    push(0x1b, 0x64, 0x03); // ESC d 03
    push(0x1b, 0x69);       // ESC i (full cut)
  } else {
    // Epson-style GS V full cut
    push(0x1b, 0x64, 0x05);   // ESC d 05 feed
    push(0x1d, 0x56, 0x00);   // GS V 0 full cut
  }

  return Buffer.from(lines);
}

export async function escposTcpTestPrint(host: string, port: number = 9100, driver: EscposDriver = "ESC_POS_TCP"): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;
    let writeSucceeded = false;

    const timeoutMs = 5000;
    const onError = (err: any) => {
      if (settled) return;
      // Many printers hard-close with ECONNRESET/EPIPE after a successful write
      const code = (err && err.code) || undefined;
      if (writeSucceeded && (code === "ECONNRESET" || code === "EPIPE")) {
        settled = true;
        try { socket.end(); } catch {}
        return resolve();
      }
      settled = true;
      try { socket.destroy(); } catch {}
      reject(err);
    };
    const onClose = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    socket.setTimeout(timeoutMs);
    socket.once("timeout", () => {
      if (writeSucceeded) {
        // Treat post-write timeouts as success
        return onClose();
      }
      return onError(new Error("PRINT_TIMEOUT"));
    });
    socket.once("error", onError);
    socket.once("close", onClose);

    socket.connect(port, host, () => {
      try {
        const payload = buildEscposTest(host, driver);
        socket.write(payload, (err) => {
          if (err) return onError(err);
          writeSucceeded = true;
          // End the connection; 'close' will resolve
          socket.end();
        });
      } catch (e) {
        onError(e);
      }
    });
  });
}
