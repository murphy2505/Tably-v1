// ESC/POS command helpers for 80mm printers (Epson/Star via ESC/POS TCP)
// Minimal comments for clarity

export const ESC = 0x1b;
export const GS = 0x1d;

export function init(buf: number[]) { buf.push(ESC, 0x40); }
export function alignLeft(buf: number[]) { buf.push(ESC, 0x61, 0x00); }
export function alignCenter(buf: number[]) { buf.push(ESC, 0x61, 0x01); }
export function alignRight(buf: number[]) { buf.push(ESC, 0x61, 0x02); }
export function boldOn(buf: number[]) { buf.push(ESC, 0x45, 0x01); }
export function boldOff(buf: number[]) { buf.push(ESC, 0x45, 0x00); }
export function doubleSizeOn(buf: number[]) { buf.push(GS, 0x21, 0x11); }
export function doubleSizeOff(buf: number[]) { buf.push(GS, 0x21, 0x00); }
export function feed(buf: number[], n: number) { buf.push(ESC, 0x64, Math.max(0, Math.min(255, n))); }

export function cutFull(buf: number[]) { buf.push(GS, 0x56, 0x00); }
export function cutPartial(buf: number[]) { buf.push(GS, 0x56, 0x01); }

// Star ESC/POS compatible full cut (ESC i)
export function starCut(buf: number[]) { buf.push(ESC, 0x69); }

// Common drawer pulse: ESC p m t1 t2
export function drawerPulse(buf: number[], m: number = 0, t1: number = 0x19, t2: number = 0xFA) {
  buf.push(ESC, 0x70, m & 0xff, t1 & 0xff, t2 & 0xff);
}

// Render a horizontal separator line
export function hsep(buf: number[], width: number = 48) {
  for (let i = 0; i < width; i++) buf.push(0x2d); // '-'
  buf.push(0x0a); // newline
}
