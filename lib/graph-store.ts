import { create } from "zustand";
import type { Graph, Vertex, Edge, GraphState, GraphFolder, HistorySnapshot } from "./graph-types";
import { HISTORY_LIMIT } from "./graph-types";
import type { ProjectPayload } from "@/core/domain/project/project.entity";
import { getGraphDefaultColor } from "@/core/domain/graph/graph-color";
import { generateVertexLabel, generateEdgeLabel } from "./graph-algorithms";

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

interface GraphStore extends GraphState {
  createGraph: (name?: string, directed?: boolean, weighted?: boolean) => string;
  deleteGraph: (id: string) => void;
  setActiveGraph: (id: string | null) => void;
  updateGraph: (id: string, updates: Partial<Graph>) => void;
  duplicateGraph: (id: string) => string;
  clearGraph: (id: string) => void;
  clearWorkspace: () => void;
  loadFromProject: (payload: ProjectPayload) => void;

  createFolder: (name: string) => string;
  deleteFolder: (id: string, deleteGraphs?: boolean) => void;
  renameFolder: (id: string, name: string) => void;
  addGraphToFolder: (graphId: string, folderId: string) => void;
  removeGraphFromFolder: (graphId: string) => void;
  toggleFolderCollapsed: (id: string) => void;

  reorderFolders: (activeId: string, overId: string) => void;
  reorderGraphsInFolder: (folderId: string, activeId: string, overId: string) => void;
  reorderStandaloneGraphs: (activeId: string, overId: string) => void;
  moveGraphToFolder: (graphId: string, folderId: string, beforeGraphId?: string | null) => void;
  moveGraphToRoot: (graphId: string) => void;

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

  setCompareMode: (enabled: boolean) => void;
  setCompareGraph: (id: string | null) => void;

  setGridSnap: (enabled: boolean) => void;
  toggleGridSnap: () => void;
  autoLayout: () => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  autoLabelVertices: () => void;
  autoLabelEdges: () => void;

  setGraphOpacity: (id: string, opacity: number) => void;
  setGraphVisible: (id: string, visible: boolean) => void;
  setGraphOffset: (id: string, offsetX: number, offsetY: number) => void;
  moveGraphOffset: (id: string, dx: number, dy: number) => void;

  getActiveGraph: () => Graph | null;
  getCompareGraph: () => Graph | null;
}

function takeSnapshot(state: { graphs: Graph[]; activeGraphId: string | null }): HistorySnapshot {
  return { graphs: state.graphs, activeGraphId: state.activeGraphId };
}

function withHistory(state: { graphs: Graph[]; activeGraphId: string | null; past: HistorySnapshot[] }) {
  return {
    past: [...state.past, takeSnapshot(state)].slice(-HISTORY_LIMIT),
    future: [] as HistorySnapshot[],
  };
}

