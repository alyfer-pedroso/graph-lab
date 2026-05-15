import type { Graph, Vertex, Edge, AdjacencyMatrix, IncidenceMatrix, PathResult, IsomorphismResult, GraphAnalysis } from "./graph-types";

export function getAdjacencyMatrix(graph: Graph): { matrix: AdjacencyMatrix; labels: string[] } {
  const labels = graph.vertices.map((v) => v.label);
  const n = graph.vertices.length;
  const matrix: AdjacencyMatrix = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  const vertexIndexMap = new Map<string, number>();
  graph.vertices.forEach((v, i) => vertexIndexMap.set(v.id, i));

  graph.edges.forEach((edge) => {
    const sourceIdx = vertexIndexMap.get(edge.source);
    const targetIdx = vertexIndexMap.get(edge.target);
    if (sourceIdx !== undefined && targetIdx !== undefined) {
      const weight = edge.weight ?? 1;
      matrix[sourceIdx][targetIdx] = weight;
      if (!graph.directed) {
        matrix[targetIdx][sourceIdx] = weight;
      }
    }
  });

  return { matrix, labels };
}

export function getIncidenceMatrix(graph: Graph): { matrix: IncidenceMatrix; vertexLabels: string[]; edgeLabels: string[] } {
  const vertexLabels = graph.vertices.map((v) => v.label);
  const edgeLabels = graph.edges.map((e) => e.label || e.id);
  const n = graph.vertices.length;
  const m = graph.edges.length;
  const matrix: IncidenceMatrix = Array(n)
    .fill(null)
    .map(() => Array(m).fill(0));

  const vertexIndexMap = new Map<string, number>();
  graph.vertices.forEach((v, i) => vertexIndexMap.set(v.id, i));

  graph.edges.forEach((edge, edgeIdx) => {
    const sourceIdx = vertexIndexMap.get(edge.source);
    const targetIdx = vertexIndexMap.get(edge.target);
    if (sourceIdx !== undefined && targetIdx !== undefined) {
      if (graph.directed) {
        matrix[sourceIdx][edgeIdx] = -1;
        matrix[targetIdx][edgeIdx] = 1;
      } else {
        matrix[sourceIdx][edgeIdx] = 1;
        matrix[targetIdx][edgeIdx] = 1;
      }
    }
  });

  return { matrix, vertexLabels, edgeLabels };
}

export function calculateDegrees(graph: Graph): { degree: Map<string, number>; inDegree?: Map<string, number>; outDegree?: Map<string, number> } {
  const degree = new Map<string, number>();
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();

  graph.vertices.forEach((v) => {
    degree.set(v.id, 0);
    inDegree.set(v.id, 0);
    outDegree.set(v.id, 0);
  });

  graph.edges.forEach((edge) => {
    if (graph.directed) {
      outDegree.set(edge.source, (outDegree.get(edge.source) || 0) + 1);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    } else {
      degree.set(edge.source, (degree.get(edge.source) || 0) + 1);
      degree.set(edge.target, (degree.get(edge.target) || 0) + 1);
    }
  });

  if (graph.directed) {
    graph.vertices.forEach((v) => {
      degree.set(v.id, (inDegree.get(v.id) || 0) + (outDegree.get(v.id) || 0));
    });
    return { degree, inDegree, outDegree };
  }

  return { degree };
}

export function bfs(graph: Graph, startId: string): string[] {
  const visited = new Set<string>();
  const result: string[] = [];
  const queue: string[] = [startId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    result.push(current);

    const neighbors = getNeighbors(graph, current);
    neighbors.forEach((n) => {
      if (!visited.has(n)) queue.push(n);
    });
  }

  return result;
}

export function dfs(graph: Graph, startId: string): string[] {
  const visited = new Set<string>();
  const result: string[] = [];

  function dfsRecursive(vertexId: string) {
    if (visited.has(vertexId)) return;
    visited.add(vertexId);
    result.push(vertexId);

    const neighbors = getNeighbors(graph, vertexId);
    neighbors.forEach((n) => dfsRecursive(n));
  }

  dfsRecursive(startId);
  return result;
}

export function getNeighbors(graph: Graph, vertexId: string): string[] {
  const neighbors: string[] = [];
  graph.edges.forEach((edge) => {
    if (edge.source === vertexId) {
      neighbors.push(edge.target);
    }
    if (!graph.directed && edge.target === vertexId) {
      neighbors.push(edge.source);
    }
  });
  return neighbors;
}

