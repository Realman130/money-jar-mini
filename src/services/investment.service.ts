import { supabase } from "@/lib/supabase";
import { formatErrorMessage } from "@/lib/error";
import { normalizeInvestmentSymbol } from "@/lib/crypto";
import { fetchBinanceMarketData, type BinanceTicker24hQuote } from "@/services/binance.service";
import type {
  InvestmentPortfolioOverview,
  InvestmentPortfolioSummary,
  InvestmentPositionRow,
  InvestmentPositionSnapshot,
  InvestmentPriceRow
} from "@/types/domain";

function toNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parsePositionRow(row: Record<string, unknown>): InvestmentPositionRow {
  return {
    id: String(row.id),
    telegram_user_id: toNumber(row.telegram_user_id),
    asset_code: String(row.asset_code ?? "").toUpperCase(),
    asset_name: String(row.asset_name ?? ""),
    market_symbol: String(row.market_symbol ?? "").toUpperCase(),
    exchange_name: String(row.exchange_name ?? "Binance"),
    quantity: toNumber(row.quantity),
    avg_cost_usdt: toNumber(row.avg_cost_usdt),
    note: String(row.note ?? ""),
    sort_order: toNumber(row.sort_order),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    deleted_at: row.deleted_at == null ? null : String(row.deleted_at)
  };
}

function emptySummary(): InvestmentPortfolioSummary {
  return {
    total_positions: 0,
    total_quantity: 0,
    total_cost_usdt: 0,
    total_market_value_usdt: 0,
    net_pnl_usdt: 0,
    net_pnl_percent: null,
    pnl_24h_usdt: 0
  };
}

function isMissingInvestmentSchemaError(error: unknown) {
  const message = formatErrorMessage(error).toLowerCase();
  return (
    message.includes("investment_positions") &&
    (message.includes("schema cache") || message.includes("could not find the table") || message.includes("does not exist"))
  );
}

function investmentSchemaHint() {
  return "Chưa chạy schema đầu tư. Hãy áp dụng sql/008_investments.sql và sql/007_mjm_rls_dev.sql trên Supabase.";
}

export async function fetchInvestmentPositions(uid: number) {
  const { data, error } = await supabase
    .from("investment_positions")
    .select("id, telegram_user_id, asset_code, asset_name, market_symbol, exchange_name, quantity, avg_cost_usdt, note, sort_order, created_at, updated_at, deleted_at")
    .eq("telegram_user_id", uid)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    if (isMissingInvestmentSchemaError(error)) {
      throw new Error(investmentSchemaHint());
    }
    throw error;
  }
  return (data ?? []).map((row) => parsePositionRow(row as Record<string, unknown>));
}

export async function saveInvestmentPosition(
  uid: number,
  input: {
    asset_code: string;
    asset_name: string;
    quantity: number;
    avg_cost_usdt: number;
    exchange_name?: string;
    note?: string;
    sort_order?: number;
  }
) {
  const normalized = normalizeInvestmentSymbol(input.asset_code);
  if (!normalized.assetCode) {
    throw new Error("Thiếu mã coin");
  }
  if (!(input.quantity > 0)) {
    throw new Error("Số lượng phải lớn hơn 0");
  }
  const payload = {
    telegram_user_id: uid,
    asset_code: normalized.assetCode,
    asset_name: input.asset_name.trim() || normalized.assetCode,
    market_symbol: normalized.marketSymbol,
    exchange_name: input.exchange_name?.trim() || "Binance",
    quantity: input.quantity,
    avg_cost_usdt: input.avg_cost_usdt,
    note: input.note?.trim() ?? "",
    sort_order: input.sort_order ?? 0,
    deleted_at: null
  };

  const { data, error } = await supabase
    .from("investment_positions")
    .upsert(payload, { onConflict: "telegram_user_id,market_symbol" })
    .select("id, telegram_user_id, asset_code, asset_name, market_symbol, exchange_name, quantity, avg_cost_usdt, note, sort_order, created_at, updated_at, deleted_at")
    .single();

  if (error) {
    if (isMissingInvestmentSchemaError(error)) {
      throw new Error(investmentSchemaHint());
    }
    throw error;
  }

  return parsePositionRow(data as Record<string, unknown>);
}

export async function deleteInvestmentPosition(id: string) {
  const { error } = await supabase.from("investment_positions").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) {
    if (isMissingInvestmentSchemaError(error)) {
      throw new Error(investmentSchemaHint());
    }
    throw error;
  }
}

