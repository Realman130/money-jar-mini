export function formatVnd(amount: number, opts?: { signed?: boolean }): string {
  const abs = Math.abs(Math.round(amount));
  const fmt = new Intl.NumberFormat("vi-VN").format(abs);
  if (opts?.signed && amount > 0) {
    return `+${fmt}`;
  }
  if (opts?.signed && amount < 0) {
    return `-${new Intl.NumberFormat("vi-VN").format(abs)}`;
  }
  return fmt;
}

export function parseAmountToken(numStr: string, unitRaw: string): number | null {
  const numberPart = numStr.replace(",", ".");
  const unit = unitRaw.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const base = Number.parseFloat(numberPart);
  if (!Number.isFinite(base) || base <= 0) {
    return null;
  }
  let amount = Math.round(base);
  if (unit === "k" || unit === "nghin") {
    amount = Math.round(base * 1_000);
  } else if (unit === "tr" || unit === "trieu" || unit === "m") {
    amount = Math.round(base * 1_000_000);
  }
  return amount;
}
