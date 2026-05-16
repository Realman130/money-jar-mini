import { PageHeader } from "@/components/layout/PageHeader";
import { Surface, SectionHeader, Pill } from "@/components/common/Fintech";

export function SettingsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Cài đặt" subtitle="Thông số hệ thống và trải nghiệm cố định của mini app." kicker="Preferences" />

      <Surface className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Pill tone="accent">Dark only</Pill>
            <p className="mt-2 font-display text-[1.35rem] font-semibold tracking-[-0.03em] text-mjm-text">App luôn dùng giao diện tối.</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-mjm-muted">
              Theme sáng đã được tắt để giữ trải nghiệm nhất quán, dễ nhìn và đúng tinh thần premium fintech trên mobile.
            </p>
          </div>
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mjm-muted">Theme</p>
            <p className="mt-2 font-semibold text-mjm-text">Dark only</p>
          </div>
        </div>
      </Surface>
    </div>
  );
}