export function dijkstra(graph: Graph, startId: string, endId: string): PathResult | null {
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>();

  graph.vertices.forEach((v) => {
    distances.set(v.id, Infinity);
    previous.set(v.id, null);
    unvisited.add(v.id);
  });

  distances.set(startId, 0);

  while (unvisited.size > 0) {
    let current: string | null = null;
    let minDistance = Infinity;

    unvisited.forEach((v) => {
      const d = distances.get(v) || Infinity;
      if (d < minDistance) {
        minDistance = d;
        current = v;
      }
    });

    if (current === null || current === endId) break;

    unvisited.delete(current);

    const neighbors = getNeighbors(graph, current);
    neighbors.forEach((neighbor) => {
      if (!unvisited.has(neighbor)) return;

      const edge = graph.edges.find(
        (e) => (e.source === current && e.target === neighbor) || (!graph.directed && e.target === current && e.source === neighbor),
      );
      const weight = edge?.weight ?? 1;
      const alt = (distances.get(current!) || 0) + weight;

      if (alt < (distances.get(neighbor) || Infinity)) {
        distances.set(neighbor, alt);
        previous.set(neighbor, current);
      }
    });
  }

  if (distances.get(endId) === Infinity) return null;

  const path: string[] = [];
  let current: string | null = endId;
  while (current !== null) {
    path.unshift(current);
    current = previous.get(current) || null;
  }

  return { path, distance: distances.get(endId)! };
}

export function isConnected(graph: Graph): boolean {
  if (graph.vertices.length === 0) return true;
  const visited = new Set<string>();
  const queue: string[] = [graph.vertices[0].id];
  visited.add(graph.vertices[0].id);

  while (queue.length > 0) {
    const current = queue.shift()!;
    graph.edges.forEach((edge) => {
      if (edge.source === current && !visited.has(edge.target)) {
        visited.add(edge.target);
        queue.push(edge.target);
      }
      if (edge.target === current && !visited.has(edge.source)) {
        visited.add(edge.source);
        queue.push(edge.source);
      }
    });
  }

  return visited.size === graph.vertices.length;
}

export function hasCycle(graph: Graph): boolean {
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function hasCycleUtil(vertexId: string, parent: string | null): boolean {
    visited.add(vertexId);
    recStack.add(vertexId);

    const neighbors = getNeighbors(graph, vertexId);
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycleUtil(neighbor, vertexId)) return true;
      } else if (graph.directed ? recStack.has(neighbor) : neighbor !== parent) {
        return true;
      }
    }

    recStack.delete(vertexId);
    return false;
  }

  for (const vertex of graph.vertices) {
    if (!visited.has(vertex.id)) {
      if (hasCycleUtil(vertex.id, null)) return true;
    }
  }

  return false;
}

export function isBipartite(graph: Graph): boolean {
  if (graph.vertices.length === 0) return true;

  const color = new Map<string, number>();

  for (const vertex of graph.vertices) {
    if (color.has(vertex.id)) continue;

    const queue: string[] = [vertex.id];
    color.set(vertex.id, 0);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentColor = color.get(current)!;

      const neighbors = getNeighbors(graph, current);
      for (const neighbor of neighbors) {
        if (!color.has(neighbor)) {
          color.set(neighbor, 1 - currentColor);
          queue.push(neighbor);
        } else if (color.get(neighbor) === currentColor) {
          return false;
        }
      }
    }
  }

  return true;
}

export function isComplete(graph: Graph): boolean {
  const n = graph.vertices.length;
  if (n === 0) return true;
  const expectedEdges = graph.directed ? n * (n - 1) : (n * (n - 1)) / 2;

  const nonLoopEdges = graph.edges.filter((e) => e.source !== e.target).length;
  return nonLoopEdges === expectedEdges;
}

export function isTree(graph: Graph): boolean {
  if (graph.vertices.length === 0) return true;
  const nonLoopEdges = graph.edges.filter((e) => e.source !== e.target).length;
  return isConnected(graph) && !hasCycle(graph) && nonLoopEdges === graph.vertices.length - 1;
}

