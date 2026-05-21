import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { MetricCard, Pill, ProgressBar, SectionHeader, Surface } from "@/components/common/Fintech";
import { formatErrorMessage } from "@/lib/error";
import { formatVnd } from "@/lib/money";
import {
  formatPercent,
  formatUsdt,
  normalizeInvestmentSymbol,
  parseNumericInput
} from "@/lib/crypto";
import { useApp } from "@/context/AppContext";
import { deleteInvestmentPosition, fetchInvestmentOverview, saveInvestmentPosition } from "@/services/investment.service";
import { useForegroundRefresh } from "@/hooks/useForegroundRefresh";
import type { InvestmentPortfolioOverview, InvestmentPositionSnapshot } from "@/types/domain";

const QUICK_ASSETS = [
  { code: "BTC", name: "Bitcoin" },
  { code: "ETH", name: "Ethereum" },
  { code: "SOL", name: "Solana" },
  { code: "LINK", name: "Chainlink" },
  { code: "BNB", name: "BNB" }
];

const defaultForm = {
  assetCode: "",
  assetName: "",
  quantity: "",
  avgCostUsdt: "",
  exchangeName: "Binance",
  note: ""
};

function emptySummary(): InvestmentPortfolioOverview {
  return {
    positions: [],
    summary: {
      total_positions: 0,
      total_quantity: 0,
      total_cost_usdt: 0,
      total_market_value_usdt: 0,
      net_pnl_usdt: 0,
      net_pnl_percent: null,
      pnl_24h_usdt: 0
    },
    quote_warning: null,
    updated_at: new Date().toISOString()
  };
}

