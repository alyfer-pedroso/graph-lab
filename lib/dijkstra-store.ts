import { create } from "zustand";

export interface DijkstraHighlight {
  currentVertex: string | null;
  visitedVertices: Set<string>;
  activeEdges: Set<string>;
  pathVertices: Set<string>;
  pathEdges: Set<string>;
  targetVertex: string | null;
  startVertex: string | null;
  isFinished: boolean;
}

interface DijkstraStore {
  dijkstraHighlight: DijkstraHighlight | null;
  setDijkstraHighlight: (highlight: DijkstraHighlight | null) => void;
}

export const useDijkstraStore = create<DijkstraStore>()((set) => ({
  dijkstraHighlight: null,
  setDijkstraHighlight: (highlight) => set({ dijkstraHighlight: highlight }),
}));
