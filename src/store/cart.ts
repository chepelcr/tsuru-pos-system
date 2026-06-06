import { create } from "zustand";
import type { Product } from "../types";
import type { DocTypeCode } from "../types/invoice";
import type { LineDetail } from "../types/lineDetail";

export interface CartItem {
  product: Product;
  qty: number;
  lineDiscount?: number; // percentage override for this line (e.g. 10 = 10%)
  lineNote?: string;     // description override for this line
  lineDetail?: Partial<LineDetail>; // Full line detail with taxes, discounts, fiscal info
}

interface CartStore {
  items: Record<string, CartItem>;
  doc_type: DocTypeCode;
  add: (product: Product) => void;
  remove: (productId: string) => void;
  updateLine: (productId: string, patch: { 
    qty?: number; 
    lineDiscount?: number; 
    lineNote?: string;
    lineDetail?: Partial<LineDetail>;
  }) => void;
  clear: () => void;
  setItems: (items: Record<string, CartItem>) => void; // New method
  total: () => number;
  count: () => number;
  setDocType: (code: DocTypeCode) => void;
}

export const useCart = create<CartStore>((set, get) => ({
  items: {},
  doc_type: '04', // default: Tiquete Electrónico (Hacienda code "04")

  setDocType: (code) => set({ doc_type: code }),

  setItems: (items) => set({ items }), // New method to set items directly

  add: (product) => {
    const pid = product.product_id;
    set((state) => ({
      items: {
        ...state.items,
        [pid]: {
          product,
          qty: (state.items[pid]?.qty ?? 0) + 1,
          lineDiscount: state.items[pid]?.lineDiscount,
          lineNote: state.items[pid]?.lineNote,
        },
      },
    }));
  },

  remove: (productId) => {
    set((state) => {
      const item = state.items[productId];
      if (!item) return state;
      
      // If quantity is 1 or less, remove the item completely
      if (item.qty <= 1) {
        const { [productId]: _, ...rest } = state.items;
        return { items: rest };
      }
      
      // Otherwise, decrement quantity
      return {
        items: {
          ...state.items,
          [productId]: { ...item, qty: item.qty - 1 },
        },
      };
    });
  },

  updateLine: (productId, patch) => {
    set((state) => {
      const item = state.items[productId];
      if (!item) return state;
      
      // Handle qty: 0 as delete
      if (patch.qty !== undefined && patch.qty === 0) {
        const { [productId]: _, ...rest } = state.items;
        return { items: rest };
      }
      
      const updated = { ...item };
      if (patch.qty !== undefined && patch.qty > 0) updated.qty = patch.qty;
      if (patch.lineDiscount !== undefined) updated.lineDiscount = patch.lineDiscount;
      if (patch.lineNote !== undefined) updated.lineNote = patch.lineNote;
      if (patch.lineDetail !== undefined) updated.lineDetail = patch.lineDetail;
      return { items: { ...state.items, [productId]: updated } };
    });
  },

  clear: () => set({ items: {} }),

  total: () =>
    Object.values(get().items).reduce(
      (sum, { product, qty }) => sum + Number(product.sale_price ?? product.price ?? 0) * qty,
      0
    ),

  count: () =>
    Object.values(get().items).reduce((sum, { qty }) => sum + qty, 0),
}));
