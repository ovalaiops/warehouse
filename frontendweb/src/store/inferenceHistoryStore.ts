import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface InferenceHistoryEntry {
  id: string;
  timestamp: number;
  mode: string;
  modeLabel: string;
  model: string;
  thumbnailDataUrl: string;
  imageSource: string;
  processingTimeMs: number;
  result: Record<string, unknown>;
}

interface InferenceHistoryState {
  entries: InferenceHistoryEntry[];
  addEntry: (entry: InferenceHistoryEntry) => void;
  removeEntry: (id: string) => void;
  clearAll: () => void;
}

const MAX_ENTRIES = 50;
const MAX_THUMBNAIL_SIZE = 160;

/** Resize an image data URL to a small thumbnail to save localStorage space. */
export function createThumbnailDataUrl(
  dataUrl: string
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(
        MAX_THUMBNAIL_SIZE / img.width,
        MAX_THUMBNAIL_SIZE / img.height,
        1
      );
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.6));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export const useInferenceHistoryStore = create<InferenceHistoryState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) =>
        set((state) => ({
          entries: [entry, ...state.entries].slice(0, MAX_ENTRIES),
        })),
      removeEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        })),
      clearAll: () => set({ entries: [] }),
    }),
    {
      name: "inference-history",
    }
  )
);