export function analyzeGraph(graph: Graph): GraphAnalysis {
  const degrees = calculateDegrees(graph);
  const loops = graph.edges.filter((e) => e.source === e.target);

  return {
    vertexCount: graph.vertices.length,
    edgeCount: graph.edges.length,
    degree: degrees.degree,
    inDegree: degrees.inDegree,
    outDegree: degrees.outDegree,
    isConnected: isConnected(graph),
    isBipartite: isBipartite(graph),
    hasLoops: loops.length > 0,
    loopCount: loops.length,
    hasCycle: hasCycle(graph),
    isTree: isTree(graph),
    isComplete: isComplete(graph),
  };
}

export function isForest(graph: Graph): boolean {
  if (graph.vertices.length === 0) return true;
  return !hasCycle(graph);
}

export function countConnectedComponents(graph: Graph): number {
  const visited = new Set<string>();
  let count = 0;
  for (const v of graph.vertices) {
    if (visited.has(v.id)) continue;
    count++;
    const queue: string[] = [v.id];
    visited.add(v.id);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const neighbors = getNeighbors(graph, cur);
      for (const n of neighbors) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      }
    }
  }
  return count;
}

function buildAdjList(graph: Graph): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const v of graph.vertices) adj.set(v.id, new Set());
  for (const e of graph.edges) {
    adj.get(e.source)!.add(e.target);
    if (!graph.directed) adj.get(e.target)!.add(e.source);
  }
  return adj;
}

function getDegreeSignature(graph: Graph): number[] {
  const degrees = calculateDegrees(graph);
  return Array.from(degrees.degree.values()).sort((a, b) => a - b);
}

export function checkIsomorphism(g1: Graph, g2: Graph): IsomorphismResult {
  const n1 = g1.vertices.length;
  const n2 = g2.vertices.length;
  const e1 = g1.edges.length;
  const e2 = g2.edges.length;

  if (n1 !== n2) {
    return { isIsomorphic: false, reason: `Quantidade de vértices diferente (${n1} vs ${n2})` };
  }
  if (e1 !== e2) {
    return { isIsomorphic: false, reason: `Quantidade de arestas diferente (${e1} vs ${e2})` };
  }
  if (g1.directed !== g2.directed) {
    return { isIsomorphic: false, reason: "Tipos diferentes (direcionado/não-direcionado)" };
  }

  if (n1 === 0) {
    return { isIsomorphic: true, reason: "Ambos os grafos são vazios" };
  }

  const deg1 = getDegreeSignature(g1);
  const deg2 = getDegreeSignature(g2);

  if (JSON.stringify(deg1) !== JSON.stringify(deg2)) {
    return { isIsomorphic: false, reason: `Sequência de graus diferente: [${deg1.join(",")}] vs [${deg2.join(",")}]` };
  }

  const conn1 = isConnected(g1);
  const conn2 = isConnected(g2);
  if (conn1 !== conn2) {
    return { isIsomorphic: false, reason: "Um grafo é conexo e o outro não" };
  }

  const loops1 = g1.edges.filter((e) => e.source === e.target).length;
  const loops2 = g2.edges.filter((e) => e.source === e.target).length;
  if (loops1 !== loops2) {
    return { isIsomorphic: false, reason: `Quantidade de laços diferente (${loops1} vs ${loops2})` };
  }

  if (n1 <= 10) {
    const mapping = findIsomorphismMappingBacktrack(g1, g2);
    if (mapping) {
      return { isIsomorphic: true, mapping };
    }
    return { isIsomorphic: false, reason: "Nenhum mapeamento isomorfo válido encontrado (verificação exata)" };
  }

  const bip1 = isBipartite(g1);
  const bip2 = isBipartite(g2);
  if (bip1 !== bip2) {
    return { isIsomorphic: false, reason: "Um grafo é bipartido e o outro não" };
  }

  return { isIsomorphic: true, reason: "Propriedades compatíveis (verificação heurística para grafos grandes)" };
}

