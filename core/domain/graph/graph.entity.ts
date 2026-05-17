export interface Vertex {
  id: string;
  label: string;
  x: number;
  y: number;
  color?: string;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  label?: string;
  weight?: number;
  directed: boolean;
}

export interface Graph {
  id: string;
  name: string;
  vertices: Vertex[];
  edges: Edge[];
  directed: boolean;
  weighted: boolean;

  opacity: number;
  visible: boolean;
  offsetX: number;
  offsetY: number;

  defaultVertexColor?: string;

  chromaticNumber?: number;
  chromaticColors?: string[];
}

export type Tool = "select" | "vertex" | "edge" | "delete" | "pan";

export interface GraphFolder {
  id: string;
  name: string;
  graphIds: string[];
  collapsed: boolean;
}

export interface HistorySnapshot {
  graphs: Graph[];
  activeGraphId: string | null;
}

export interface GraphState {
  graphs: Graph[];
  folders: GraphFolder[];
  activeGraphId: string | null;
  selectedVertexIds: string[];
  selectedEdgeIds: string[];
  tool: Tool;
  isCreatingEdge: boolean;
  edgeSourceId: string | null;
  compareMode: boolean;
  compareGraphId: string | null;
  gridSnap: boolean;
  past: HistorySnapshot[];
  future: HistorySnapshot[];
}

export const GRID_SIZE = 40;
export const HISTORY_LIMIT = 50;

export type AdjacencyMatrix = number[][];
export type IncidenceMatrix = number[][];

export interface PathResult {
  path: string[];
  distance: number;
}

export interface IsomorphismResult {
  isIsomorphic: boolean;
  mapping?: Map<string, string>;
  reason?: string;
}

export interface GraphAnalysis {
  vertexCount: number;
  edgeCount: number;
  degree: Map<string, number>;
  inDegree?: Map<string, number>;
  outDegree?: Map<string, number>;
  isConnected: boolean;
  isBipartite: boolean;
  hasLoops?: boolean;
  loopCount?: number;
  hasCycle: boolean;
  isTree: boolean;
  isComplete: boolean;
  chromaticNumber?: number;
}
