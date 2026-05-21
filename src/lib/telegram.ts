export type TelegramTheme = "light" | "dark";

type MiniWebApp = {
  ready: () => void;
  expand: () => void;
  colorScheme?: "light" | "dark";
  initDataUnsafe?: { user?: { id?: number; first_name?: string; username?: string } };
};

export function getWebApp(): MiniWebApp | null {
  const w = typeof window !== "undefined" ? (window as unknown as { Telegram?: { WebApp?: MiniWebApp } }).Telegram?.WebApp : undefined;
  return w ?? null;
}

export function initTelegramApp(): void {
  const w = getWebApp();
  w?.ready();
  w?.expand();
}

export function getTelegramUserId(): number | null {
  const w = getWebApp();
  const id = w?.initDataUnsafe?.user?.id;
  if (typeof id === "number" && Number.isFinite(id)) {
    return id;
  }
  const dev = import.meta.env.VITE_DEV_TELEGRAM_USER_ID;
  if (dev) {
    const n = Number.parseInt(dev, 10);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return null;
}

export function getTelegramUserName(): { first?: string; username?: string } {
  const u = getWebApp()?.initDataUnsafe?.user;
  return { first: u?.first_name, username: u?.username };
}

export function syncTelegramTheme(): TelegramTheme {
  document.documentElement.classList.add("dark");
  return "dark";
}