function findIsomorphismMappingBacktrack(g1: Graph, g2: Graph): Map<string, string> | null {
  const adj1 = buildAdjList(g1);
  const adj2 = buildAdjList(g2);
  const deg1 = calculateDegrees(g1).degree;
  const deg2 = calculateDegrees(g2).degree;

  const byDeg2 = new Map<number, string[]>();
  for (const v of g2.vertices) {
    const d = deg2.get(v.id) || 0;
    if (!byDeg2.has(d)) byDeg2.set(d, []);
    byDeg2.get(d)!.push(v.id);
  }

  const mapping = new Map<string, string>();
  const usedG2 = new Set<string>();
  const vertices1 = g1.vertices.map((v) => v.id);

  function isCompatible(v1: string, v2: string): boolean {
    if ((deg1.get(v1) || 0) !== (deg2.get(v2) || 0)) return false;

    const neighbors1 = adj1.get(v1) || new Set();
    const neighbors2 = adj2.get(v2) || new Set();

    for (const [mapped1, mapped2] of mapping) {
      const n1HasEdge = neighbors1.has(mapped1);
      const n2HasEdge = neighbors2.has(mapped2);
      if (n1HasEdge !== n2HasEdge) return false;
    }
    return true;
  }

  function backtrack(idx: number): boolean {
    if (idx === vertices1.length) return true;

    const v1 = vertices1[idx];
    const d1 = deg1.get(v1) || 0;
    const candidates = byDeg2.get(d1) || [];

    for (const v2 of candidates) {
      if (usedG2.has(v2)) continue;
      if (!isCompatible(v1, v2)) continue;

      mapping.set(v1, v2);
      usedG2.add(v2);

      if (backtrack(idx + 1)) return true;

      mapping.delete(v1);
      usedG2.delete(v2);
    }

    return false;
  }

  if (backtrack(0)) return new Map(mapping);
  return null;
}

export function calculateChromaticNumber(graph: Graph): { chromaticNumber: number; colorMap: Map<string, number> } | null {
  const n = graph.vertices.length;
  if (n === 0) return { chromaticNumber: 0, colorMap: new Map() };

  const hasLoop = graph.edges.some((e) => e.source === e.target);
  if (hasLoop) return null;

  const adj = buildAdjList(graph);

  const degrees = calculateDegrees(graph).degree;
  const ordered = [...graph.vertices].sort((a, b) => (degrees.get(b.id) ?? 0) - (degrees.get(a.id) ?? 0)).map((v) => v.id);

  function tryColoring(idx: number, k: number, colorMap: Map<string, number>): boolean {
    if (idx === ordered.length) return true;
    const v = ordered[idx];
    const neighbors = adj.get(v) || new Set<string>();
    const used = new Set<number>();
    for (const nb of neighbors) {
      const c = colorMap.get(nb);
      if (c !== undefined) used.add(c);
    }
    for (let c = 0; c < k; c++) {
      if (used.has(c)) continue;
      colorMap.set(v, c);
      if (tryColoring(idx + 1, k, colorMap)) return true;
      colorMap.delete(v);
    }
    return false;
  }

  let lower = 1;
  if (graph.edges.length === 0) {
    const colorMap = new Map<string, number>();
    graph.vertices.forEach((v) => colorMap.set(v.id, 0));
    return { chromaticNumber: 1, colorMap };
  }
  if (!isBipartite(graph)) lower = 3;
  else lower = 2;

  for (let k = lower; k <= n; k++) {
    const colorMap = new Map<string, number>();
    if (tryColoring(0, k, colorMap)) {
      return { chromaticNumber: k, colorMap };
    }
  }
  return { chromaticNumber: n, colorMap: new Map() };
}

export const CHROMATIC_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#06b6d4",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#84cc16",
  "#6366f1",
  "#eab308",
];

export function findSpanningTree(graph: Graph, rootId: string): { edges: string[]; visited: string[]; isComplete: boolean } | null {
  if (!graph.vertices.find((v) => v.id === rootId)) return null;
  if (graph.vertices.length === 0) return { edges: [], visited: [], isComplete: true };

  const visited = new Set<string>();
  const treeEdges: string[] = [];
  const queue: string[] = [rootId];
  visited.add(rootId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of graph.edges) {
      if (edge.source === edge.target) continue;
      let neighbor: string | null = null;
      if (edge.source === current && !visited.has(edge.target)) neighbor = edge.target;
      else if (!graph.directed && edge.target === current && !visited.has(edge.source)) neighbor = edge.source;

      if (neighbor) {
        visited.add(neighbor);
        treeEdges.push(edge.id);
        queue.push(neighbor);
      }
    }
  }

  const isComplete = visited.size === graph.vertices.length;
  return { edges: treeEdges, visited: Array.from(visited), isComplete };
}