export function InvestmentsPage() {
  const { telegramUserId, ready, error, usdtVndRate } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<InvestmentPortfolioOverview>(emptySummary());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const refresh = async (uid: number) => {
    const data = await fetchInvestmentOverview(uid);
    setPortfolio(data);
    setPageError(null);
  };

  const loadPortfolio = async (uid: number, options?: { withLoading?: boolean }) => {
    try {
      if (options?.withLoading) {
        setLoading(true);
      }
      await refresh(uid);
    } catch (e) {
      setPageError(formatErrorMessage(e));
    } finally {
      if (options?.withLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!ready || !telegramUserId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      await loadPortfolio(telegramUserId, { withLoading: true });
      if (cancelled) {
        return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, telegramUserId]);

  useForegroundRefresh(
    async () => {
      if (!telegramUserId) {
        return;
      }
      await loadPortfolio(telegramUserId);
    },
    ready && Boolean(telegramUserId)
  );

  const previewSymbol = useMemo(() => normalizeInvestmentSymbol(form.assetCode), [form.assetCode]);
  const rate = usdtVndRate;
  const summary = portfolio.summary;
  const positions = portfolio.positions;
  const hasPositions = summary.total_positions > 0;
  const pnlToneClass = !hasPositions ? "text-mjm-text" : summary.net_pnl_usdt >= 0 ? "text-mjm-income" : "text-mjm-expense";
  const pnlLabel = !hasPositions ? "Sẵn sàng thêm coin" : summary.net_pnl_usdt >= 0 ? "Lãi ròng" : "Lỗ ròng";
  const pnlPercent = summary.net_pnl_percent != null ? formatPercent(summary.net_pnl_percent, { signed: true }) : "—";
  const saveLabel = editingId
    ? previewSymbol.marketSymbol
      ? `Cập nhật ${previewSymbol.marketSymbol}`
      : "Cập nhật vị thế"
    : previewSymbol.marketSymbol
      ? `Lưu ${previewSymbol.marketSymbol}`
      : "Lưu vị thế";

  const handleFillQuick = (code: string, name: string) => {
    setForm((current) => ({
      ...current,
      assetCode: code,
      assetName: name,
      exchangeName: current.exchangeName || "Binance"
    }));
  };

  const handleEdit = (position: InvestmentPositionSnapshot) => {
    setEditingId(position.id);
    setForm({
      assetCode: position.asset_code,
      assetName: position.asset_name,
      quantity: String(position.quantity),
      avgCostUsdt: String(position.avg_cost_usdt),
      exchangeName: position.exchange_name,
      note: position.note
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(defaultForm);
  };

  const handleSave = async () => {
    if (!telegramUserId) {
      return;
    }
    const assetCode = form.assetCode.trim();
    const assetName = form.assetName.trim();
    const quantity = parseNumericInput(form.quantity);
    const avgCostUsdt = parseNumericInput(form.avgCostUsdt);

    if (!assetCode) {
      setPageError("Thiếu mã coin");
      return;
    }
    if (quantity <= 0) {
      setPageError("Số lượng phải lớn hơn 0");
      return;
    }

    try {
      setSaving(true);
      await saveInvestmentPosition(telegramUserId, {
        asset_code: assetCode,
        asset_name: assetName || assetCode,
        quantity,
        avg_cost_usdt: avgCostUsdt,
        exchange_name: form.exchangeName,
        note: form.note
      });
      resetForm();
      await refresh(telegramUserId);
    } catch (e) {
      setPageError(formatErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Xoá vị thế này?")) {
      return;
    }
    try {
      await deleteInvestmentPosition(id);
      if (editingId === id) {
        resetForm();
      }
      if (telegramUserId) {
        await refresh(telegramUserId);
      }
    } catch (e) {
      setPageError(formatErrorMessage(e));
    }
  };

  if (!ready) {
    return <Loading />;
  }
  if (error || !telegramUserId) {
    return <EmptyState title="Chưa kết nối" hint={error ?? "Thiếu Telegram user"} />;
  }
  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Đầu tư" subtitle="Manual holdings · live Binance quotes" kicker="Portfolio" />

      {pageError ? (
        <div className="rounded-[20px] border border-mjm-expense/25 bg-mjm-expense/10 px-4 py-3 text-sm leading-6 text-mjm-text">
          {pageError}
        </div>
      ) : null}

      <Surface className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(91,140,255,0.22),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(74,222,128,0.1),transparent_30%)]" />
        <div className="relative space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Pill tone="accent">Live Binance</Pill>
              <p className="mt-3 text-sm font-medium text-mjm-muted">Tổng tài sản đầu tư</p>
              <p className="mt-2 font-display text-[clamp(2.1rem,11vw,3rem)] font-semibold leading-[0.9] tracking-[-0.08em]">
                <span className="text-mjm-text">{formatUsdt(summary.total_market_value_usdt)}</span>
              </p>
              <p className="mt-2 text-sm leading-6 text-mjm-muted">
                ≈ <span className="font-semibold text-mjm-text">{formatVnd(Math.round(summary.total_market_value_usdt * rate))}</span>
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-3 text-left sm:shrink-0 sm:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-mjm-muted">Vị thế</p>
              <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-mjm-text">{summary.total_positions}</p>
              <p className="text-xs text-mjm-muted">coin đang theo dõi</p>
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-black/10 p-4">
            <div className="flex items-center justify-between gap-3 text-xs text-mjm-muted">
              <span>{pnlLabel}</span>
              <span className={pnlToneClass}>{pnlPercent}</span>
            </div>
            <p className={`mt-2 font-display text-[2rem] font-semibold leading-none tracking-[-0.05em] ${pnlToneClass}`}>
              {formatUsdt(summary.net_pnl_usdt, { signed: true })}
            </p>
            <p className="mt-2 text-xs leading-5 text-mjm-muted">
              Vốn gốc: <span className="font-semibold text-mjm-text">{formatUsdt(summary.total_cost_usdt)}</span>
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MetricCard
              label="Vốn gốc"
              value={<span className="block text-[1.25rem] leading-[0.92] tracking-[-0.06em]">{formatUsdt(summary.total_cost_usdt)}</span>}
              hint={`Giá vốn từ ${summary.total_positions.toLocaleString("vi-VN")} vị thế`}
              tone="neutral"
              className="p-3"
            />
            <MetricCard
              label="24h"
              value={<span className="block text-[1.25rem] leading-[0.92] tracking-[-0.06em]">{formatUsdt(summary.pnl_24h_usdt, { signed: true })}</span>}
              hint="Biến động 24 giờ"
              tone={summary.pnl_24h_usdt >= 0 ? "income" : "expense"}
              className="p-3"
            />
            <MetricCard
              label="Tỷ suất"
              value={
                <span className="block text-[1.25rem] leading-[0.92] tracking-[-0.06em]">
                  {summary.net_pnl_percent != null ? formatPercent(summary.net_pnl_percent, { signed: true }) : "—"}
                </span>
              }
              hint="P/L trên vốn gốc"
              tone={summary.net_pnl_usdt >= 0 ? "income" : "expense"}
              className="p-3"
            />
          </div>

          {portfolio.quote_warning ? (
            <div className="rounded-[18px] border border-mjm-warn/25 bg-mjm-warn/10 px-4 py-3 text-sm leading-6 text-mjm-text">
              {portfolio.quote_warning}
            </div>
          ) : null}
        </div>
      </Surface>

      <Surface className="space-y-4">
        <SectionHeader
          kicker="Manual holdings"
          title="Thêm vị thế"
          subtitle="Nhập coin, số lượng và giá vốn. App tự kéo giá live từ Binance."
        />

        <div className="flex gap-2 overflow-x-auto pb-1">
          {QUICK_ASSETS.map((asset) => (
            <button
              key={asset.code}
              type="button"
              onClick={() => handleFillQuick(asset.code, asset.name)}
              className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-mjm-text transition hover:border-white/15 hover:bg-white/[0.05]"
            >
              {asset.code}
            </button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Mã coin</span>
            <input
              className="w-full rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-mjm-text outline-none transition focus:border-mjm-accent/50 focus:ring-4 focus:ring-mjm-accent/15"
              value={form.assetCode}
              onChange={(e) => setForm((current) => ({ ...current, assetCode: e.target.value }))}
              placeholder="LINK"
              inputMode="text"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Tên coin</span>
            <input
              className="w-full rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-mjm-text outline-none transition focus:border-mjm-accent/50 focus:ring-4 focus:ring-mjm-accent/15"
              value={form.assetName}
              onChange={(e) => setForm((current) => ({ ...current, assetName: e.target.value }))}
              placeholder="Chainlink"
              inputMode="text"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Số lượng</span>
            <input
              className="w-full rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-mjm-text outline-none transition focus:border-mjm-accent/50 focus:ring-4 focus:ring-mjm-accent/15"
              value={form.quantity}
              onChange={(e) => setForm((current) => ({ ...current, quantity: e.target.value }))}
              placeholder="89,518"
              inputMode="decimal"
              enterKeyHint="next"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Giá vốn USDT</span>
            <input
              className="w-full rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-mjm-text outline-none transition focus:border-mjm-accent/50 focus:ring-4 focus:ring-mjm-accent/15"
              value={form.avgCostUsdt}
              onChange={(e) => setForm((current) => ({ ...current, avgCostUsdt: e.target.value }))}
              placeholder="10,25"
              inputMode="decimal"
              enterKeyHint="next"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Sàn / ví</span>
            <input
              className="w-full rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-mjm-text outline-none transition focus:border-mjm-accent/50 focus:ring-4 focus:ring-mjm-accent/15"
              value={form.exchangeName}
              onChange={(e) => setForm((current) => ({ ...current, exchangeName: e.target.value }))}
              placeholder="Binance"
              inputMode="text"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-mjm-muted">Ghi chú</span>
            <input
              className="w-full rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-mjm-text outline-none transition focus:border-mjm-accent/50 focus:ring-4 focus:ring-mjm-accent/15"
              value={form.note}
              onChange={(e) => setForm((current) => ({ ...current, note: e.target.value }))}
              placeholder="Mua dài hạn"
              inputMode="text"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs leading-5 text-mjm-muted">
            Sẽ lưu thành <span className="font-semibold text-mjm-text">{previewSymbol.marketSymbol || "..."}</span>
          </p>
          <div className="flex items-center gap-2">
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-mjm-text transition hover:bg-white/[0.05]"
              >
                Huỷ
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-[18px] bg-mjm-accent px-5 py-3.5 font-semibold text-white shadow-[0_18px_40px_rgba(91,140,255,0.28)] transition disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Đang lưu..." : saveLabel}
            </button>
          </div>
        </div>
      </Surface>

      <Surface className="space-y-3">
        <SectionHeader
          kicker="Positions"
          title="Danh mục hiện có"
          subtitle="Bấm sửa để cập nhật số lượng hoặc giá vốn."
          action={<Pill tone="accent">{summary.total_positions.toLocaleString("vi-VN")}</Pill>}
        />

        <div className="space-y-3">
          {positions.length === 0 ? (
            <EmptyState title="Chưa có vị thế" hint="Thêm coin đầu tiên ở khối phía trên để mở portfolio." />
          ) : (
            positions.map((position) => {
              const share = summary.total_market_value_usdt > 0 ? (position.market_value_usdt / summary.total_market_value_usdt) * 100 : 0;
              const pnlTone = position.net_pnl_usdt >= 0 ? "income" : "expense";
              const changeTone =
                position.price_change_percent_24h == null
                  ? "neutral"
                  : position.price_change_percent_24h >= 0
                    ? "income"
                    : "expense";

              return (
                <div key={position.id} className="rounded-[20px] border border-white/8 bg-white/[0.03] p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] font-display text-base font-semibold tracking-[-0.04em] text-mjm-text">
                        {position.asset_code.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold text-mjm-text">{position.asset_code}</p>
                          <Pill tone="accent">{position.exchange_name}</Pill>
                        </div>
                        <p className="mt-1 text-xs text-mjm-muted">
                          {position.asset_name} · {position.market_symbol}
                        </p>
                      </div>
                    </div>
                    <div className="sm:shrink-0 sm:text-right">
                      <p className="font-display text-[1rem] font-semibold leading-[0.95] tracking-[-0.05em] text-mjm-text sm:text-[1.15rem]">
                        {formatUsdt(position.market_value_usdt)}
                      </p>
                      <p className="mt-1 text-xs text-mjm-muted">≈ {formatVnd(Math.round(position.market_value_usdt * rate))}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Số lượng</p>
                      <p className="mt-1 text-[1.05rem] font-semibold leading-[1.05] text-mjm-text">{formatUsdt(position.quantity, { maximumFractionDigits: 6 })}</p>
                    </div>
                    <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Giá vốn</p>
                      <p className="mt-1 text-[1.05rem] font-semibold leading-[1.05] text-mjm-text">{formatUsdt(position.avg_cost_usdt)}</p>
                    </div>
                    <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Lãi / lỗ</p>
                      <p className={`mt-1 text-[1.05rem] font-semibold leading-[1.05] ${pnlTone === "income" ? "text-mjm-income" : "text-mjm-expense"}`}>
                        {formatUsdt(position.net_pnl_usdt, { signed: true })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar value={share} tone="accent" className="h-2 flex-1" />
                    <Pill tone={changeTone as "neutral" | "accent" | "income" | "expense" | "warn"}>
                      {position.price_change_percent_24h != null ? formatPercent(position.price_change_percent_24h, { signed: true }) : "24h —"}
                    </Pill>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-mjm-muted">
                      Giá live{" "}
                      <span className="font-semibold text-mjm-text">
                        {position.market_price_usdt != null ? formatUsdt(position.market_price_usdt) : "—"}
                      </span>
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(position)}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-mjm-text transition hover:bg-white/[0.05]"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(position.id)}
                        className="rounded-full border border-mjm-expense/20 bg-mjm-expense/10 px-3 py-1.5 text-xs font-semibold text-mjm-expense transition hover:bg-mjm-expense/14"
                      >
                        Xoá
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Surface>
    </div>
  );
}
