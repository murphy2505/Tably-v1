import type { LucideIcon } from "lucide-react";
import {
  Receipt,
  Package,
  Utensils,
  Tags,
  Layers,
  ClipboardList,
  Gift,
  BarChart3,
  Settings,
  Wallet,
} from "lucide-react";

export type Role = "cashier" | "manager" | "admin";

export type NavItem = {
  path: string;
  label: string;
  icon: LucideIcon;   // ⬅️ geen string meer
  roles: Role[];
  children?: NavItem[];
};

export const userRole: Role = "admin";

export const NAV: NavItem[] = [
  {
    path: "/pos",
    label: "Kassa",
    icon: Receipt,
    roles: ["cashier", "manager", "admin"],
  },
  {
    path: "/assortiment",
    label: "Assortiment",
    icon: Package,
    roles: ["manager", "admin"],
    children: [
      {
        path: "/assortiment/products",
        label: "Producten",
        icon: Utensils,
        roles: ["manager", "admin"],
      },
      {
        path: "/assortiment/categories",
        label: "Categorieën",
        icon: Tags,
        roles: ["manager", "admin"],
      },
      {
        path: "/assortiment/courses",
        label: "Gangen",
        icon: Layers,
        roles: ["manager", "admin"],
      },
      {
        path: "/assortiment/menus",
        label: "Menukaarten",
        icon: ClipboardList,
        roles: ["manager", "admin"],
      },
      {
        path: "/assortiment/revenue-groups",
        label: "Omzetgroepen",
        icon: Wallet,
        roles: ["manager", "admin"],
      },
    ],
  },
  {
    path: "/orders",
    label: "Bestellingen",
    icon: ClipboardList,
    roles: ["cashier", "manager", "admin"],
  },
  {
    path: "/loyalty",
    label: "Loyalty",
    icon: Gift,
    roles: ["manager", "admin"],
  },
  {
    path: "/reports",
    label: "Rapportage",
    icon: BarChart3,
    roles: ["manager", "admin"],
  },
  {
    path: "/settings",
    label: "Instellingen",
    icon: Settings,
    roles: ["admin"],
  },
];

export function filterByRole(items: NavItem[], role: Role): NavItem[] {
  return items
    .filter((i) => i.roles.includes(role))
    .map((i) => ({
      ...i,
      children: i.children
        ? i.children.filter((c) => c.roles.includes(role))
        : undefined,
    }));
}
