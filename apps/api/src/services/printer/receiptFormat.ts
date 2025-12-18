export type ReceiptItem = {
  qty: number;          // 1,2,3...
  name: string;         // "Friet klein"
  priceCents?: number;  // optioneel
};

function safeText(text: string) {
  return String(text)
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/€/g, "EUR");
}

function formatMoneyEUR(cents: number): string {
  const v = (cents / 100).toFixed(2).replace(".", ",");
  return `${v} EUR`;
}

// 80mm: simpele monospaced kolommen (links qty+naam, rechts prijs)
export function formatReceiptLines(items: ReceiptItem[], width = 42): string[] {
  const lines: string[] = [];

  for (const it of items) {
    const left = safeText(`${it.qty} ${it.name}`); // qty vóór product, geen "x"
    const right = it.priceCents != null ? formatMoneyEUR(it.priceCents) : "";

    const spaceCount = Math.max(1, width - left.length - right.length);
    lines.push(left + " ".repeat(spaceCount) + right);
  }

  return lines;
}

export function safeLines(lines: string[]): string[] {
  return lines.map(safeText);
}
