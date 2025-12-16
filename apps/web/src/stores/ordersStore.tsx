import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type OrderStatus = "OPEN" | "PAID" | "VOID";
export type OrderLine = { id: string; title: string; priceCents: number; qty: number };
export type Order = {
  id: string;
  status: OrderStatus;
  lines: OrderLine[];
  createdAt: number;
  paidAt?: number;
};

type OrdersContextValue = {
  orders: Order[];
  currentOrderId: string;

  createNewOrder: () => string;
  setCurrentOrder: (id: string) => void;

  addLine: (menuItemId: string, title: string, priceCents: number, qtyDelta?: number) => void;
  removeLine: (menuItemId: string) => void;
  clearCurrentOrder: () => void;

  voidOrder: (orderId: string) => void;

  getCurrentOrder: () => Order;
  getTotalCents: (orderId?: string) => number;
  getItemsCount: (orderId?: string) => number;

  duplicateToNewOpen: (orderId: string) => string;
};

const OrdersContext = createContext<OrdersContextValue | null>(null);

function uid(prefix = "ord"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentOrderId, setCurrentOrderId] = useState<string>("");
  const didInit = useRef(false);

  // init: always one OPEN order
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const id = uid();
    const first: Order = { id, status: "OPEN", lines: [], createdAt: Date.now() };
    setOrders([first]);
    setCurrentOrderId(id);
  }, []);

  const createNewOrder = useCallback(() => {
    const id = uid();
    const next: Order = { id, status: "OPEN", lines: [], createdAt: Date.now() };
    setOrders((prev) => [next, ...prev]);
    setCurrentOrderId(id);
    return id;
  }, []);

  const setCurrentOrder = useCallback((id: string) => {
    setCurrentOrderId(id);
    setOrders((prev) => {
      const exists = prev.some((o) => o.id === id);
      if (exists) return prev;
      const next: Order = { id, status: "OPEN", lines: [], createdAt: Date.now() };
      return [next, ...prev];
    });
  }, []);

  const getCurrentOrder = useCallback((): Order => {
    const found = orders.find((o) => o.id === currentOrderId);
    if (found) return found;

    // Safety fallback: create new open order if missing
    const id = uid();
    const next: Order = { id, status: "OPEN", lines: [], createdAt: Date.now() };
    setOrders((prev) => [next, ...prev]);
    setCurrentOrderId(id);
    return next;
  }, [orders, currentOrderId]);

  const addLine = useCallback(
    (menuItemId: string, title: string, priceCents: number, qtyDelta: number = 1) => {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== currentOrderId) return o;
          if (o.status !== "OPEN") return o;

          const lines = [...o.lines];
          const idx = lines.findIndex((l) => l.id === menuItemId);

          if (idx >= 0) {
            const nextQty = lines[idx].qty + qtyDelta;
            if (nextQty <= 0) lines.splice(idx, 1);
            else lines[idx] = { ...lines[idx], qty: nextQty };
          } else if (qtyDelta > 0) {
            lines.push({ id: menuItemId, title, priceCents, qty: qtyDelta });
          }

          return { ...o, lines };
        })
      );
    },
    [currentOrderId]
  );

  const removeLine = useCallback(
    (menuItemId: string) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === currentOrderId && o.status === "OPEN"
            ? { ...o, lines: o.lines.filter((l) => l.id !== menuItemId) }
            : o
        )
      );
    },
    [currentOrderId]
  );

  const clearCurrentOrder = useCallback(() => {
    setOrders((prev) =>
      prev.map((o) => (o.id === currentOrderId && o.status === "OPEN" ? { ...o, lines: [] } : o))
    );
  }, [currentOrderId]);

  // removed local markPaid; rely on backend statuses

  const voidOrder = useCallback(
    (orderId: string) => {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "VOID" } : o)));

      if (orderId === currentOrderId) {
        const newId = uid();
        const next: Order = { id: newId, status: "OPEN", lines: [], createdAt: Date.now() };
        setOrders((prev) => [next, ...prev]);
        setCurrentOrderId(newId);
      }
    },
    [currentOrderId]
  );

  const getTotalCents = useCallback(
    (orderId?: string) => {
      const id = orderId ?? currentOrderId;
      const o = orders.find((x) => x.id === id);
      if (!o) return 0;
      return o.lines.reduce((s, l) => s + l.qty * l.priceCents, 0);
    },
    [orders, currentOrderId]
  );

  const getItemsCount = useCallback(
    (orderId?: string) => {
      const id = orderId ?? currentOrderId;
      const o = orders.find((x) => x.id === id);
      if (!o) return 0;
      return o.lines.reduce((s, l) => s + l.qty, 0);
    },
    [orders, currentOrderId]
  );

  const duplicateToNewOpen = useCallback(
    (orderId: string) => {
      const source = orders.find((o) => o.id === orderId);
      const id = uid();
      const lines = source ? source.lines.map((l) => ({ ...l })) : [];
      const next: Order = { id, status: "OPEN", lines, createdAt: Date.now() };
      setOrders((prev) => [next, ...prev]);
      setCurrentOrderId(id);
      return id;
    },
    [orders]
  );

  const value: OrdersContextValue = useMemo(
    () => ({
      orders,
      currentOrderId,
      createNewOrder,
      setCurrentOrder,
      addLine,
      removeLine,
      clearCurrentOrder,
      voidOrder,
      getCurrentOrder,
      getTotalCents,
      getItemsCount,
      duplicateToNewOpen,
    }),
    [
      orders,
      currentOrderId,
      createNewOrder,
      setCurrentOrder,
      addLine,
      removeLine,
      clearCurrentOrder,
      voidOrder,
      getCurrentOrder,
      getTotalCents,
      getItemsCount,
      duplicateToNewOpen,
    ]
  );

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within OrdersProvider");
  return ctx;
}
