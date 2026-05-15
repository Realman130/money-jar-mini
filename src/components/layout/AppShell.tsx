import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";

export function AppShell() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-mjm-bg pb-28 text-mjm-text">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(91,140,255,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(74,222,128,0.08),transparent_26%)]" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-mjm-accent/10 blur-3xl" />
      <main className="relative mx-auto w-full max-w-[430px] px-4 pt-4 sm:px-5">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
