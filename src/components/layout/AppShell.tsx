import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";

export function AppShell() {
  return (
    <div className="min-h-dvh bg-mjm-bg pb-20">
      <main className="mx-auto max-w-lg px-4 pt-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
