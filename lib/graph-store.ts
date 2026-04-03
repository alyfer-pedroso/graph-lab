import { create } from 'zustand'
import type { Graph, Vertex, Edge, Tool, GraphState } from './graph-types'
import { generateVertexLabel, generateEdgeLabel } from './graph-algorithms'

function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

function createDefaultGraph(): Graph {
  return {
    id: generateId(),
    name: 'Grafo 1',
    vertices: [],
    edges: [],
    directed: false,
    weighted: false,
  }
}

interface GraphStore extends GraphState {
  // Graph management
  createGraph: (name?: string, directed?: boolean, weighted?: boolean) => string
  deleteGraph: (id: string) => void
  setActiveGraph: (id: string | null) => void
  updateGraph: (id: string, updates: Partial<Graph>) => void
  duplicateGraph: (id: string) => string
  clearGraph: (id: string) => void

  // Vertex management
  addVertex: (x: number, y: number, label?: string) => string | null
  updateVertex: (id: string, updates: Partial<Vertex>) => void
  deleteVertex: (id: string) => void
  moveVertex: (id: string, x: number, y: number) => void

  // Edge management
  addEdge: (source: string, target: string, label?: string, weight?: number) => string | null
  updateEdge: (id: string, updates: Partial<Edge>) => void
  deleteEdge: (id: string) => void

  // Selection
  selectVertex: (id: string, addToSelection?: boolean) => void
  selectEdge: (id: string, addToSelection?: boolean) => void
  clearSelection: () => void

  // Tool
  setTool: (tool: Tool) => void

  // Edge creation
  startEdgeCreation: (sourceId: string) => void
  cancelEdgeCreation: () => void

  // Compare mode
  setCompareMode: (enabled: boolean) => void
  setCompareGraph: (id: string | null) => void

  // Auto-labeling
  autoLabelVertices: () => void
  autoLabelEdges: () => void

  // Utilities
  getActiveGraph: () => Graph | null
  getCompareGraph: () => Graph | null
}

