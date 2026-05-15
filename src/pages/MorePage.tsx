import { PageHeader } from "@/components/layout/PageHeader";
import { ActionTile, Pill, SectionHeader, Surface } from "@/components/common/Fintech";

const links = [
  { to: "/wallets", title: "Ví tiền", desc: "Số dư, loại ví, và phân bổ tiền.", icon: "↔", tone: "accent", badge: "Tài sản" },
  { to: "/investments", title: "Đầu tư", desc: "Portfolio crypto, lãi/lỗ và giá live.", icon: "◈", tone: "warn", badge: "Crypto" },
  { to: "/categories", title: "Danh mục", desc: "Nhóm thu / chi và mapping hũ.", icon: "◫", tone: "income", badge: "Phân loại" },
  { to: "/budgets", title: "Ngân sách / 6 hũ", desc: "Thu dự kiến và tỷ lệ ngân sách.", icon: "◎", tone: "warn", badge: "Kế hoạch" },
  { to: "/settings", title: "Cài đặt", desc: "Giao diện, đồng bộ, dữ liệu.", icon: "⚙", tone: "neutral", badge: "Hệ thống" }
] as const;

export function MorePage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Thêm" subtitle="Ví, danh mục, hũ và cài đặt hệ thống." kicker="Control center" />

      <Surface className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Pill tone="accent">Hub</Pill>
            <p className="mt-2 font-display text-[1.35rem] font-semibold tracking-[-0.03em] text-mjm-text">
              Bảng điều khiển phụ cho các thiết lập quan trọng.
            </p>
            <p className="mt-2 max-w-md text-sm leading-6 text-mjm-muted">
              Tất cả những gì không cần xuất hiện trên dashboard chính sẽ nằm ở đây, gọn và có tổ chức.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {links.map((l) => (
            <ActionTile key={l.to} to={l.to} icon={l.icon} title={l.title} subtitle={l.desc} badge={<Pill tone={l.tone}>{l.badge}</Pill>} />
          ))}
        </div>
      </Surface>

      <Surface>
        <SectionHeader title="Gợi ý" subtitle="Những màn này hữu ích nhất khi bạn muốn chỉnh vận hành app." />
        <div className="space-y-3 text-sm leading-6 text-mjm-muted">
          <p>• Dùng <span className="font-semibold text-mjm-text">Ví</span> để kiểm tra số dư và loại ví đang hoạt động.</p>
          <p>• Dùng <span className="font-semibold text-mjm-text">Ngân sách / 6 hũ</span> để đặt thu nhập dự kiến theo tháng.</p>
          <p>• Dùng <span className="font-semibold text-mjm-text">Cài đặt</span> để đồng bộ theme Telegram và tuỳ biến trải nghiệm.</p>
        </div>
      </Surface>
    </div>
  );
}
