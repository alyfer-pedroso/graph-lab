import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Graph, Vertex, Edge, Tool, GraphState } from "./graph-types";
import { generateVertexLabel, generateEdgeLabel } from "./graph-algorithms";

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

const GRAPH_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4", "#f97316", "#a855f7", "#14b8a6", "#ef4444", "#3b82f6"];

function getGraphDefaultColor(graphIndex: number): string {
  return GRAPH_COLORS[graphIndex % GRAPH_COLORS.length];
}

function createDefaultGraph(): Graph {
  return {
    id: generateId(),
    name: "Grafo 1",
    vertices: [],
    edges: [],
    directed: false,
    weighted: false,
    opacity: 1,
    visible: true,
    offsetX: 0,
    offsetY: 0,
  };
}

interface GraphStore extends GraphState {
  createGraph: (name?: string, directed?: boolean, weighted?: boolean) => string;
  deleteGraph: (id: string) => void;
  setActiveGraph: (id: string | null) => void;
  updateGraph: (id: string, updates: Partial<Graph>) => void;
  duplicateGraph: (id: string) => string;
  clearGraph: (id: string) => void;
  importGraph: (graphData: Omit<Graph, "id"> & { id?: string }) => string;
  resetAllGraphs: () => void;

  addVertex: (x: number, y: number, label?: string) => string | null;
  updateVertex: (id: string, updates: Partial<Vertex>) => void;
  deleteVertex: (id: string) => void;
  moveVertex: (id: string, x: number, y: number) => void;

  addEdge: (source: string, target: string, label?: string, weight?: number) => string | null;
  updateEdge: (id: string, updates: Partial<Edge>) => void;
  deleteEdge: (id: string) => void;

  selectVertex: (id: string, addToSelection?: boolean) => void;
  selectEdge: (id: string, addToSelection?: boolean) => void;
  clearSelection: () => void;

  setTool: (tool: Tool) => void;

  startEdgeCreation: (sourceId: string) => void;
  cancelEdgeCreation: () => void;

  setCompareMode: (enabled: boolean) => void;
  setCompareGraph: (id: string | null) => void;

  autoLabelVertices: () => void;
  autoLabelEdges: () => void;

  setGraphOpacity: (id: string, opacity: number) => void;
  setGraphVisible: (id: string, visible: boolean) => void;
  setGraphOffset: (id: string, offsetX: number, offsetY: number) => void;
  moveGraphOffset: (id: string, dx: number, dy: number) => void;

  getActiveGraph: () => Graph | null;
  getCompareGraph: () => Graph | null;
}

const initialGraph = createDefaultGraph();

