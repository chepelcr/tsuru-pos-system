import { create } from "zustand";

interface InventoryStore {
  stock: Record<string, number>;
  setOpeningStock: (productId: string, qty: number) => void;
  decrement: (productId: string, qty: number) => void;
  getStock: (productId: string) => number | undefined;
}

export const useInventory = create<InventoryStore>((set, get) => ({
  stock: {},

  setOpeningStock: (productId, qty) =>
    set((state) => ({ stock: { ...state.stock, [productId]: qty } })),

  decrement: (productId, qty) =>
    set((state) => ({
      stock: {
        ...state.stock,
        [productId]: Math.max(0, (state.stock[productId] ?? 0) - qty),
      },
    })),

  getStock: (productId) => get().stock[productId],
}));