export function findMinimumSpanningTree(graph: Graph): { edges: string[]; totalWeight: number; isComplete: boolean } | null {
  if (graph.vertices.length === 0) return { edges: [], totalWeight: 0, isComplete: true };
  if (graph.directed) return null;

  const sortedEdges = [...graph.edges].filter((e) => e.source !== e.target).sort((a, b) => (a.weight ?? 1) - (b.weight ?? 1));

  const parent = new Map<string, string>();
  graph.vertices.forEach((v) => parent.set(v.id, v.id));

  function find(x: string): string {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let cur = x;
    while (parent.get(cur) !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  function union(x: string, y: string): boolean {
    const rx = find(x);
    const ry = find(y);
    if (rx === ry) return false;
    parent.set(rx, ry);
    return true;
  }

  const mstEdges: string[] = [];
  let totalWeight = 0;

  for (const e of sortedEdges) {
    if (union(e.source, e.target)) {
      mstEdges.push(e.id);
      totalWeight += e.weight ?? 1;
      if (mstEdges.length === graph.vertices.length - 1) break;
    }
  }

  const isComplete = mstEdges.length === graph.vertices.length - 1;
  return { edges: mstEdges, totalWeight, isComplete };
}

export interface TreeAnalysis {
  isTree: boolean;
  vertexCount: number;
  edgeCount: number;
  leafCount: number;
  internalCount: number;
  leaves: string[];
  diameter: number;
  diameterPath: string[];
  center: string[];
  vertexEdgeRelation: string;
}

export function analyzeTree(graph: Graph): TreeAnalysis {
  const tree = isTree(graph);
  const degrees = calculateDegrees(graph).degree;
  const leaves: string[] = [];
  const internals: string[] = [];

  graph.vertices.forEach((v) => {
    const d = degrees.get(v.id) ?? 0;
    if (d <= 1) leaves.push(v.id);
    else internals.push(v.id);
  });

  let diameter = 0;
  let diameterPath: string[] = [];
  let center: string[] = [];

  if (tree && graph.vertices.length > 0) {
    function bfsFarthest(startId: string): { farthest: string; dist: number; parent: Map<string, string | null> } {
      const dist = new Map<string, number>();
      const parent = new Map<string, string | null>();
      const queue: string[] = [startId];
      dist.set(startId, 0);
      parent.set(startId, null);
      let farthest = startId;
      let maxDist = 0;
      while (queue.length > 0) {
        const cur = queue.shift()!;
        const cd = dist.get(cur)!;
        if (cd > maxDist) {
          maxDist = cd;
          farthest = cur;
        }
        const neighbors = getNeighbors(graph, cur);
        for (const n of neighbors) {
          if (!dist.has(n)) {
            dist.set(n, cd + 1);
            parent.set(n, cur);
            queue.push(n);
          }
        }
      }
      return { farthest, dist: maxDist, parent };
    }

    const first = bfsFarthest(graph.vertices[0].id);
    const second = bfsFarthest(first.farthest);
    diameter = second.dist;

    let cur: string | null = second.farthest;
    while (cur !== null) {
      diameterPath.unshift(cur);
      cur = second.parent.get(cur) ?? null;
    }

    const mid = Math.floor(diameterPath.length / 2);
    if (diameterPath.length % 2 === 1) {
      center = [diameterPath[mid]];
    } else if (diameterPath.length > 0) {
      center = [diameterPath[mid - 1], diameterPath[mid]];
    }
  }

  const n = graph.vertices.length;
  const m = graph.edges.filter((e) => e.source !== e.target).length;
  let relation: string;
  if (n === 0) relation = "Grafo vazio";
  else if (tree) relation = `m = n - 1 (${m} = ${n} - 1) ✓`;
  else if (m < n - 1) relation = `m < n - 1 (${m} < ${n - 1}) — desconexo`;
  else if (m === n - 1) relation = `m = n - 1 (${m} = ${n} - 1) — desconexo com ciclo`;
  else relation = `m > n - 1 (${m} > ${n - 1}) — contém ciclos`;

  return {
    isTree: tree,
    vertexCount: n,
    edgeCount: m,
    leafCount: leaves.length,
    internalCount: internals.length,
    leaves,
    diameter,
    diameterPath,
    center,
    vertexEdgeRelation: relation,
  };
}

export function generateVertexLabel(existingLabels: string[]): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let i = 0; i < 26; i++) {
    if (!existingLabels.includes(letters[i])) {
      return letters[i];
    }
  }
  let num = 1;
  while (existingLabels.includes(`V${num}`)) {
    num++;
  }
  return `V${num}`;
}

export function generateEdgeLabel(existingLabels: string[]): string {
  let num = 1;
  while (existingLabels.includes(`e${num}`)) {
    num++;
  }
  return `e${num}`;
}
