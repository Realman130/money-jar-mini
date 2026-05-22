import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";

const items = [
  { to: "/", label: "Tổng quan", icon: "◉" },
  { to: "/quick", label: "Nhập", icon: "＋" },
  { to: "/history", label: "Lịch sử", icon: "☰" },
  { to: "/reports", label: "Báo cáo", icon: "▤" },
  { to: "/more", label: "Thêm", icon: "⋯" }
];

export function SideNav() {
  return (
    <aside className="hidden shrink-0 border-r border-white/10 bg-[#0a1018]/80 backdrop-blur-xl md:flex md:w-56 lg:w-64">
      <div className="sticky top-0 flex h-dvh w-full flex-col px-4 py-6">
        <div className="mb-8 px-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-mjm-muted">Money Jar</p>
          <p className="mt-1 font-display text-lg font-semibold tracking-[-0.03em] text-mjm-text">Mini</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition duration-200",
                  isActive
                    ? "border-mjm-accent/30 bg-mjm-accent/16 text-white shadow-[0_12px_30px_rgba(91,140,255,0.2)]"
                    : "border-transparent text-mjm-muted hover:border-white/10 hover:bg-white/[0.04] hover:text-mjm-text"
                )
              }
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-[15px] leading-none">
                {it.icon}
              </span>
              <span>{it.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
