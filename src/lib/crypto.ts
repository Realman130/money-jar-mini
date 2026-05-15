import { formatVnd } from "@/lib/money";

const QUOTE_ASSETS = ["USDT", "USDC", "FDUSD", "BUSD", "TUSD", "DAI", "TRY", "EUR", "BRL", "BTC", "ETH", "BNB"] as const;

export const DEFAULT_USDT_VND_RATE = Number(import.meta.env.VITE_USDT_VND_RATE ?? 25_000);

function cleanAssetCode(raw: string) {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s._-]+/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

export function normalizeInvestmentSymbol(raw: string, defaultQuote = "USDT") {
  const cleaned = cleanAssetCode(raw);
  if (!cleaned) {
    return { assetCode: "", marketSymbol: "", quoteAsset: defaultQuote };
  }
  if (cleaned === defaultQuote) {
    return { assetCode: cleaned, marketSymbol: cleaned, quoteAsset: defaultQuote };
  }

  const quoteAsset = [...QUOTE_ASSETS]
    .sort((a, b) => b.length - a.length)
    .find((suffix) => cleaned.endsWith(suffix));

  if (quoteAsset && cleaned.length > quoteAsset.length) {
    return {
      assetCode: cleaned.slice(0, -quoteAsset.length),
      marketSymbol: cleaned,
      quoteAsset
    };
  }

  return {
    assetCode: cleaned,
    marketSymbol: `${cleaned}${defaultQuote}`,
    quoteAsset: defaultQuote
  };
}

export function parseNumericInput(value: string) {
  const normalized = value.trim().replace(/[\s,]/g, "");
  if (!normalized) {
    return 0;
  }
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatUsdt(amount: number, opts?: { signed?: boolean; minimumFractionDigits?: number; maximumFractionDigits?: number }) {
  const nf = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: opts?.minimumFractionDigits ?? 2,
    maximumFractionDigits: opts?.maximumFractionDigits ?? 4
  });
  const value = nf.format(Math.abs(amount));
  if (opts?.signed && amount > 0) {
    return `+${value}`;
  }
  if (opts?.signed && amount < 0) {
    return `-${value}`;
  }
  return value;
}

export function formatUsdtVndApprox(amountUsdt: number, rate = DEFAULT_USDT_VND_RATE) {
  return formatVnd(Math.round(amountUsdt * rate));
}

export function formatPercent(value: number, opts?: { signed?: boolean; minimumFractionDigits?: number; maximumFractionDigits?: number }) {
  const nf = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: opts?.minimumFractionDigits ?? 2,
    maximumFractionDigits: opts?.maximumFractionDigits ?? 2
  });
  const formatted = nf.format(Math.abs(value));
  if (opts?.signed && value > 0) {
    return `+${formatted}%`;
  }
  if (opts?.signed && value < 0) {
    return `-${formatted}%`;
  }
  return `${formatted}%`;
}
