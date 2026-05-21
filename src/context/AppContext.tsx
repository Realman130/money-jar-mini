import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { upsertTelegramUser } from "@/services/user.service";
import { buildCategoryAliasMap, fetchCategories } from "@/services/category.service";
import { fetchWallets } from "@/services/wallet.service";
import type { CategoryRow, WalletRow } from "@/types/domain";
import { getTelegramUserId, getTelegramUserName, initTelegramApp, syncTelegramTheme } from "@/lib/telegram";
import { fetchUsdtVndRate, DEFAULT_USDT_VND_RATE } from "@/lib/crypto";

interface AppCtx {
  telegramUserId: number | null;
  ready: boolean;
  error: string | null;
  categories: CategoryRow[];
  wallets: WalletRow[];
  aliasMap: Map<string, string>;
  refreshCatalog: () => Promise<void>;
  usdtVndRate: number;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [telegramUserId, setTelegramUserId] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [aliasMap, setAliasMap] = useState<Map<string, string>>(new Map());
  const [usdtVndRate, setUsdtVndRate] = useState<number>(DEFAULT_USDT_VND_RATE);

  const refreshCatalog = useCallback(async () => {
    const uid = getTelegramUserId();
    if (!uid) {
      return;
    }
    const [cats, wals, aliases] = await Promise.all([fetchCategories(), fetchWallets(uid), buildCategoryAliasMap()]);
    setCategories(cats);
    setWallets(wals);
    setAliasMap(aliases);
  }, []);

  useEffect(() => {
    fetchUsdtVndRate()
      .then((rate) => {
        setUsdtVndRate(rate);
      })
      .catch((e) => {
        console.warn("MJM: Lỗi khi lấy tỷ giá USD/VND lúc khởi tạo", e);
      });
  }, []);

  useEffect(() => {
    initTelegramApp();
    syncTelegramTheme();
    const uid = getTelegramUserId();
    setTelegramUserId(uid);
    if (!uid) {
      setError("Không có Telegram user. Mở app trong Telegram hoặc đặt VITE_DEV_TELEGRAM_USER_ID khi dev.");
      setReady(true);
      return;
    }
    const p = getTelegramUserName();
    upsertTelegramUser(uid, { first_name: p.first, username: p.username })
      .then(() => refreshCatalog())
      .then(() => {
        setReady(true);
      })
      .catch((e: Error) => {
        setError(e.message ?? String(e));
        setReady(true);
      });
  }, [refreshCatalog]);

  const value = useMemo(
    () => ({
      telegramUserId,
      ready,
      error,
      categories,
      wallets,
      aliasMap,
      refreshCatalog,
      usdtVndRate
    }),
    [telegramUserId, ready, error, categories, wallets, aliasMap, refreshCatalog, usdtVndRate]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error("useApp trong AppProvider");
  }
  return v;
}