export const useGraphStore = create<GraphStore>()(
  persist(
    (set, get) => ({
      graphs: [initialGraph],
      activeGraphId: initialGraph.id,
      selectedVertexIds: [],
      selectedEdgeIds: [],
      tool: "select",
      isCreatingEdge: false,
      edgeSourceId: null,
      compareMode: false,
      compareGraphId: null,

      createGraph: (name, directed = false, weighted = false) => {
        const id = generateId();
        const currentGraphs = get().graphs;
        const graphIndex = currentGraphs.length;
        const newGraph: Graph = {
          id,
          name: name || `Grafo ${graphIndex + 1}`,
          vertices: [],
          edges: [],
          directed,
          weighted,
          opacity: 1,
          visible: true,
          offsetX: 0,
          offsetY: 0,
          defaultVertexColor: getGraphDefaultColor(graphIndex),
        };
        set((state) => ({
          graphs: [...state.graphs, newGraph],
          activeGraphId: id,
        }));
        return id;
      },

      importGraph: (graphData) => {
        const id = graphData.id || generateId();
        const currentGraphs = get().graphs;
        const graphIndex = currentGraphs.length;
        const newGraph: Graph = {
          id,
          name: graphData.name || `Grafo importado`,
          vertices: graphData.vertices || [],
          edges: graphData.edges || [],
          directed: graphData.directed ?? false,
          weighted: graphData.weighted ?? false,
          opacity: graphData.opacity ?? 1,
          visible: graphData.visible ?? true,
          offsetX: graphData.offsetX ?? 0,
          offsetY: graphData.offsetY ?? 0,
          defaultVertexColor: graphData.defaultVertexColor || getGraphDefaultColor(graphIndex),
        };
        // Avoid ID collision — generate a fresh ID
        const safeId = currentGraphs.some((g) => g.id === id) ? generateId() : id;
        newGraph.id = safeId;
        set((state) => ({
          graphs: [...state.graphs, newGraph],
          activeGraphId: safeId,
        }));
        return safeId;
      },

      resetAllGraphs: () => {
        const defaultGraph = createDefaultGraph();
        set({
          graphs: [defaultGraph],
          activeGraphId: defaultGraph.id,
          selectedVertexIds: [],
          selectedEdgeIds: [],
          compareGraphId: null,
          isCreatingEdge: false,
          edgeSourceId: null,
        });
      },

      deleteGraph: (id) => {
        set((state) => {
          const newGraphs = state.graphs.filter((g) => g.id !== id);
          if (newGraphs.length === 0) {
            const defaultGraph = createDefaultGraph();
            return {
              graphs: [defaultGraph],
              activeGraphId: defaultGraph.id,
              compareGraphId: null,
            };
          }
          return {
            graphs: newGraphs,
            activeGraphId: state.activeGraphId === id ? newGraphs[0].id : state.activeGraphId,
            compareGraphId: state.compareGraphId === id ? null : state.compareGraphId,
          };
        });
      },

      setActiveGraph: (id) => {
        set({ activeGraphId: id, selectedVertexIds: [], selectedEdgeIds: [] });
      },

      updateGraph: (id, updates) => {
        set((state) => ({
          graphs: state.graphs.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        }));
      },

      duplicateGraph: (id) => {
        const state = get();
        const graph = state.graphs.find((g) => g.id === id);
        if (!graph) return "";

        const newId = generateId();
        const graphIndex = state.graphs.length;
        const newGraph: Graph = {
          ...graph,
          id: newId,
          name: `${graph.name} (cópia)`,
          vertices: graph.vertices.map((v) => ({ ...v })),
          edges: graph.edges.map((e) => ({ ...e })),
          offsetX: graph.offsetX + 20,
          offsetY: graph.offsetY + 20,
          defaultVertexColor: graph.defaultVertexColor || getGraphDefaultColor(graphIndex),
        };

        set((state) => ({
          graphs: [...state.graphs, newGraph],
          activeGraphId: newId,
        }));
        return newId;
      },

      clearGraph: (id) => {
        set((state) => ({
          graphs: state.graphs.map((g) => (g.id === id ? { ...g, vertices: [], edges: [] } : g)),
          selectedVertexIds: [],
          selectedEdgeIds: [],
        }));
      },

      addVertex: (x, y, label) => {
        const activeGraph = get().getActiveGraph();
        if (!activeGraph) return null;

        const existingLabels = activeGraph.vertices.map((v) => v.label);
        const graphIndex = get().graphs.findIndex((g) => g.id === activeGraph.id);
        const defaultColor = activeGraph.defaultVertexColor || getGraphDefaultColor(graphIndex);

        const newVertex: Vertex = {
          id: generateId(),
          label: label || generateVertexLabel(existingLabels),
          x,
          y,
          color: defaultColor,
        };

        set((state) => ({
          graphs: state.graphs.map((g) => (g.id === state.activeGraphId ? { ...g, vertices: [...g.vertices, newVertex] } : g)),
        }));
        return newVertex.id;
      },

      updateVertex: (id, updates) => {
        set((state) => ({
          graphs: state.graphs.map((g) =>
            g.id === state.activeGraphId ? { ...g, vertices: g.vertices.map((v) => (v.id === id ? { ...v, ...updates } : v)) } : g,
          ),
        }));
      },

      deleteVertex: (id) => {
        set((state) => ({
          graphs: state.graphs.map((g) =>
            g.id === state.activeGraphId
              ? {
                  ...g,
                  vertices: g.vertices.filter((v) => v.id !== id),
                  edges: g.edges.filter((e) => e.source !== id && e.target !== id),
                }
              : g,
          ),
          selectedVertexIds: state.selectedVertexIds.filter((v) => v !== id),
        }));
      },

      moveVertex: (id, x, y) => {
        set((state) => ({
          graphs: state.graphs.map((g) =>
            g.id === state.activeGraphId ? { ...g, vertices: g.vertices.map((v) => (v.id === id ? { ...v, x, y } : v)) } : g,
          ),
        }));
      },

      addEdge: (source, target, label, weight) => {
        const activeGraph = get().getActiveGraph();
        if (!activeGraph) return null;

        const isLoop = source === target;

        const edgeExists = activeGraph.edges.some(
          (e) => (e.source === source && e.target === target) || (!activeGraph.directed && !isLoop && e.source === target && e.target === source),
        );
        if (edgeExists) return null;

        const existingLabels = activeGraph.edges.map((e) => e.label || "");
        const newEdge: Edge = {
          id: generateId(),
          source,
          target,
          label: label || generateEdgeLabel(existingLabels),
          weight: activeGraph.weighted ? (weight ?? 1) : undefined,
          directed: activeGraph.directed,
        };

        set((state) => ({
          graphs: state.graphs.map((g) => (g.id === state.activeGraphId ? { ...g, edges: [...g.edges, newEdge] } : g)),
          isCreatingEdge: false,
          edgeSourceId: null,
        }));
        return newEdge.id;
      },

      updateEdge: (id, updates) => {
        set((state) => ({
          graphs: state.graphs.map((g) =>
            g.id === state.activeGraphId ? { ...g, edges: g.edges.map((e) => (e.id === id ? { ...e, ...updates } : e)) } : g,
          ),
        }));
      },

      deleteEdge: (id) => {
        set((state) => ({
          graphs: state.graphs.map((g) => (g.id === state.activeGraphId ? { ...g, edges: g.edges.filter((e) => e.id !== id) } : g)),
          selectedEdgeIds: state.selectedEdgeIds.filter((e) => e !== id),
        }));
      },

      selectVertex: (id, addToSelection = false) => {
        set((state) => ({
          selectedVertexIds: addToSelection
            ? state.selectedVertexIds.includes(id)
              ? state.selectedVertexIds.filter((v) => v !== id)
              : [...state.selectedVertexIds, id]
            : [id],
          selectedEdgeIds: addToSelection ? state.selectedEdgeIds : [],
        }));
      },

      selectEdge: (id, addToSelection = false) => {
        set((state) => ({
          selectedEdgeIds: addToSelection
            ? state.selectedEdgeIds.includes(id)
              ? state.selectedEdgeIds.filter((e) => e !== id)
              : [...state.selectedEdgeIds, id]
            : [id],
          selectedVertexIds: addToSelection ? state.selectedVertexIds : [],
        }));
      },

      clearSelection: () => {
        set({ selectedVertexIds: [], selectedEdgeIds: [] });
      },

      setTool: (tool) => {
        set({ tool, isCreatingEdge: false, edgeSourceId: null });
      },

      startEdgeCreation: (sourceId) => {
        set({ isCreatingEdge: true, edgeSourceId: sourceId });
      },

      cancelEdgeCreation: () => {
        set({ isCreatingEdge: false, edgeSourceId: null });
      },

      setCompareMode: (enabled) => {
        set({ compareMode: enabled, compareGraphId: enabled ? null : null });
      },

      setCompareGraph: (id) => {
        set({ compareGraphId: id });
      },

      autoLabelVertices: () => {
        set((state) => ({
          graphs: state.graphs.map((g) =>
            g.id === state.activeGraphId
              ? {
                  ...g,
                  vertices: g.vertices.map((v, i) => ({
                    ...v,
                    label: String.fromCharCode(65 + i),
                  })),
                }
              : g,
          ),
        }));
      },

      autoLabelEdges: () => {
        set((state) => ({
          graphs: state.graphs.map((g) =>
            g.id === state.activeGraphId
              ? {
                  ...g,
                  edges: g.edges.map((e, i) => ({
                    ...e,
                    label: `e${i + 1}`,
                  })),
                }
              : g,
          ),
        }));
      },

      setGraphOpacity: (id, opacity) => {
        set((state) => ({
          graphs: state.graphs.map((g) => (g.id === id ? { ...g, opacity: Math.max(0, Math.min(1, opacity)) } : g)),
        }));
      },

      setGraphVisible: (id, visible) => {
        set((state) => ({
          graphs: state.graphs.map((g) => (g.id === id ? { ...g, visible } : g)),
        }));
      },

      setGraphOffset: (id, offsetX, offsetY) => {
        set((state) => ({
          graphs: state.graphs.map((g) => (g.id === id ? { ...g, offsetX, offsetY } : g)),
        }));
      },

      moveGraphOffset: (id, dx, dy) => {
        set((state) => ({
          graphs: state.graphs.map((g) => (g.id === id ? { ...g, offsetX: g.offsetX + dx, offsetY: g.offsetY + dy } : g)),
        }));
      },

      getActiveGraph: () => {
        const state = get();
        return state.graphs.find((g) => g.id === state.activeGraphId) || null;
      },

      getCompareGraph: () => {
        const state = get();
        return state.graphs.find((g) => g.id === state.compareGraphId) || null;
      },
    }),
    {
      name: "graphlab-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        graphs: state.graphs,
        activeGraphId: state.activeGraphId,
      }),
    },
  ),
);
