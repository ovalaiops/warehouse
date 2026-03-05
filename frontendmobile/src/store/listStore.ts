import { create } from "zustand";
import type { ShoppingList, ShoppingListItem } from "../types";

interface ListState {
  lists: ShoppingList[];
  activeListId: string | null;
  addList: (name: string) => void;
  removeList: (id: string) => void;
  setActiveList: (id: string) => void;
  addItem: (listId: string, item: ShoppingListItem) => void;
  removeItem: (listId: string, productId: string) => void;
  toggleItem: (listId: string, productId: string) => void;
  updateQuantity: (
    listId: string,
    productId: string,
    quantity: number
  ) => void;
}

export const useListStore = create<ListState>((set) => ({
  lists: [
    {
      id: "default",
      name: "My Shopping List",
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  activeListId: "default",

  addList: (name) =>
    set((state) => ({
      lists: [
        ...state.lists,
        {
          id: Date.now().toString(),
          name,
          items: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    })),

  removeList: (id) =>
    set((state) => ({
      lists: state.lists.filter((l) => l.id !== id),
      activeListId: state.activeListId === id ? null : state.activeListId,
    })),

  setActiveList: (id) => set({ activeListId: id }),

  addItem: (listId, item) =>
    set((state) => ({
      lists: state.lists.map((l) =>
        l.id === listId
          ? {
              ...l,
              items: [...l.items, item],
              updatedAt: new Date().toISOString(),
            }
          : l
      ),
    })),

  removeItem: (listId, productId) =>
    set((state) => ({
      lists: state.lists.map((l) =>
        l.id === listId
          ? {
              ...l,
              items: l.items.filter((i) => i.productId !== productId),
              updatedAt: new Date().toISOString(),
            }
          : l
      ),
    })),

  toggleItem: (listId, productId) =>
    set((state) => ({
      lists: state.lists.map((l) =>
        l.id === listId
          ? {
              ...l,
              items: l.items.map((i) =>
                i.productId === productId ? { ...i, checked: !i.checked } : i
              ),
              updatedAt: new Date().toISOString(),
            }
          : l
      ),
    })),

  updateQuantity: (listId, productId, quantity) =>
    set((state) => ({
      lists: state.lists.map((l) =>
        l.id === listId
          ? {
              ...l,
              items: l.items.map((i) =>
                i.productId === productId ? { ...i, quantity } : i
              ),
              updatedAt: new Date().toISOString(),
            }
          : l
      ),
    })),
}));
