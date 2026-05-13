import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";

const items = [
  { to: "/", label: "Tổng quan", icon: "◉" },
  { to: "/quick", label: "Nhập", icon: "＋" },
  { to: "/history", label: "Lịch sử", icon: "☰" },
  { to: "/reports", label: "Báo cáo", icon: "▤" },
  { to: "/more", label: "Thêm", icon: "⋯" }
];

export function BottomNav() {
  return (
    <nav className="safe-pb fixed bottom-3 left-0 right-0 z-40 px-3">
      <div className="mx-auto flex max-w-[430px] items-center gap-1 rounded-[1.5rem] border border-white/10 bg-[#0e1522]/90 px-2 py-2 shadow-[0_18px_60px_rgba(2,6,23,0.45)] backdrop-blur-2xl">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) =>
              cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition duration-200",
                isActive
                  ? "border border-mjm-accent/30 bg-mjm-accent/16 text-white shadow-[0_12px_30px_rgba(91,140,255,0.25)]"
                  : "border border-transparent text-mjm-muted hover:border-white/10 hover:bg-white/[0.04] hover:text-mjm-text"
              )
            }
          >
            <span className="grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-[13px] leading-none">
              {it.icon}
            </span>
            <span className="truncate">{it.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
