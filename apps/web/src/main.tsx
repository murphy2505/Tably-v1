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
import AssortimentRevenueGroups from "./pages/AssortimentRevenueGroups";

/* Core screens */
import CheckoutScreen from "./pages/CheckoutScreen";
import OrdersScreen from "./pages/assortiment/OrdersScreen";
import KdsScreen from "./pages/KdsScreen";

/* Other pages */
import Loyalty from "./pages/Loyalty";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
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
            <Route path="orders" element={<OrdersScreen />} />
            <Route path="kds" element={<KdsScreen />} />

            {/* Assortiment */}
            <Route path="assortiment">
              <Route path="products" element={<ProductsPage />} />
              <Route path="categories" element={<AssortimentCategories />} />
              <Route path="courses" element={<AssortimentCourses />} />
              <Route path="menus" element={<AssortimentMenus />} />
              <Route path="revenue-groups" element={<AssortimentRevenueGroups />} />
            </Route>

            {/* Standalone (read-only) */}
            <Route path="products" element={<ProductsPage />} />

            {/* Other */}
            <Route path="loyalty" element={<Loyalty />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
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
