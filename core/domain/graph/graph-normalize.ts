import type { Edge, Graph, Vertex } from "@/core/domain/graph/graph.entity";
import { getGraphDefaultColor } from "@/core/domain/graph/graph-color";
import { generateProjectId } from "@/core/domain/project/project.entity";

type RawGraph = Partial<Graph> & { vertices?: unknown; edges?: unknown };

function normalizeVertex(raw: unknown): Vertex {
  const v = (raw ?? {}) as Partial<Vertex>;
  return {
    id: v.id || generateProjectId(),
    label: v.label ?? "",
    x: typeof v.x === "number" ? v.x : 0,
    y: typeof v.y === "number" ? v.y : 0,
    color: v.color,
  };
}

function normalizeEdge(raw: unknown, graphDirected: boolean): Edge {
  const e = (raw ?? {}) as Partial<Edge>;
  return {
    id: e.id || generateProjectId(),
    source: e.source as string,
    target: e.target as string,
    label: e.label,
    weight: e.weight,
    directed: e.directed ?? graphDirected,
  };
}

export function normalizeGraph(raw: RawGraph, graphIndex: number): Graph {
  const directed = raw.directed ?? false;
  return {
    id: raw.id || generateProjectId(),
    name: raw.name || "Grafo importado",
    vertices: Array.isArray(raw.vertices) ? raw.vertices.map(normalizeVertex) : [],
    edges: Array.isArray(raw.edges) ? raw.edges.map((e) => normalizeEdge(e, directed)) : [],
    directed,
    weighted: raw.weighted ?? false,
    opacity: raw.opacity ?? 1,
    visible: raw.visible ?? true,
    offsetX: raw.offsetX ?? 0,
    offsetY: raw.offsetY ?? 0,
    defaultVertexColor: raw.defaultVertexColor || getGraphDefaultColor(graphIndex),
  };
}
