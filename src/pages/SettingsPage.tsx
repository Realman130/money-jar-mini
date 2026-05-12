import { PageHeader } from "@/components/layout/PageHeader";
import { syncTelegramTheme } from "@/lib/telegram";

export function SettingsPage() {
  return (
    <div>
      <PageHeader title="Cài đặt" subtitle="Money Jar Mini" />
      <div className="space-y-3 rounded-2xl border border-mjm-border bg-mjm-surface p-4 text-sm">
        <div className="flex justify-between border-b border-mjm-border pb-3">
          <span className="text-mjm-muted">Đơn vị</span>
          <span className="font-medium">VND</span>
        </div>
        <div className="flex justify-between border-b border-mjm-border pb-3">
          <span className="text-mjm-muted">Múi giờ</span>
          <span className="font-medium">Asia/Ho_Chi_Minh</span>
        </div>
        <button
          type="button"
          className="w-full rounded-xl border border-mjm-border py-2 font-medium"
          onClick={() => {
            document.documentElement.classList.toggle("dark");
          }}
        >
          Đổi sáng / tối (thủ công)
        </button>
        <button type="button" className="w-full rounded-xl border border-mjm-border py-2 font-medium" onClick={() => syncTelegramTheme()}>
          Theo theme Telegram
        </button>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-mjm-muted">
        Export / import CSV và reset dữ liệu demo có thể bổ sung qua Edge Function hoặc tải trực tiếp từ Supabase Table Editor.
      </p>
    </div>
  );
}
