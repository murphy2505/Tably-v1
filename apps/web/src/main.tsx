import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AppShell from "./app/AppShell";
import { App as PosView } from "./App";
import { OrdersProvider } from "./stores/ordersStore";
import { PosSessionProvider } from "./stores/posSessionStore";
import { KdsProvider, useKds } from "./stores/kdsStore";

/* Assortiment */
import ProductsPage from "./pages/ProductsPage";
import AssortimentCategories from "./pages/assortiment/AssortimentCategories";
import AssortimentCourses from "./pages/AssortimentCourses";
import AssortimentMenus from "./pages/AssortimentMenus";
import AssortimentMenuDetail from "./pages/AssortimentMenuDetail";
import AssortimentRevenueGroups from "./pages/AssortimentRevenueGroups";
import AssortimentModifiers from "./pages/AssortimentModifiers";

/* Core screens */
import CheckoutScreen from "./pages/CheckoutScreen";
import OrdersPage from "./pages/OrdersPage";
import DayJournalPage from "./pages/DayJournalPage";
import KdsScreen from "./pages/KdsScreen";

/* Other pages */
import Loyalty from "./pages/Loyalty";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import SettingsShell from "./pages/settings/SettingsShell";
import HardwarePrintersPage from "./pages/settings/HardwarePrintersPage";
import PrintConfigsPage from "./pages/settings/PrintConfigsPage";
import PrintRoutesPage from "./pages/settings/PrintRoutesPage";
import WebshopStatusDemo from "./pages/WebshopStatusDemo";

const root = createRoot(document.getElementById("root")!);

function KdsBoot() {
  const { start } = useKds();
  // start once on mount
  return (start(), null);
}

root.render(
  <StrictMode>
    <BrowserRouter>
      <PosSessionProvider>
        <OrdersProvider>
          <KdsProvider>
            <KdsBoot />
          <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<Navigate to="/pos" replace />} />

            {/* POS flow */}
            <Route path="pos" element={<PosView />} />
            <Route path="checkout" element={<CheckoutScreen />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="kds" element={<KdsScreen />} />
            <Route path="day-journal" element={<DayJournalPage />} />

            {/* Assortiment */}
            <Route path="assortiment">
              <Route path="products" element={<ProductsPage />} />
              <Route path="categories" element={<AssortimentCategories />} />
              <Route path="courses" element={<AssortimentCourses />} />
              <Route path="menus" element={<AssortimentMenus />} />
              <Route path="menus/:menuId" element={<AssortimentMenuDetail />} />
              <Route path="revenue-groups" element={<AssortimentRevenueGroups />} />
              <Route path="modifiers" element={<AssortimentModifiers />} />
            </Route>

            {/* Standalone (read-only) */}
            <Route path="products" element={<ProductsPage />} />

            {/* Other */}
            <Route path="loyalty" element={<Loyalty />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<SettingsShell />}>
              <Route index element={<Settings />} />
              <Route path="printers" element={<HardwarePrintersPage />} />
              <Route path="print-routes" element={<PrintRoutesPage />} />
              <Route path="print-configs" element={<PrintConfigsPage />} />
            </Route>
            <Route path="web" element={<WebshopStatusDemo />} />

            <Route path="*" element={<Navigate to="/pos" replace />} />
          </Route>
          </Routes>
          </KdsProvider>
        </OrdersProvider>
      </PosSessionProvider>
    </BrowserRouter>
  </StrictMode>
);
