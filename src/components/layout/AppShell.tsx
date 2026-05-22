import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";

export function AppShell() {
  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-mjm-bg text-mjm-text">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(91,140,255,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(74,222,128,0.08),transparent_26%)]" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-mjm-accent/10 blur-3xl md:left-[18rem]" />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col md:max-w-none lg:max-w-[1280px]">
        <div className="flex min-h-dvh flex-1">
          <SideNav />
          <main className="min-w-0 flex-1 px-4 pt-4 pb-28 sm:px-5 md:px-8 md:pb-10 md:pt-6 lg:px-10">
            <Outlet />
          </main>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
