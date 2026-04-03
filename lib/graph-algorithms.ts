import type {
  Graph,
  Vertex,
  Edge,
  AdjacencyMatrix,
  IncidenceMatrix,
  PathResult,
  IsomorphismResult,
  GraphAnalysis,
} from './graph-types'

// Generate adjacency matrix
export function getAdjacencyMatrix(graph: Graph): { matrix: AdjacencyMatrix; labels: string[] } {
  const labels = graph.vertices.map((v) => v.label)
  const n = graph.vertices.length
  const matrix: AdjacencyMatrix = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0))

  const vertexIndexMap = new Map<string, number>()
  graph.vertices.forEach((v, i) => vertexIndexMap.set(v.id, i))

  graph.edges.forEach((edge) => {
    const sourceIdx = vertexIndexMap.get(edge.source)
    const targetIdx = vertexIndexMap.get(edge.target)
    if (sourceIdx !== undefined && targetIdx !== undefined) {
      const weight = edge.weight ?? 1
      matrix[sourceIdx][targetIdx] = weight
      if (!graph.directed) {
        matrix[targetIdx][sourceIdx] = weight
      }
    }
  })

  return { matrix, labels }
}

// Generate incidence matrix
export function getIncidenceMatrix(graph: Graph): { matrix: IncidenceMatrix; vertexLabels: string[]; edgeLabels: string[] } {
  const vertexLabels = graph.vertices.map((v) => v.label)
  const edgeLabels = graph.edges.map((e) => e.label || e.id)
  const n = graph.vertices.length
  const m = graph.edges.length
  const matrix: IncidenceMatrix = Array(n)
    .fill(null)
    .map(() => Array(m).fill(0))

  const vertexIndexMap = new Map<string, number>()
  graph.vertices.forEach((v, i) => vertexIndexMap.set(v.id, i))

  graph.edges.forEach((edge, edgeIdx) => {
    const sourceIdx = vertexIndexMap.get(edge.source)
    const targetIdx = vertexIndexMap.get(edge.target)
    if (sourceIdx !== undefined && targetIdx !== undefined) {
      if (graph.directed) {
        matrix[sourceIdx][edgeIdx] = -1 // outgoing
        matrix[targetIdx][edgeIdx] = 1 // incoming
      } else {
        matrix[sourceIdx][edgeIdx] = 1
        matrix[targetIdx][edgeIdx] = 1
      }
    }
  })

  return { matrix, vertexLabels, edgeLabels }
}

// Calculate vertex degrees
export function calculateDegrees(graph: Graph): { degree: Map<string, number>; inDegree?: Map<string, number>; outDegree?: Map<string, number> } {
  const degree = new Map<string, number>()
  const inDegree = new Map<string, number>()
  const outDegree = new Map<string, number>()

  graph.vertices.forEach((v) => {
    degree.set(v.id, 0)
    inDegree.set(v.id, 0)
    outDegree.set(v.id, 0)
  })

  graph.edges.forEach((edge) => {
    if (graph.directed) {
      outDegree.set(edge.source, (outDegree.get(edge.source) || 0) + 1)
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
    } else {
      degree.set(edge.source, (degree.get(edge.source) || 0) + 1)
      degree.set(edge.target, (degree.get(edge.target) || 0) + 1)
    }
  })

  if (graph.directed) {
    graph.vertices.forEach((v) => {
      degree.set(v.id, (inDegree.get(v.id) || 0) + (outDegree.get(v.id) || 0))
    })
    return { degree, inDegree, outDegree }
  }

  return { degree }
}

// BFS - Breadth First Search
export function bfs(graph: Graph, startId: string): string[] {
  const visited = new Set<string>()
  const result: string[] = []
  const queue: string[] = [startId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)
    result.push(current)

    const neighbors = getNeighbors(graph, current)
    neighbors.forEach((n) => {
      if (!visited.has(n)) queue.push(n)
    })
  }

  return result
}

// DFS - Depth First Search
export function dfs(graph: Graph, startId: string): string[] {
  const visited = new Set<string>()
  const result: string[] = []

  function dfsRecursive(vertexId: string) {
    if (visited.has(vertexId)) return
    visited.add(vertexId)
    result.push(vertexId)

    const neighbors = getNeighbors(graph, vertexId)
    neighbors.forEach((n) => dfsRecursive(n))
  }

  dfsRecursive(startId)
  return result
}

