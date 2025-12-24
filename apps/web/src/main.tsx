import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AppShell from "./app/AppShell";
import { App as PosView } from "./App";
import { OrdersProvider } from "./stores/ordersStore";
import { UiProvider } from "./stores/uiStore";
import { PosSessionProvider } from "./stores/posSessionStore";
import { KdsProvider, useKds } from "./stores/kdsStore";

/* Assortiment */
import ProductsPage from "./pages/ProductsPage";
import AssortimentCategories from "./pages/assortiment/AssortimentCategories";
import AssortimentCourses from "./pages/AssortimentCourses";
import AssortimentMenus from "./pages/AssortimentMenus";
import AssortimentDashboard from "./pages/assortiment/AssortimentDashboard";
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
import SettingsHardwareShell from "./pages/settings/SettingsHardwareShell";
import HardwarePrintersPage from "./pages/settings/HardwarePrintersPage";
import WebshopStatusDemo from "./pages/WebshopStatusDemo";
import AreasPage from "./pages/AreasPage";
// Groups removed in favor of Op Naam
import NameOrdersPage from "./pages/NameOrdersPage";
// import removed: floorplan editing will live under Areas

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
          <UiProvider>
          <KdsProvider>
            <KdsBoot />
          <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<Navigate to="/pos" replace />} />

            {/* POS flow */}
            <Route path="pos" element={<PosView />} />
            <Route path="pos/areas" element={<AreasPage />} />
            {/* groups removed */}
            <Route path="pos/name-orders" element={<NameOrdersPage />} />
            <Route path="checkout" element={<CheckoutScreen />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="kds" element={<KdsScreen />} />
            <Route path="day-journal" element={<DayJournalPage />} />

            {/* Assortiment */}
            <Route path="assortiment">
              <Route index element={<AssortimentDashboard />} />
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
              <Route path="hardware" element={<SettingsHardwareShell />}>
                <Route path="printers" element={<HardwarePrintersPage />} />
              </Route>
              {/* Tables management removed from Settings; use Areas */}
            </Route>
            {/* Back-compat redirects */}
            <Route path="settings/printers" element={<Navigate to="/settings/hardware/printers" replace />} />
            <Route path="settings/floorplan" element={<Navigate to="/pos/areas" replace />} />
            {/* back-compat for old tables route */}
            <Route path="pos/tables" element={<Navigate to="/pos/areas" replace />} />
            <Route path="web" element={<WebshopStatusDemo />} />

            <Route path="*" element={<Navigate to="/pos" replace />} />
          </Route>
          </Routes>
          </KdsProvider>
          </UiProvider>
        </OrdersProvider>
      </PosSessionProvider>
    </BrowserRouter>
  </StrictMode>
);
