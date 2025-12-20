import type { LucideIcon } from "lucide-react";
import { ShoppingCart, ClipboardList, Monitor, CalendarCheck, BarChart3, Settings, Package, Gift, Utensils, Tags, Layers, Wallet, Sliders } from "lucide-react";

export type NavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
  children?: NavItem[];
};

// Left navigation — placeholders for Tably v1 modules (no role gating yet)
export const NAV: NavItem[] = [
  { path: "/pos", label: "POS", icon: ShoppingCart },
  { path: "/orders", label: "Bestellingen", icon: ClipboardList },
  { path: "/kds", label: "KDS", icon: Monitor },
  {
    path: "/assortiment",
    label: "Assortiment",
    icon: Package,
    children: [
      { path: "/assortiment/menus", label: "Menukaarten", icon: ClipboardList },
      { path: "/assortiment/products", label: "Producten", icon: Utensils },
      { path: "/assortiment/categories", label: "Categorieën", icon: Tags },
      { path: "/assortiment/revenue-groups", label: "Omzetgroepen", icon: Wallet },
      { path: "/assortiment/courses", label: "Gangen", icon: Layers },
      { path: "/assortiment/modifiers", label: "Modifiers", icon: Sliders },
    ],
  },
  { path: "/loyalty", label: "Loyalty", icon: Gift },
  { path: "/day-journal", label: "Dagjournaal", icon: CalendarCheck },
  { path: "/reports", label: "Rapportages", icon: BarChart3 },
  { path: "/settings", label: "Instellingen", icon: Settings },
];

// No role filtering for now; keep API for future extension
export function filterByRole(items: NavItem[]): NavItem[] {
  return items;
}
