import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Warehouse } from "@/types";

interface WarehouseState {
  selectedWarehouse: Warehouse | null;
  warehouses: Warehouse[];
  setSelectedWarehouse: (warehouse: Warehouse) => void;
  setWarehouses: (warehouses: Warehouse[]) => void;
}

export const useWarehouseStore = create<WarehouseState>()(
  persist(
    (set) => ({
      selectedWarehouse: null,
      warehouses: [],

      setSelectedWarehouse: (warehouse) =>
        set({ selectedWarehouse: warehouse }),

      setWarehouses: (warehouses) =>
        set({ warehouses }),
    }),
    {
      name: "warehouse-selected",
      partialize: (state) => ({
        selectedWarehouse: state.selectedWarehouse,
      }),
    }
  )
);