// Get neighbors of a vertex
export function getNeighbors(graph: Graph, vertexId: string): string[] {
  const neighbors: string[] = []
  graph.edges.forEach((edge) => {
    if (edge.source === vertexId) {
      neighbors.push(edge.target)
    }
    if (!graph.directed && edge.target === vertexId) {
      neighbors.push(edge.source)
    }
  })
  return neighbors
}

// Dijkstra's algorithm for shortest path
export function dijkstra(graph: Graph, startId: string, endId: string): PathResult | null {
  const distances = new Map<string, number>()
  const previous = new Map<string, string | null>()
  const unvisited = new Set<string>()

  graph.vertices.forEach((v) => {
    distances.set(v.id, Infinity)
    previous.set(v.id, null)
    unvisited.add(v.id)
  })

  distances.set(startId, 0)

  while (unvisited.size > 0) {
    let current: string | null = null
    let minDistance = Infinity

    unvisited.forEach((v) => {
      const d = distances.get(v) || Infinity
      if (d < minDistance) {
        minDistance = d
        current = v
      }
    })

    if (current === null || current === endId) break

    unvisited.delete(current)

    const neighbors = getNeighbors(graph, current)
    neighbors.forEach((neighbor) => {
      if (!unvisited.has(neighbor)) return

      const edge = graph.edges.find(
        (e) =>
          (e.source === current && e.target === neighbor) ||
          (!graph.directed && e.target === current && e.source === neighbor)
      )
      const weight = edge?.weight ?? 1
      const alt = (distances.get(current!) || 0) + weight

      if (alt < (distances.get(neighbor) || Infinity)) {
        distances.set(neighbor, alt)
        previous.set(neighbor, current)
      }
    })
  }

  if (distances.get(endId) === Infinity) return null

  const path: string[] = []
  let current: string | null = endId
  while (current !== null) {
    path.unshift(current)
    current = previous.get(current) || null
  }

  return { path, distance: distances.get(endId)! }
}

// Check if graph is connected
export function isConnected(graph: Graph): boolean {
  if (graph.vertices.length === 0) return true
  const visited = bfs(graph, graph.vertices[0].id)
  return visited.length === graph.vertices.length
}

// Check if graph has a cycle
export function hasCycle(graph: Graph): boolean {
  const visited = new Set<string>()
  const recStack = new Set<string>()

  function hasCycleUtil(vertexId: string, parent: string | null): boolean {
    visited.add(vertexId)
    recStack.add(vertexId)

    const neighbors = getNeighbors(graph, vertexId)
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycleUtil(neighbor, vertexId)) return true
      } else if (graph.directed ? recStack.has(neighbor) : neighbor !== parent) {
        return true
      }
    }

    recStack.delete(vertexId)
    return false
  }

  for (const vertex of graph.vertices) {
    if (!visited.has(vertex.id)) {
      if (hasCycleUtil(vertex.id, null)) return true
    }
  }

  return false
}

// Check if graph is bipartite
export function isBipartite(graph: Graph): boolean {
  if (graph.vertices.length === 0) return true

  const color = new Map<string, number>()

  for (const vertex of graph.vertices) {
    if (color.has(vertex.id)) continue

    const queue: string[] = [vertex.id]
    color.set(vertex.id, 0)

    while (queue.length > 0) {
      const current = queue.shift()!
      const currentColor = color.get(current)!

      const neighbors = getNeighbors(graph, current)
      for (const neighbor of neighbors) {
        if (!color.has(neighbor)) {
          color.set(neighbor, 1 - currentColor)
          queue.push(neighbor)
        } else if (color.get(neighbor) === currentColor) {
          return false
        }
      }
    }
  }

  return true
}

// Check if graph is complete
export function isComplete(graph: Graph): boolean {
  const n = graph.vertices.length
  const expectedEdges = graph.directed ? n * (n - 1) : (n * (n - 1)) / 2
  return graph.edges.length === expectedEdges
}

