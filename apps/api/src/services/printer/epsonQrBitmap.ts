import escpos from "escpos";
import { createCanvas } from "canvas";
import QRCode from "qrcode";
import os from "os";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

async function qrPngToTempFile(text: string, sizePx = 260): Promise<string> {
  const canvas = createCanvas(sizePx, sizePx);

  await QRCode.toCanvas(canvas as any, text, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: sizePx,
  });

  const png = canvas.toBuffer("image/png");
  const filename = `tably-qr-${crypto.randomUUID()}.png`;
  const filepath = path.join(os.tmpdir(), filename);

  await fs.writeFile(filepath, png);
  return filepath;
}

export async function printQrAsImage(printer: any, text: string) {
  const filePath = await qrPngToTempFile(text, 260);

  return new Promise<void>((resolve, reject) => {
    escpos.Image.load(filePath, (img: any) => {
      if (!img) return reject(new Error("QR_IMAGE_LOAD_FAILED"));
      printer.align("CT");
      printer.raster(img); // <- dit verwacht escpos.Image
      resolve();
    });
  }).finally(async () => {
    // cleanup (best effort)
    try {
      await fs.unlink(filePath);
    } catch {}
  });
}
