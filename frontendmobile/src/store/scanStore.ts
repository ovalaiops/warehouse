import { create } from "zustand";
import type { ProductScanResult, ScanHistoryItem } from "../types";

interface ScanState {
  currentScan: ProductScanResult | null;
  scanHistory: ScanHistoryItem[];
  isScanning: boolean;
  setScanResult: (result: ProductScanResult) => void;
  clearScan: () => void;
  addToHistory: (item: ScanHistoryItem) => void;
  setScanning: (scanning: boolean) => void;
}

export const useScanStore = create<ScanState>((set) => ({
  currentScan: null,
  scanHistory: [],
  isScanning: false,
  setScanResult: (result) => set({ currentScan: result, isScanning: false }),
  clearScan: () => set({ currentScan: null }),
  addToHistory: (item) =>
    set((state) => ({
      scanHistory: [item, ...state.scanHistory].slice(0, 100),
    })),
  setScanning: (scanning) => set({ isScanning: scanning }),
}));
