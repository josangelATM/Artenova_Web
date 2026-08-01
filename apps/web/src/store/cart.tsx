import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Product } from "@artenova/shared";
import { calculateLineTotal } from "@artenova/shared";

export type CartItem = {
  id: string;
  product: Product;
  quantity: number;
  selectedExtraIds: string[];
  personalization: Record<string, string | string[]>;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  addItem: (item: Omit<CartItem, "id">) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "artenova-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) ?? "[]") as CartItem[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    const total = items.reduce((sum, item) => {
      return sum + calculateLineTotal(item.product, item.quantity, item.selectedExtraIds).lineTotal;
    }, 0);

    return {
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      total,
      addItem: (item) => setItems((current) => [...current, { ...item, id: crypto.randomUUID() }]),
      updateQuantity: (id, quantity) =>
        setItems((current) => current.map((item) => (item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item))),
      removeItem: (id) => setItems((current) => current.filter((item) => item.id !== id)),
      clear: () => {
        localStorage.removeItem(storageKey);
        setItems([]);
      }
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error("useCart debe usarse dentro de CartProvider");
  }
  return value;
}
