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

export function parseAmountToken(numStr: string, unitRaw: string, compactSuffixRaw = ""): number | null {
  const numberPart = numStr.replace(",", ".");
  const unit = unitRaw.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const compactSuffix = compactSuffixRaw.trim();
  const base = Number.parseFloat(numberPart);
  if (!Number.isFinite(base) || base <= 0) {
    return null;
  }

  const hasCompactSuffix = compactSuffix.length > 0 && /^\d{1,3}$/.test(compactSuffix);
  const compactFraction = hasCompactSuffix ? Number.parseInt(compactSuffix, 10) / 10 ** compactSuffix.length : 0;

  let amount = Math.round(base);
  if (unit === "k" || unit === "nghin") {
    amount = Math.round((base + compactFraction) * 1_000);
  } else if (unit === "tr" || unit === "trieu" || unit === "m") {
    amount = Math.round((base + compactFraction) * 1_000_000);
  }
  return amount;
}
