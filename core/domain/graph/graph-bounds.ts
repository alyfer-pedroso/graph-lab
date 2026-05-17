import type { Graph } from "./graph.entity";

export const VERTEX_RADIUS = 24;

export interface GraphBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function computeGraphsBounds(graphs: Graph[], padding: number = VERTEX_RADIUS): GraphBounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasVertex = false;

  for (const graph of graphs) {
    if (graph.visible === false || graph.vertices.length === 0) continue;

    for (const vertex of graph.vertices) {
      const worldX = graph.offsetX + vertex.x;
      const worldY = graph.offsetY + vertex.y;

      if (worldX < minX) minX = worldX;
      if (worldY < minY) minY = worldY;
      if (worldX > maxX) maxX = worldX;
      if (worldY > maxY) maxY = worldY;
      hasVertex = true;
    }
  }

  if (!hasVertex) return null;

  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
  };
}
