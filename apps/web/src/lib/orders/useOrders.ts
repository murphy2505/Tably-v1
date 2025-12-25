import { useEffect, useMemo, useState } from "react";
import { apiListOrders, type OrderDTO } from "../../api/pos/orders";
import { matchesQuery, filterKind, type OrderFilterKind } from "./search";

export type OrdersState = {
  loading: boolean;
  error: string | null;
  orders: OrderDTO[];
  search: string;
  setSearch: (s: string) => void;
  filter: OrderFilterKind;
  setFilter: (f: OrderFilterKind) => void;
  refresh: () => Promise<void>;
  stats: {
    openCount: number;
    tablesCount: number;
    nameCount: number;
    kitchenCount: number;
  };
  filtered: OrderDTO[];
  mostRecent: OrderDTO | null;
};

export function useOrders(): OrdersState {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [search, setSearch] = useState<string>(() => localStorage.getItem("orders.search") || "");
  const [filter, setFilter] = useState<OrderFilterKind>(() => {
    const raw = (localStorage.getItem("orders.filter") as OrderFilterKind) || "ALLE";
    const allowed: OrderFilterKind[] = ["ALLE", "OPEN", "HOLD", "CONFIRMED", "READY"];
    return allowed.includes(raw) ? raw : "ALLE";
  });

  useEffect(() => { localStorage.setItem("orders.search", search); }, [search]);
  useEffect(() => { localStorage.setItem("orders.filter", filter); }, [filter]);

  function isRealOrder(o: OrderDTO): boolean {
    const hasLines = (o.lines || []).length > 0;
    const hasTable = !!(o as any).tableId || !!(o as any).table;
    const hasCustomer = !!o.customer;
    const notWalkin = !!((o as any).orderType && (o as any).orderType !== "WALKIN");
    const notOpen = (o.status || "OPEN") !== "OPEN";
    return hasLines || hasTable || hasCustomer || notWalkin || notOpen;
  }

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const statuses: Array<"OPEN" | "PARKED" | "SENT" | "IN_PREP" | "READY"> = ["OPEN", "PARKED", "SENT", "IN_PREP", "READY"];
      const results: OrderDTO[] = [];
      for (const s of statuses) {
        const res = await apiListOrders({ status: s });
        for (const o of res.orders || []) results.push(o);
      }
      // de-duplicate by id and filter out non-real orders
      const map = new Map<string, OrderDTO>();
      for (const o of results) map.set(o.id, o);
      const list = Array.from(map.values()).filter(isRealOrder);
      // sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(list);
    } catch (e: any) {
      setError(typeof e?.message === "string" ? e.message : "Kon bestellingen niet laden");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  const stats = useMemo(() => {
    const openCount = orders.filter((o) => (o.status || "OPEN") === "OPEN").length;
    const tablesCount = orders.filter((o: any) => !!(o.tableId || o.table)).length;
    const nameCount = orders.filter((o) => !!o.customer).length;
    const kitchenCount = orders.filter((o) => o.status === "SENT" || o.status === "IN_PREP").length;
    return { openCount, tablesCount, nameCount, kitchenCount };
  }, [orders]);

  const filtered = useMemo(() => orders.filter((o) => matchesQuery(o, search) && filterKind(o, filter)), [orders, search, filter]);

  const mostRecent = useMemo(() => (orders[0] ? orders[0] : null), [orders]);

  return { loading, error, orders, search, setSearch, filter, setFilter, refresh, stats, filtered, mostRecent };
}
