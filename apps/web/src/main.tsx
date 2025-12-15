import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AppShell from "./app/AppShell";
import { App as PosView } from "./App";

import AssortimentCategories from "./pages/assortiment/AssortimentCategories";
import AssortimentCourses from "./pages/AssortimentCourses";
import AssortimentMenus from "./pages/AssortimentMenus";
import AssortimentRevenueGroups from "./pages/AssortimentRevenueGroups";
import ProductsPage from "./pages/ProductsPage";
import Loyalty from "./pages/Loyalty";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Navigate to="/pos" replace />} />

          <Route path="pos" element={<PosView />} />

          <Route path="assortiment">
            <Route path="products" element={<ProductsPage />} />
            <Route path="categories" element={<AssortimentCategories />} />
            <Route path="courses" element={<AssortimentCourses />} />
            <Route path="menus" element={<AssortimentMenus />} />
            <Route path="revenue-groups" element={<AssortimentRevenueGroups />} />
          </Route>

          {/* Standalone read-only products list */}
          <Route path="products" element={<ProductsPage />} />

          <Route path="loyalty" element={<Loyalty />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/pos" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
