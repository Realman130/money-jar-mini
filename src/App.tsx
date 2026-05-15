import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { QuickAddPage } from "@/pages/QuickAddPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { MorePage } from "@/pages/MorePage";
import { InvestmentsPage } from "@/pages/InvestmentsPage";
import { WalletsPage } from "@/pages/WalletsPage";
import { CategoriesPage } from "@/pages/CategoriesPage";
import { BudgetsPage } from "@/pages/BudgetsPage";
import { SettingsPage } from "@/pages/SettingsPage";

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/quick" element={<QuickAddPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/more" element={<MorePage />} />
            <Route path="/investments" element={<InvestmentsPage />} />
            <Route path="/wallets" element={<WalletsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/budgets" element={<BudgetsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
