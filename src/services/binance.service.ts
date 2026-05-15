const BINANCE_BASE_URLS = ["https://data-api.binance.vision", "https://api.binance.com", "https://api-gcp.binance.com"];

type BinancePriceResponse = { symbol: string; price: string };
type BinanceTicker24hResponse = {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  lastPrice: string;
  quoteVolume: string;
};

export interface BinanceTicker24hQuote {
  symbol: string;
  price_change_usdt: number | null;
  price_change_percent_24h: number | null;
  last_price_usdt: number | null;
  quote_volume_usdt: number | null;
}

function uniqueSymbols(symbols: string[]) {
  return [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))];
}

function buildSymbolsParam(symbols: string[]) {
  return JSON.stringify(uniqueSymbols(symbols));
}

async function requestJson<T>(path: string, searchParams?: Record<string, string>) {
  const errors: string[] = [];

  for (const baseUrl of BINANCE_BASE_URLS) {
    const url = new URL(path, baseUrl);
    for (const [key, value] of Object.entries(searchParams ?? {})) {
      url.searchParams.set(key, value);
    }

    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), 8_000);

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          accept: "application/json"
        },
        cache: "no-store"
      });
      if (!response.ok) {
        errors.push(`${new URL(baseUrl).host}: ${response.status} ${response.statusText}`.trim());
        continue;
      }
      return (await response.json()) as T;
    } catch (error) {
      errors.push(`${new URL(baseUrl).host}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }

  throw new Error(errors[0] ?? "Không lấy được giá từ Binance");
}

function rowsToArray<T>(data: T | T[] | null | undefined) {
  if (!data) {
    return [];
  }
  return Array.isArray(data) ? data : [data];
}

export async function fetchBinancePriceMap(symbols: string[]) {
  const unique = uniqueSymbols(symbols);
  if (unique.length === 0) {
    return new Map<string, number>();
  }

  const data = await requestJson<BinancePriceResponse[] | BinancePriceResponse>("/api/v3/ticker/price", {
    symbols: buildSymbolsParam(unique)
  });

  return new Map(
    rowsToArray(data).map((row) => [
      row.symbol.toUpperCase(),
      Number.isFinite(Number(row.price)) ? Number(row.price) : 0
    ])
  );
}

export async function fetchBinance24hMap(symbols: string[]) {
  const unique = uniqueSymbols(symbols);
  if (unique.length === 0) {
    return new Map<string, BinanceTicker24hQuote>();
  }

  const data = await requestJson<BinanceTicker24hResponse[] | BinanceTicker24hResponse>("/api/v3/ticker/24hr", {
    symbols: buildSymbolsParam(unique)
  });

  return new Map(
    rowsToArray(data).map((row) => {
      const priceChange = Number(row.priceChange);
      const priceChangePercent = Number(row.priceChangePercent);
      const lastPrice = Number(row.lastPrice);
      const quoteVolume = Number(row.quoteVolume);
      return [
        row.symbol.toUpperCase(),
        {
          symbol: row.symbol.toUpperCase(),
          price_change_usdt: Number.isFinite(priceChange) ? priceChange : null,
          price_change_percent_24h: Number.isFinite(priceChangePercent) ? priceChangePercent : null,
          last_price_usdt: Number.isFinite(lastPrice) ? lastPrice : null,
          quote_volume_usdt: Number.isFinite(quoteVolume) ? quoteVolume : null
        }
      ];
    })
  );
}

export async function fetchBinanceMarketData(symbols: string[]) {
  const unique = uniqueSymbols(symbols);
  if (unique.length === 0) {
    return {
      priceMap: new Map<string, number>(),
      ticker24hMap: new Map<string, BinanceTicker24hQuote>()
    };
  }

  const [priceMap, ticker24hMap] = await Promise.all([fetchBinancePriceMap(unique), fetchBinance24hMap(unique)]);
  return { priceMap, ticker24hMap };
}