async function syncInvestmentPriceCache(rows: InvestmentPriceRow[]) {
  if (rows.length === 0) {
    return;
  }
  const { error } = await supabase
    .from("investment_price_cache")
    .upsert(rows.map((row) => ({ ...row, updated_at: new Date().toISOString() })), { onConflict: "symbol" });
  if (error) {
    throw error;
  }
}

export async function fetchInvestmentOverview(uid: number): Promise<InvestmentPortfolioOverview> {
  const updated_at = new Date().toISOString();
  let positions: InvestmentPositionRow[] = [];

  try {
    positions = await fetchInvestmentPositions(uid);
  } catch (error) {
    if (formatErrorMessage(error) === investmentSchemaHint()) {
      return {
        positions: [],
        summary: emptySummary(),
        quote_warning: investmentSchemaHint(),
        updated_at
      };
    }
    throw error;
  }

  if (positions.length === 0) {
    return {
      positions: [],
      summary: emptySummary(),
      quote_warning: null,
      updated_at
    };
  }

  const symbols = positions.map((position) => position.market_symbol);
  let quoteWarning: string | null = null;
  let priceMap = new Map<string, number>();
  let tickerMap = new Map<string, BinanceTicker24hQuote>();

  try {
    const market = await fetchBinanceMarketData(symbols);
    priceMap = market.priceMap;
    tickerMap = market.ticker24hMap;

    const cacheRows: InvestmentPriceRow[] = [...priceMap.entries()].map(([symbol, price]) => {
      const ticker = tickerMap.get(symbol);
      return {
        symbol,
        price_usdt: price,
        price_change_percent_24h: ticker?.price_change_percent_24h ?? null,
        quote_volume_usdt: ticker?.quote_volume_usdt ?? null,
        source: "binance",
        updated_at
      };
    });

    try {
      await syncInvestmentPriceCache(cacheRows);
    } catch (cacheError) {
      const cacheWarning = formatErrorMessage(cacheError);
      quoteWarning = quoteWarning ? `${quoteWarning} · Cache: ${cacheWarning}` : `Không đồng bộ cache giá: ${cacheWarning}`;
    }

    const missing = symbols.filter((symbol) => !priceMap.has(symbol));
    if (missing.length > 0) {
      quoteWarning = `Chưa có giá live cho ${missing.slice(0, 3).join(", ")}`;
    }
  } catch (error) {
    quoteWarning = `Không lấy được giá live từ Binance: ${formatErrorMessage(error)}`;
  }

  const snapshots: InvestmentPositionSnapshot[] = positions.map((position) => {
    const marketPrice = priceMap.get(position.market_symbol) ?? null;
    const ticker = tickerMap.get(position.market_symbol);
    const livePrice = marketPrice ?? position.avg_cost_usdt;
    const costBasis = position.quantity * position.avg_cost_usdt;
    const marketValue = position.quantity * livePrice;
    const netPnl = marketValue - costBasis;
    const netPnlPercent = costBasis > 0 ? (netPnl / costBasis) * 100 : null;
    const pnl24h = ticker?.price_change_percent_24h != null ? marketValue * (ticker.price_change_percent_24h / 100) : 0;

    return {
      ...position,
      market_price_usdt: marketPrice,
      price_change_percent_24h: ticker?.price_change_percent_24h ?? null,
      market_value_usdt: marketValue,
      cost_basis_usdt: costBasis,
      net_pnl_usdt: netPnl,
      net_pnl_percent: netPnlPercent,
      pnl_24h_usdt: pnl24h
    };
  });

  const summary = snapshots.reduce<InvestmentPortfolioSummary>(
    (acc, position) => {
      acc.total_positions += 1;
      acc.total_quantity += position.quantity;
      acc.total_cost_usdt += position.cost_basis_usdt;
      acc.total_market_value_usdt += position.market_value_usdt;
      acc.net_pnl_usdt += position.net_pnl_usdt;
      acc.pnl_24h_usdt += position.pnl_24h_usdt;
      return acc;
    },
    emptySummary()
  );

  summary.net_pnl_percent = summary.total_cost_usdt > 0 ? (summary.net_pnl_usdt / summary.total_cost_usdt) * 100 : null;

  return {
    positions: snapshots.sort((a, b) => b.market_value_usdt - a.market_value_usdt),
    summary,
    quote_warning: quoteWarning,
    updated_at
  };
}