export const useGraphStore = create<GraphStore>((set, get) => {
  const initialGraph = createDefaultGraph()

  return {
    graphs: [initialGraph],
    activeGraphId: initialGraph.id,
    selectedVertexIds: [],
    selectedEdgeIds: [],
    tool: 'select',
    isCreatingEdge: false,
    edgeSourceId: null,
    compareMode: false,
    compareGraphId: null,

    // Graph management
    createGraph: (name, directed = false, weighted = false) => {
      const id = generateId()
      const graphCount = get().graphs.length + 1
      const newGraph: Graph = {
        id,
        name: name || `Grafo ${graphCount}`,
        vertices: [],
        edges: [],
        directed,
        weighted,
      }
      set((state) => ({
        graphs: [...state.graphs, newGraph],
        activeGraphId: id,
      }))
      return id
    },

    deleteGraph: (id) => {
      set((state) => {
        const newGraphs = state.graphs.filter((g) => g.id !== id)
        if (newGraphs.length === 0) {
          const defaultGraph = createDefaultGraph()
          return {
            graphs: [defaultGraph],
            activeGraphId: defaultGraph.id,
            compareGraphId: null,
          }
        }
        return {
          graphs: newGraphs,
          activeGraphId: state.activeGraphId === id ? newGraphs[0].id : state.activeGraphId,
          compareGraphId: state.compareGraphId === id ? null : state.compareGraphId,
        }
      })
    },

    setActiveGraph: (id) => {
      set({ activeGraphId: id, selectedVertexIds: [], selectedEdgeIds: [] })
    },

    updateGraph: (id, updates) => {
      set((state) => ({
        graphs: state.graphs.map((g) => (g.id === id ? { ...g, ...updates } : g)),
      }))
    },

    duplicateGraph: (id) => {
      const graph = get().graphs.find((g) => g.id === id)
      if (!graph) return ''

      const newId = generateId()
      const newGraph: Graph = {
        ...graph,
        id: newId,
        name: `${graph.name} (cópia)`,
        vertices: graph.vertices.map((v) => ({ ...v })),
        edges: graph.edges.map((e) => ({ ...e })),
      }

      set((state) => ({
        graphs: [...state.graphs, newGraph],
        activeGraphId: newId,
      }))
      return newId
    },

    clearGraph: (id) => {
      set((state) => ({
        graphs: state.graphs.map((g) =>
          g.id === id ? { ...g, vertices: [], edges: [] } : g
        ),
        selectedVertexIds: [],
        selectedEdgeIds: [],
      }))
    },

    // Vertex management
    addVertex: (x, y, label) => {
      const activeGraph = get().getActiveGraph()
      if (!activeGraph) return null

      const existingLabels = activeGraph.vertices.map((v) => v.label)
      const newVertex: Vertex = {
        id: generateId(),
        label: label || generateVertexLabel(existingLabels),
        x,
        y,
      }

      set((state) => ({
        graphs: state.graphs.map((g) =>
          g.id === state.activeGraphId
            ? { ...g, vertices: [...g.vertices, newVertex] }
            : g
        ),
      }))
      return newVertex.id
    },

    updateVertex: (id, updates) => {
      set((state) => ({
        graphs: state.graphs.map((g) =>
          g.id === state.activeGraphId
            ? {
                ...g,
                vertices: g.vertices.map((v) => (v.id === id ? { ...v, ...updates } : v)),
              }
            : g
        ),
      }))
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
            : g
        ),
        selectedVertexIds: state.selectedVertexIds.filter((v) => v !== id),
      }))
    },

    moveVertex: (id, x, y) => {
      set((state) => ({
        graphs: state.graphs.map((g) =>
          g.id === state.activeGraphId
            ? {
                ...g,
                vertices: g.vertices.map((v) => (v.id === id ? { ...v, x, y } : v)),
              }
            : g
        ),
      }))
    },

    // Edge management
    addEdge: (source, target, label, weight) => {
      const activeGraph = get().getActiveGraph()
      if (!activeGraph) return null

      const isLoop = source === target

      // Check if edge already exists (for loops, check if a loop already exists on this vertex)
      const edgeExists = activeGraph.edges.some(
        (e) =>
          (e.source === source && e.target === target) ||
          (!activeGraph.directed && !isLoop && e.source === target && e.target === source)
      )
      if (edgeExists) return null

      const existingLabels = activeGraph.edges.map((e) => e.label || '')
      const newEdge: Edge = {
        id: generateId(),
        source,
        target,
        label: label || generateEdgeLabel(existingLabels),
        weight: activeGraph.weighted ? (weight ?? 1) : undefined,
        directed: activeGraph.directed,
      }

      set((state) => ({
        graphs: state.graphs.map((g) =>
          g.id === state.activeGraphId
            ? { ...g, edges: [...g.edges, newEdge] }
            : g
        ),
        isCreatingEdge: false,
        edgeSourceId: null,
      }))
      return newEdge.id
    },

    updateEdge: (id, updates) => {
      set((state) => ({
        graphs: state.graphs.map((g) =>
          g.id === state.activeGraphId
            ? {
                ...g,
                edges: g.edges.map((e) => (e.id === id ? { ...e, ...updates } : e)),
              }
            : g
        ),
      }))
    },

    deleteEdge: (id) => {
      set((state) => ({
        graphs: state.graphs.map((g) =>
          g.id === state.activeGraphId
            ? { ...g, edges: g.edges.filter((e) => e.id !== id) }
            : g
        ),
        selectedEdgeIds: state.selectedEdgeIds.filter((e) => e !== id),
      }))
    },

    // Selection
    selectVertex: (id, addToSelection = false) => {
      set((state) => ({
        selectedVertexIds: addToSelection
          ? state.selectedVertexIds.includes(id)
            ? state.selectedVertexIds.filter((v) => v !== id)
            : [...state.selectedVertexIds, id]
          : [id],
        selectedEdgeIds: addToSelection ? state.selectedEdgeIds : [],
      }))
    },

    selectEdge: (id, addToSelection = false) => {
      set((state) => ({
        selectedEdgeIds: addToSelection
          ? state.selectedEdgeIds.includes(id)
            ? state.selectedEdgeIds.filter((e) => e !== id)
            : [...state.selectedEdgeIds, id]
          : [id],
        selectedVertexIds: addToSelection ? state.selectedVertexIds : [],
      }))
    },

    clearSelection: () => {
      set({ selectedVertexIds: [], selectedEdgeIds: [] })
    },

    // Tool
    setTool: (tool) => {
      set({ tool, isCreatingEdge: false, edgeSourceId: null })
    },

    // Edge creation
    startEdgeCreation: (sourceId) => {
      set({ isCreatingEdge: true, edgeSourceId: sourceId })
    },

    cancelEdgeCreation: () => {
      set({ isCreatingEdge: false, edgeSourceId: null })
    },

    // Compare mode
    setCompareMode: (enabled) => {
      set({ compareMode: enabled, compareGraphId: enabled ? null : null })
    },

    setCompareGraph: (id) => {
      set({ compareGraphId: id })
    },

    // Auto-labeling
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
            : g
        ),
      }))
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
            : g
        ),
      }))
    },

    // Utilities
    getActiveGraph: () => {
      const state = get()
      return state.graphs.find((g) => g.id === state.activeGraphId) || null
    },

    getCompareGraph: () => {
      const state = get()
      return state.graphs.find((g) => g.id === state.compareGraphId) || null
    },
  }
})