// Check if graph is a tree
export function isTree(graph: Graph): boolean {
  return isConnected(graph) && !hasCycle(graph) && graph.edges.length === graph.vertices.length - 1
}

// Analyze graph properties
export function analyzeGraph(graph: Graph): GraphAnalysis {
  const degrees = calculateDegrees(graph)

  return {
    vertexCount: graph.vertices.length,
    edgeCount: graph.edges.length,
    degree: degrees.degree,
    inDegree: degrees.inDegree,
    outDegree: degrees.outDegree,
    isConnected: isConnected(graph),
    isBipartite: isBipartite(graph),
    hasCycle: hasCycle(graph),
    isTree: isTree(graph),
    isComplete: isComplete(graph),
  }
}

// Check isomorphism between two graphs
export function checkIsomorphism(g1: Graph, g2: Graph): IsomorphismResult {
  // Quick checks
  if (g1.vertices.length !== g2.vertices.length) {
    return { isIsomorphic: false, reason: 'Quantidade de vértices diferente' }
  }
  if (g1.edges.length !== g2.edges.length) {
    return { isIsomorphic: false, reason: 'Quantidade de arestas diferente' }
  }
  if (g1.directed !== g2.directed) {
    return { isIsomorphic: false, reason: 'Tipos diferentes (direcionado/não-direcionado)' }
  }

  // Compare degree sequences
  const degrees1 = Array.from(calculateDegrees(g1).degree.values()).sort((a, b) => a - b)
  const degrees2 = Array.from(calculateDegrees(g2).degree.values()).sort((a, b) => a - b)

  if (JSON.stringify(degrees1) !== JSON.stringify(degrees2)) {
    return { isIsomorphic: false, reason: 'Sequência de graus diferente' }
  }

  // For small graphs, try to find a mapping
  if (g1.vertices.length <= 8) {
    const mapping = findIsomorphismMapping(g1, g2)
    if (mapping) {
      return { isIsomorphic: true, mapping }
    }
    return { isIsomorphic: false, reason: 'Nenhum mapeamento válido encontrado' }
  }

  // For larger graphs, we use heuristics
  return { isIsomorphic: true, reason: 'Propriedades compatíveis (verificação heurística)' }
}

function findIsomorphismMapping(g1: Graph, g2: Graph): Map<string, string> | null {
  const vertices1 = g1.vertices.map((v) => v.id)
  const vertices2 = g2.vertices.map((v) => v.id)

  function isValidMapping(mapping: Map<string, string>): boolean {
    for (const edge of g1.edges) {
      const mappedSource = mapping.get(edge.source)
      const mappedTarget = mapping.get(edge.target)
      if (!mappedSource || !mappedTarget) return false

      const hasEdge = g2.edges.some(
        (e) =>
          (e.source === mappedSource && e.target === mappedTarget) ||
          (!g2.directed && e.source === mappedTarget && e.target === mappedSource)
      )
      if (!hasEdge) return false
    }
    return true
  }

  function permute(arr: string[], start: number, mapping: Map<string, string>): Map<string, string> | null {
    if (start === arr.length) {
      if (isValidMapping(mapping)) return new Map(mapping)
      return null
    }

    for (let i = start; i < arr.length; i++) {
      ;[arr[start], arr[i]] = [arr[i], arr[start]]
      mapping.set(vertices1[start], arr[start])
      const result = permute(arr, start + 1, mapping)
      if (result) return result
      ;[arr[start], arr[i]] = [arr[i], arr[start]]
    }
    return null
  }

  return permute([...vertices2], 0, new Map())
}

// Generate label for vertex
export function generateVertexLabel(existingLabels: string[]): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (let i = 0; i < 26; i++) {
    if (!existingLabels.includes(letters[i])) {
      return letters[i]
    }
  }
  // If all letters are used, use numbers
  let num = 1
  while (existingLabels.includes(`V${num}`)) {
    num++
  }
  return `V${num}`
}

// Generate edge label
export function generateEdgeLabel(existingLabels: string[]): string {
  let num = 1
  while (existingLabels.includes(`e${num}`)) {
    num++
  }
  return `e${num}`
}
