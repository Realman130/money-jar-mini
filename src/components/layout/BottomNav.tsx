import { NavLink } from "react-router-dom";

const items = [
  { to: "/", label: "Tổng quan", icon: "◉" },
  { to: "/quick", label: "Nhập", icon: "＋" },
  { to: "/history", label: "Lịch sử", icon: "☰" },
  { to: "/reports", label: "Báo cáo", icon: "▤" },
  { to: "/more", label: "Thêm", icon: "⋯" }
];

export function BottomNav() {
  return (
    <nav className="safe-pb fixed bottom-0 left-0 right-0 z-40 border-t border-mjm-border bg-mjm-surface/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg justify-around px-1 pt-2">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) =>
              `flex min-w-[4rem] flex-col items-center gap-0.5 pb-2 text-[10px] font-medium ${
                isActive ? "text-mjm-accent" : "text-mjm-muted"
              }`
            }
          >
            <span className="text-lg leading-none">{it.icon}</span>
            {it.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
