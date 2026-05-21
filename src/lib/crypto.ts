import { formatVnd } from "@/lib/money";

const QUOTE_ASSETS = ["USDT", "USDC", "FDUSD", "BUSD", "TUSD", "DAI", "TRY", "EUR", "BRL", "BTC", "ETH", "BNB"] as const;

export const DEFAULT_USDT_VND_RATE = Number(import.meta.env.VITE_USDT_VND_RATE ?? 25_000);

export async function fetchUsdtVndRate(): Promise<number> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!res.ok) {
      throw new Error("Failed to fetch exchange rate");
    }
    const data = await res.json();
    const rate = data?.rates?.VND;
    if (typeof rate === "number" && rate > 0) {
      return rate;
    }
    return DEFAULT_USDT_VND_RATE;
  } catch (error) {
    console.warn("MJM: Lỗi khi lấy tỷ giá USD/VND, dùng tỷ giá mặc định", error);
    return DEFAULT_USDT_VND_RATE;
  }
}

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
  let normalized = value.trim().replace(/\s/g, "").replace(/[^\d,.-]/g, "");
  if (!normalized) {
    return 0;
  }

  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    const decimalIndex = Math.max(lastComma, lastDot);
    const integerPart = normalized.slice(0, decimalIndex).replace(/[.,]/g, "");
    const fractionPart = normalized.slice(decimalIndex + 1).replace(/[.,]/g, "");
    normalized = `${integerPart}.${fractionPart}`;
  } else if (lastComma !== -1) {
    normalized = normalized.replace(",", ".");
  } else if ((normalized.match(/\./g) ?? []).length > 1) {
    const parts = normalized.split(".");
    normalized = `${parts.slice(0, -1).join("")}.${parts.at(-1) ?? ""}`;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatUsdt(amount: number, opts?: { signed?: boolean; minimumFractionDigits?: number; maximumFractionDigits?: number }) {
  const absolute = Math.abs(amount);
  const nf = new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: opts?.minimumFractionDigits ?? 0,
    maximumFractionDigits: opts?.maximumFractionDigits ?? (absolute >= 1 ? 2 : 6)
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
  const nf = new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: opts?.minimumFractionDigits ?? 0,
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
