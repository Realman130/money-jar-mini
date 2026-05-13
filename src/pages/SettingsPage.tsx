import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Surface, SectionHeader, Pill } from "@/components/common/Fintech";
import { syncTelegramTheme } from "@/lib/telegram";

export function SettingsPage() {
  const [dark, setDark] = useState(true);

  return (
    <div className="space-y-5">
      <PageHeader title="Cài đặt" subtitle="Tuỳ biến giao diện, theme Telegram và thông số hệ thống." kicker="Preferences" />

      <Surface className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Pill tone="accent">Theme</Pill>
            <p className="mt-2 font-display text-[1.35rem] font-semibold tracking-[-0.03em] text-mjm-text">Tối ưu cho Telegram mini app.</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-mjm-muted">
              App đang ưu tiên tông tối và độ tương phản dịu để nhìn sang hơn trên mobile.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-left transition hover:border-white/15 hover:bg-white/[0.05]"
            onClick={() => {
              document.documentElement.classList.toggle("dark");
              setDark((v) => !v);
            }}
          >
            <div>
              <p className="font-semibold text-mjm-text">Đổi sáng / tối</p>
              <p className="mt-1 text-sm text-mjm-muted">Bật tắt theme thủ công trên trình duyệt.</p>
            </div>
            <Pill tone={dark ? "accent" : "neutral"}>{dark ? "Dark" : "Light"}</Pill>
          </button>

          <button
            type="button"
            className="flex w-full items-center justify-between rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-left transition hover:border-white/15 hover:bg-white/[0.05]"
            onClick={() => {
              const theme = syncTelegramTheme();
              setDark(theme === "dark");
            }}
          >
            <div>
              <p className="font-semibold text-mjm-text">Theo theme Telegram</p>
              <p className="mt-1 text-sm text-mjm-muted">Đồng bộ theo màu giao diện của Telegram WebApp.</p>
            </div>
            <Pill tone="accent">Sync</Pill>
          </button>
        </div>
      </Surface>

      <Surface className="space-y-4">
        <SectionHeader title="Thông tin hệ thống" subtitle="Thông số cố định của mini app." />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Đơn vị</p>
            <p className="mt-2 font-semibold text-mjm-text">VND</p>
          </div>
          <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Múi giờ</p>
            <p className="mt-2 font-semibold text-mjm-text">Asia/Ho_Chi_Minh</p>
          </div>
          <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Nguồn dữ liệu</p>
            <p className="mt-2 font-semibold text-mjm-text">Supabase</p>
          </div>
          <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Mini app</p>
            <p className="mt-2 font-semibold text-mjm-text">Money Jar Mini</p>
          </div>
        </div>
      </Surface>
    </div>
  );
}
