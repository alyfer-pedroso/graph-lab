import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_TOOLBAR_ANCHOR, type ToolbarAnchor } from "@/core/domain/toolbar/toolbar-anchor";
import { TOOLBAR_PREFS_KEY } from "@/core/infrastructure/persistence/storage-keys";

interface ToolbarStore {
  anchor: ToolbarAnchor;
  setAnchor: (anchor: ToolbarAnchor) => void;
}

export const useToolbarStore = create<ToolbarStore>()(
  persist(
    (set) => ({
      anchor: DEFAULT_TOOLBAR_ANCHOR,
      setAnchor: (anchor) => set({ anchor }),
    }),
    { name: TOOLBAR_PREFS_KEY },
  ),
);
