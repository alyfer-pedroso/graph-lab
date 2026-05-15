import { create } from "zustand";

export type TreeHighlightType = "spanning" | "mst";

export interface TreeHighlight {
  treeEdges: Set<string>;
  treeVertices: Set<string>;
  rootVertex: string | null;
  type: TreeHighlightType;
}

interface TreeStore {
  treeHighlight: TreeHighlight | null;
  setTreeHighlight: (highlight: TreeHighlight | null) => void;
}

export const useTreeStore = create<TreeStore>()((set) => ({
  treeHighlight: null,
  setTreeHighlight: (highlight) => set({ treeHighlight: highlight }),
}));
