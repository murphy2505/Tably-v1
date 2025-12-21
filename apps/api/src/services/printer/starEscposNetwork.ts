/*
  Star via ESC/POS Network (raw TCP) without Star SDK.
  Configure printer to listen on RAW/TCP port 9100.

  Env settings (defaults applied when missing):
  - STAR_PRINTER_IP=192.168.2.13
  - STAR_PRINTER_PORT=9100
  - STAR_FEED_BEFORE_CUT=3
  - STAR_CUT_MODE=full            // full|partial|none
  - STAR_DRAWER_ENABLED=true      // true|false
  - STAR_DRAWER_PIN=2             // 2 or 5
  - STAR_CONNECT_TIMEOUT_MS=2500  // socket open timeout
*/

export type StarSettings = {
  ip: string;
  port: number;
  feedBeforeCut: number;
  cutMode: "full" | "partial" | "none";
  drawerEnabled: boolean;
  drawerPin: 2 | 5;
  connectTimeoutMs: number;
};

function parseBool(v: any, def: boolean): boolean {
  if (v == null) return def;
  const s = String(v).toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return def;
}

export function getStarSettingsFromEnv(): StarSettings {
  const ip = process.env.STAR_PRINTER_IP || "192.168.2.13";
  const port = Number(process.env.STAR_PRINTER_PORT || 9100);
  const feedBeforeCut = Number(process.env.STAR_FEED_BEFORE_CUT || 3);
  const cutModeRaw = (process.env.STAR_CUT_MODE || "full").toLowerCase();
  const cutMode: "full" | "partial" | "none" = cutModeRaw === "partial" ? "partial" : cutModeRaw === "none" ? "none" : "full";
  const drawerEnabled = parseBool(process.env.STAR_DRAWER_ENABLED, true);
  const drawerPinRaw = Number(process.env.STAR_DRAWER_PIN || 2);
  const drawerPin: 2 | 5 = drawerPinRaw === 5 ? 5 : 2;
  const connectTimeoutMs = Number(process.env.STAR_CONNECT_TIMEOUT_MS || 2500);
  return { ip, port, feedBeforeCut, cutMode, drawerEnabled, drawerPin, connectTimeoutMs };
}

type Any = any;

function loadEscpos(): { escpos: Any; Network: Any } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const escpos = require("escpos");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Network = require("escpos-network");
    escpos.Network = Network;
    return { escpos, Network };
  } catch (e) {
    const err = new Error("ESC_POS_LIB_NOT_INSTALLED");
    (err as Any).cause = e;
    throw err;
  }
}

async function withStarPrinter<T>(settings: StarSettings, fn: (ctx: { escpos: Any; device: Any; printer: Any }) => Promise<T>): Promise<T> {
  if (!settings.ip || !Number.isFinite(settings.port)) {
    const err = new Error("STAR_PRINTER_IP_REQUIRED");
    (err as Any).status = 400;
    throw err;
  }
  const { escpos } = loadEscpos();
  const device = new escpos.Network(settings.ip, settings.port);
  return new Promise<T>((resolve, reject) => {
    let done = false;
    const finish = (err?: any, val?: T) => { if (done) return; done = true; try { device.close?.(); } catch {} err ? reject(err) : resolve(val as T); };
    const to = setTimeout(() => finish(new Error("STAR_CONNECT_TIMEOUT")), settings.connectTimeoutMs);
    device.open(async (err: any) => {
      clearTimeout(to);
      if (err) {
        const code = err?.code;
        if (code === "ECONNREFUSED") return finish(new Error("STAR_CONNECT_REFUSED"));
        if (code === "EHOSTUNREACH" || code === "ENETUNREACH") return finish(new Error("STAR_HOST_UNREACHABLE"));
        return finish(err);
      }
      try {
        const printer = new escpos.Printer(device);
        const val = await fn({ escpos, device, printer });
        try { printer.close?.(); } catch {}
        return finish(undefined, val);
      } catch (e) {
        return finish(e);
      }
    });
  });
}

function feedLines(device: Any, n: number) {
  const lines = Math.max(0, Math.min(255, Number(n || 0)));
  if (lines <= 0) return;
  // ESC d n — feed n lines
  const ESC = 0x1b;
  device.write(Buffer.from([ESC, 0x64, lines]));
}

function starCut(device: Any, mode: "full" | "partial" | "none") {
  if (mode === "none") return;
  const ESC = 0x1b;
  // Star ESC/POS: full cut = ESC i (0x1B 0x69), partial cut = ESC m (0x1B 0x6D)
  const cmd = mode === "partial" ? [ESC, 0x6d] : [ESC, 0x69];
  device.write(Buffer.from(cmd));
}

function cashDrawer(device: Any, pin: 2 | 5) {
  // ESC p m t1 t2 — Kick drawer; m=0 or 1 selects connector
  const ESC = 0x1b;
  const m = pin === 5 ? 1 : 0;
  const t1 = 64; // pulse ON time
  const t2 = 64; // pulse OFF time
  device.write(Buffer.from([ESC, 0x70, m, t1, t2]));
}

export async function printStarTestReceipt(tenantId?: string): Promise<void> {
  const s = getStarSettingsFromEnv();
  console.log("[printer.star] test", { tenantId, ip: s.ip, port: s.port, cutMode: s.cutMode, feedBeforeCut: s.feedBeforeCut });
  await withStarPrinter(s, async ({ escpos, device, printer }) => {
    printer.align("ct");
    printer.style("b");
    printer.size(2, 2);
    printer.text("Tably — Star test\n");
    printer.size(1, 1);
    printer.style("normal");
    printer.text(`Doel: ${s.ip}:${s.port}\n`);
    if (tenantId) printer.text(`Tenant: ${tenantId}\n`);
    printer.text(`${new Date().toLocaleString("nl-NL")}\n`);
    printer.text("------------------------------------------\n");
    feedLines(device, 1);
    feedLines(device, s.feedBeforeCut);
    starCut(device, s.cutMode);
  });
}

export async function starCutTest(tenantId?: string): Promise<void> {
  const s = getStarSettingsFromEnv();
  console.log("[printer.star] cut-test", { tenantId, ip: s.ip, port: s.port, cutMode: s.cutMode, feedBeforeCut: s.feedBeforeCut });
  await withStarPrinter(s, async ({ device }) => {
    feedLines(device, s.feedBeforeCut);
    starCut(device, s.cutMode);
  });
}

export async function starDrawerTest(tenantId?: string): Promise<void> {
  const s = getStarSettingsFromEnv();
  console.log("[printer.star] drawer-test", { tenantId, ip: s.ip, port: s.port, drawerEnabled: s.drawerEnabled, drawerPin: s.drawerPin });
  if (!s.drawerEnabled) {
    const err = new Error("STAR_DRAWER_DISABLED");
    (err as Any).status = 400;
    throw err;
  }
  await withStarPrinter(s, async ({ device }) => {
    cashDrawer(device, s.drawerPin);
  });
}