export const useGraphStore = create<GraphStore>()((set, get) => ({
  graphs: [],
  folders: [],
  activeGraphId: null,
  selectedVertexIds: [],
  selectedEdgeIds: [],
  compareMode: false,
  compareGraphId: null,
  gridSnap: true,
  past: [],
  future: [],

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
          ...withHistory(state),
          graphs: [...state.graphs, newGraph],
          activeGraphId: id,
        }));
        return id;
      },

      clearWorkspace: () => {
        set({
          graphs: [],
          folders: [],
          activeGraphId: null,
          selectedVertexIds: [],
          selectedEdgeIds: [],
          compareMode: false,
          compareGraphId: null,
          past: [],
          future: [],
        });
      },

      loadFromProject: (payload) => {
        set({
          graphs: payload.graphs,
          folders: payload.folders,
          activeGraphId: payload.activeGraphId,
          gridSnap: payload.gridSnap,
          selectedVertexIds: [],
          selectedEdgeIds: [],
          compareMode: false,
          compareGraphId: null,
          past: [],
          future: [],
        });
      },

      deleteGraph: (id) => {
        set((state) => {
          const history = withHistory(state);
          const newGraphs = state.graphs.filter((g) => g.id !== id);
          const newFolders = state.folders.map((f) => ({ ...f, graphIds: f.graphIds.filter((gid) => gid !== id) }));
          return {
            ...history,
            graphs: newGraphs,
            folders: newFolders,
            activeGraphId:
              state.activeGraphId === id ? (newGraphs.length > 0 ? newGraphs[0].id : null) : state.activeGraphId,
            compareGraphId: state.compareGraphId === id ? null : state.compareGraphId,
          };
        });
      },

      setActiveGraph: (id) => {
        set({ activeGraphId: id, selectedVertexIds: [], selectedEdgeIds: [] });
      },

      updateGraph: (id, updates) => {
        set((state) => ({
          ...withHistory(state),
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
          ...withHistory(state),
          graphs: [...state.graphs, newGraph],
          activeGraphId: newId,
        }));
        return newId;
      },

      clearGraph: (id) => {
        set((state) => ({
          ...withHistory(state),
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
          ...withHistory(state),
          graphs: state.graphs.map((g) => (g.id === state.activeGraphId ? { ...g, vertices: [...g.vertices, newVertex] } : g)),
        }));
        return newVertex.id;
      },

      updateVertex: (id, updates) => {
        set((state) => ({
          ...withHistory(state),
          graphs: state.graphs.map((g) =>
            g.id === state.activeGraphId ? { ...g, vertices: g.vertices.map((v) => (v.id === id ? { ...v, ...updates } : v)) } : g,
          ),
        }));
      },

      deleteVertex: (id) => {
        set((state) => ({
          ...withHistory(state),
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
          ...withHistory(state),
          graphs: state.graphs.map((g) => (g.id === state.activeGraphId ? { ...g, edges: [...g.edges, newEdge] } : g)),
        }));
        return newEdge.id;
      },

      updateEdge: (id, updates) => {
        set((state) => ({
          ...withHistory(state),
          graphs: state.graphs.map((g) =>
            g.id === state.activeGraphId ? { ...g, edges: g.edges.map((e) => (e.id === id ? { ...e, ...updates } : e)) } : g,
          ),
        }));
      },

      deleteEdge: (id) => {
        set((state) => ({
          ...withHistory(state),
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

      setCompareMode: (enabled) => {
        set({ compareMode: enabled, compareGraphId: enabled ? null : null });
      },

      setCompareGraph: (id) => {
        set({ compareGraphId: id });
      },

      setGridSnap: (enabled) => {
        set({ gridSnap: enabled });
      },

      toggleGridSnap: () => {
        set((state) => ({ gridSnap: !state.gridSnap }));
      },

      pushHistory: () => {
        set((state) => withHistory(state));
      },

      undo: () => {
        set((state) => {
          if (state.past.length === 0) return state;
          const previous = state.past[state.past.length - 1];
          const newPast = state.past.slice(0, -1);
          return {
            past: newPast,
            future: [...state.future, takeSnapshot(state)].slice(-HISTORY_LIMIT),
            graphs: previous.graphs,
            activeGraphId: previous.activeGraphId,
            selectedVertexIds: [],
            selectedEdgeIds: [],
          };
        });
      },

      redo: () => {
        set((state) => {
          if (state.future.length === 0) return state;
          const next = state.future[state.future.length - 1];
          const newFuture = state.future.slice(0, -1);
          return {
            past: [...state.past, takeSnapshot(state)].slice(-HISTORY_LIMIT),
            future: newFuture,
            graphs: next.graphs,
            activeGraphId: next.activeGraphId,
            selectedVertexIds: [],
            selectedEdgeIds: [],
          };
        });
      },

      canUndo: () => get().past.length > 0,
      canRedo: () => get().future.length > 0,

      autoLabelVertices: () => {
        set((state) => ({
          ...withHistory(state),
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
          ...withHistory(state),
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
          ...withHistory(state),
          graphs: state.graphs.map((g) => (g.id === id ? { ...g, offsetX, offsetY } : g)),
        }));
      },

      moveGraphOffset: (id, dx, dy) => {
        set((state) => ({
          graphs: state.graphs.map((g) => (g.id === id ? { ...g, offsetX: g.offsetX + dx, offsetY: g.offsetY + dy } : g)),
        }));
      },

      createFolder: (name) => {
        const id = generateId();
        const newFolder: GraphFolder = { id, name, graphIds: [], collapsed: false };
        set((state) => ({ folders: [...state.folders, newFolder] }));
        return id;
      },

      deleteFolder: (id, deleteGraphs = false) => {
        set((state) => {
          const folder = state.folders.find((f) => f.id === id);
          if (!folder) return state;
          const newFolders = state.folders.filter((f) => f.id !== id);
          if (!deleteGraphs) return { folders: newFolders };
          const graphIdsToDelete = new Set(folder.graphIds);
          const newGraphs = state.graphs.filter((g) => !graphIdsToDelete.has(g.id));
          return {
            ...withHistory(state),
            graphs: newGraphs,
            folders: newFolders,
            activeGraphId: graphIdsToDelete.has(state.activeGraphId ?? "")
              ? newGraphs[0]?.id ?? null
              : state.activeGraphId,
          };
        });
      },

      renameFolder: (id, name) => {
        set((state) => ({ folders: state.folders.map((f) => (f.id === id ? { ...f, name } : f)) }));
      },

      addGraphToFolder: (graphId, folderId) => {
        set((state) => ({
          folders: state.folders.map((f) => {
            if (f.id === folderId) return { ...f, graphIds: f.graphIds.includes(graphId) ? f.graphIds : [...f.graphIds, graphId] };
            return { ...f, graphIds: f.graphIds.filter((gid) => gid !== graphId) };
          }),
        }));
      },

      removeGraphFromFolder: (graphId) => {
        set((state) => ({
          folders: state.folders.map((f) => ({ ...f, graphIds: f.graphIds.filter((gid) => gid !== graphId) })),
        }));
      },

      toggleFolderCollapsed: (id) => {
        set((state) => ({ folders: state.folders.map((f) => (f.id === id ? { ...f, collapsed: !f.collapsed } : f)) }));
      },

      reorderFolders: (activeId, overId) => {
        set((state) => {
          const list = [...state.folders];
          const from = list.findIndex((f) => f.id === activeId);
          const to = list.findIndex((f) => f.id === overId);
          if (from === -1 || to === -1) return state;
          const [item] = list.splice(from, 1);
          list.splice(to, 0, item);
          return { folders: list };
        });
      },

      reorderGraphsInFolder: (folderId, activeId, overId) => {
        set((state) => ({
          folders: state.folders.map((f) => {
            if (f.id !== folderId) return f;
            const ids = [...f.graphIds];
            const from = ids.indexOf(activeId);
            const to = ids.indexOf(overId);
            if (from === -1 || to === -1) return f;
            const [item] = ids.splice(from, 1);
            ids.splice(to, 0, item);
            return { ...f, graphIds: ids };
          }),
        }));
      },

      reorderStandaloneGraphs: (activeId, overId) => {
        set((state) => {
          const list = [...state.graphs];
          const from = list.findIndex((g) => g.id === activeId);
          const to = list.findIndex((g) => g.id === overId);
          if (from === -1 || to === -1) return state;
          const [item] = list.splice(from, 1);
          list.splice(to, 0, item);
          return { graphs: list };
        });
      },

      moveGraphToFolder: (graphId, folderId, beforeGraphId) => {
        set((state) => ({
          folders: state.folders.map((f) => {
            if (f.id !== folderId) {
              return { ...f, graphIds: f.graphIds.filter((id) => id !== graphId) };
            }
            const ids = f.graphIds.filter((id) => id !== graphId);
            if (beforeGraphId) {
              const idx = ids.indexOf(beforeGraphId);
              if (idx !== -1) ids.splice(idx, 0, graphId);
              else ids.push(graphId);
            } else {
              ids.push(graphId);
            }
            return { ...f, graphIds: ids };
          }),
        }));
      },

      moveGraphToRoot: (graphId) => {
        set((state) => ({
          folders: state.folders.map((f) => ({ ...f, graphIds: f.graphIds.filter((id) => id !== graphId) })),
        }));
      },

      autoLayout: () => {
        const state = get();
        const activeGraph = state.getActiveGraph();
        if (!activeGraph || activeGraph.vertices.length < 2) return;

        const vertices = activeGraph.vertices;
        const n = vertices.length;

        const centroidX = vertices.reduce((s, v) => s + v.x, 0) / n;
        const centroidY = vertices.reduce((s, v) => s + v.y, 0) / n;

        const AREA = 100000;
        const k = Math.sqrt(AREA / n);

        let positions = vertices.map((v) => ({
          id: v.id,
          x: v.x - centroidX,
          y: v.y - centroidY,
          dispX: 0,
          dispY: 0,
        }));

        const maxSpread = Math.max(...positions.map((p) => Math.hypot(p.x, p.y)));
        if (maxSpread < k * 0.1) {
          positions = positions.map((p, i) => ({
            ...p,
            x: Math.cos((2 * Math.PI * i) / n) * k * 0.5,
            y: Math.sin((2 * Math.PI * i) / n) * k * 0.5,
          }));
        }

        let temp = Math.sqrt(AREA) * 0.12;
        const cooling = 0.94;

        for (let iter = 0; iter < 120; iter++) {
          positions.forEach((p) => {
            p.dispX = 0;
            p.dispY = 0;
          });

          for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
              const dx = positions[i].x - positions[j].x;
              const dy = positions[i].y - positions[j].y;
              const dist = Math.max(Math.hypot(dx, dy), 0.01);
              const force = (k * k) / dist;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;
              positions[i].dispX += fx;
              positions[i].dispY += fy;
              positions[j].dispX -= fx;
              positions[j].dispY -= fy;
            }
          }

          for (const edge of activeGraph.edges) {
            if (edge.source === edge.target) continue;
            const u = positions.find((p) => p.id === edge.source);
            const v = positions.find((p) => p.id === edge.target);
            if (!u || !v) continue;
            const dx = v.x - u.x;
            const dy = v.y - u.y;
            const dist = Math.max(Math.hypot(dx, dy), 0.01);
            const force = (dist * dist) / k;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            v.dispX -= fx;
            v.dispY -= fy;
            u.dispX += fx;
            u.dispY += fy;
          }

          for (const p of positions) {
            const dispLen = Math.max(Math.hypot(p.dispX, p.dispY), 0.01);
            const clamped = Math.min(dispLen, temp);
            p.x += (p.dispX / dispLen) * clamped;
            p.y += (p.dispY / dispLen) * clamped;
          }
          temp *= cooling;
        }

        const GRID = 40;
        const targetSpan = Math.max(2, Math.ceil(Math.sqrt(n))) * GRID * 3;

        const minX = Math.min(...positions.map((p) => p.x));
        const maxX = Math.max(...positions.map((p) => p.x));
        const minY = Math.min(...positions.map((p) => p.y));
        const maxY = Math.max(...positions.map((p) => p.y));
        const bbW = Math.max(maxX - minX, 1);
        const bbH = Math.max(maxY - minY, 1);

        const scale = Math.min(targetSpan / bbW, targetSpan / bbH, 1);
        const offsetX = ((minX + maxX) / 2) * scale;
        const offsetY = ((minY + maxY) / 2) * scale;
        for (const p of positions) {
          p.x = p.x * scale - offsetX;
          p.y = p.y * scale - offsetY;
        }

        const occupied = new Map<string, boolean>();
        const key = (x: number, y: number) => `${x},${y}`;

        for (const p of positions) {
          let sx = Math.round(p.x / GRID) * GRID;
          let sy = Math.round(p.y / GRID) * GRID;

          if (occupied.has(key(sx, sy))) {
            let found = false;
            for (let radius = 1; radius <= n && !found; radius++) {
              for (let dx = -radius; dx <= radius && !found; dx++) {
                for (let dy = -radius; dy <= radius && !found; dy++) {
                  if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                  const cx = sx + dx * GRID;
                  const cy = sy + dy * GRID;
                  if (!occupied.has(key(cx, cy))) {
                    sx = cx;
                    sy = cy;
                    found = true;
                  }
                }
              }
            }
          }

          occupied.set(key(sx, sy), true);
          p.x = sx;
          p.y = sy;
        }

        set((state) => ({
          ...withHistory(state),
          graphs: state.graphs.map((g) =>
            g.id === state.activeGraphId
              ? {
                  ...g,
                  vertices: g.vertices.map((v) => {
                    const pos = positions.find((p) => p.id === v.id);
                    if (!pos) return v;
                    return { ...v, x: pos.x + centroidX, y: pos.y + centroidY };
                  }),
                }
              : g,
          ),
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
}));
