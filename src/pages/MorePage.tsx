import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";

const links = [
  { to: "/wallets", title: "Ví tiền", desc: "Số dư & chỉnh ví" },
  { to: "/categories", title: "Danh mục", desc: "Nhóm thu / chi" },
  { to: "/budgets", title: "Ngân sách / 6 hũ", desc: "Thu dự kiến & tỷ lệ hũ" },
  { to: "/settings", title: "Cài đặt", desc: "Giao diện & thông tin" }
];

export function MorePage() {
  return (
    <div>
      <PageHeader title="Thêm" subtitle="Ví, danh mục, hũ, cài đặt" />
      <div className="space-y-2">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="block rounded-2xl border border-mjm-border bg-mjm-surface px-4 py-4 transition active:scale-[0.99]"
          >
            <p className="font-semibold text-mjm-text">{l.title}</p>
            <p className="text-sm text-mjm-muted">{l.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
