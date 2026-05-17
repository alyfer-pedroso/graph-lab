"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle, Play, RotateCcw, StepForward, ChevronRight, Pause, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGraphStore } from "@/lib/graph-store";
import { useDijkstraStore } from "@/lib/dijkstra-store";
import { useTreeStore } from "@/lib/tree-store";
import {
  analyzeGraph,
  bfs,
  dfs,
  calculateDegrees,
  findSpanningTree,
  findMinimumSpanningTree,
  analyzeTree,
  isForest,
  countConnectedComponents,
} from "@/lib/graph-algorithms";
import type { PathResult } from "@/lib/graph-types";
import { TreePine, Network as NetworkIcon, Trash2 } from "lucide-react";

interface DijkstraStep {
  current: string;
  distances: Map<string, number>;
  previous: Map<string, string | null>;
  visited: Set<string>;
  unvisited: Set<string>;
  description: string;
  relaxedEdges: string[];
}

function findEdgeId(graph: any, source: string, target: string): string | null {
  const edge = graph.edges.find(
    (e: any) => (e.source === source && e.target === target) || (!graph.directed && e.source === target && e.target === source),
  );
  return edge?.id ?? null;
}

function runDijkstraSteps(graph: any, startId: string, endId: string | null): DijkstraStep[] {
  const steps: DijkstraStep[] = [];
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const visited = new Set<string>();
  const unvisited = new Set<string>();

  graph.vertices.forEach((v: any) => {
    distances.set(v.id, Infinity);
    previous.set(v.id, null);
    unvisited.add(v.id);
  });
  distances.set(startId, 0);

  steps.push({
    current: startId,
    distances: new Map(distances),
    previous: new Map(previous),
    visited: new Set(visited),
    unvisited: new Set(unvisited),
    relaxedEdges: [],
    description: `Iniciando em ${graph.vertices.find((v: any) => v.id === startId)?.label}. Distância inicial = 0, todas as outras = ∞`,
  });

  while (unvisited.size > 0) {
    let current: string | null = null;
    let minDistance = Infinity;

    unvisited.forEach((v) => {
      const d = distances.get(v) ?? Infinity;
      if (d < minDistance) {
        minDistance = d;
        current = v;
      }
    });

    if (current === null || minDistance === Infinity) break;

    unvisited.delete(current);
    visited.add(current);

    const currentLabel = graph.vertices.find((v: any) => v.id === current)?.label ?? current;
    const currentDist = distances.get(current) ?? Infinity;

    const neighbors: string[] = [];
    graph.edges.forEach((e: any) => {
      if (e.source === current) neighbors.push(e.target);
      if (!graph.directed && e.target === current) neighbors.push(e.source);
    });

    const relaxed: string[] = [];
    neighbors.forEach((neighbor) => {
      if (!unvisited.has(neighbor)) return;
      const edge = graph.edges.find(
        (e: any) => (e.source === current && e.target === neighbor) || (!graph.directed && e.target === current && e.source === neighbor),
      );
      const weight = edge?.weight ?? 1;
      const alt = currentDist + weight;
      if (alt < (distances.get(neighbor) ?? Infinity)) {
        distances.set(neighbor, alt);
        previous.set(neighbor, current);
        relaxed.push(neighbor);
      }
    });

    const neighborEdgeIds: string[] = neighbors.map((n) => findEdgeId(graph, current!, n)).filter(Boolean) as string[];

    const relaxedLabels = relaxed.map((id) => graph.vertices.find((v: any) => v.id === id)?.label ?? id).join(", ");

    steps.push({
      current,
      distances: new Map(distances),
      previous: new Map(previous),
      visited: new Set(visited),
      unvisited: new Set(unvisited),
      relaxedEdges: neighborEdgeIds,
      description:
        relaxed.length > 0
          ? `Visitando ${currentLabel} (dist=${currentDist === Infinity ? "∞" : currentDist}). Atualizando: ${relaxedLabels}`
          : `Visitando ${currentLabel} (dist=${currentDist === Infinity ? "∞" : currentDist}). Nenhuma atualização.`,
    });

    if (endId && current === endId) break;
  }

  return steps;
}

function buildPathEdgeIds(graph: any, path: string[]): string[] {
  const edgeIds: string[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const eid = findEdgeId(graph, path[i], path[i + 1]);
    if (eid) edgeIds.push(eid);
  }
  return edgeIds;
}

function reconstructPath(previous: Map<string, string | null>, startId: string, endId: string, distances: Map<string, number>): PathResult | null {
  const dist = distances.get(endId) ?? Infinity;
  if (dist === Infinity) return null;
  const path: string[] = [];
  let cur: string | null = endId;
  while (cur !== null) {
    path.unshift(cur);
    cur = previous.get(cur) ?? null;
  }
  if (path[0] !== startId) return null;
  return { path, distance: dist };
}

export function AnalysisPanel() {
  const setDijkstraHighlight = useDijkstraStore.getState().setDijkstraHighlight;
  const setTreeHighlight = useTreeStore.getState().setTreeHighlight;

  const { graphs, activeGraphId } = useGraphStore();
  const activeGraph = graphs.find((g) => g.id === activeGraphId);

  const [spanningRoot, setSpanningRoot] = useState<string>("");
  const [spanningResult, setSpanningResult] = useState<{ edges: string[]; visited: string[]; isComplete: boolean } | null>(null);
  const [mstResult, setMstResult] = useState<{ edges: string[]; totalWeight: number; isComplete: boolean } | null>(null);
  const [mstError, setMstError] = useState<string | null>(null);

  const [startVertex, setStartVertex] = useState<string>("");
  const [endVertex, setEndVertex] = useState<string>("");
  const [allDestinationsMode, setAllDestinationsMode] = useState(false);
  const [searchResult, setSearchResult] = useState<string[] | null>(null);
  const [pathResult, setPathResult] = useState<PathResult | null>(null);
  const [allPathsResult, setAllPathsResult] = useState<{ vertexId: string; label: string; result: PathResult | null }[] | null>(null);
  const [searchType, setSearchType] = useState<"bfs" | "dfs">("bfs");
  const [noPath, setNoPath] = useState(false);

  const [dijkstraSteps, setDijkstraSteps] = useState<DijkstraStep[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const playInterval = useRef<NodeJS.Timeout | null>(null);

  const activeGraphRef = useRef(activeGraph);
  const startVertexRef = useRef(startVertex);
  const endVertexRef = useRef(endVertex);
  const pathResultRef = useRef(pathResult);

  useEffect(() => {
    activeGraphRef.current = activeGraph;
  }, [activeGraph]);
  useEffect(() => {
    startVertexRef.current = startVertex;
  }, [startVertex]);
  useEffect(() => {
    endVertexRef.current = endVertex;
  }, [endVertex]);
  useEffect(() => {
    pathResultRef.current = pathResult;
  }, [pathResult]);

  const analysis = useMemo(() => {
    if (!activeGraph) return null;
    return analyzeGraph(activeGraph);
  }, [activeGraph]);

  const degrees = useMemo(() => {
    if (!activeGraph) return null;
    return calculateDegrees(activeGraph);
  }, [activeGraph]);

  const treeAnalysis = useMemo(() => {
    if (!activeGraph) return null;
    return analyzeTree(activeGraph);
  }, [activeGraph]);

  const componentsCount = useMemo(() => {
    if (!activeGraph) return 0;
    return countConnectedComponents(activeGraph);
  }, [activeGraph]);

  const forestFlag = useMemo(() => {
    if (!activeGraph) return false;
    return isForest(activeGraph);
  }, [activeGraph]);

  useEffect(() => {
    return () => {
      setTreeHighlight(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function runSpanningTree() {
    if (!activeGraph || !spanningRoot) return;
    const result = findSpanningTree(activeGraph, spanningRoot);
    if (!result) return;
    setSpanningResult(result);
    setMstResult(null);
    setMstError(null);
    setTreeHighlight({
      treeEdges: new Set(result.edges),
      treeVertices: new Set(result.visited),
      rootVertex: spanningRoot,
      type: "spanning",
    });
  }

  function runMST() {
    if (!activeGraph) return;
    if (activeGraph.directed) {
      setMstError("AGM requer grafo não direcionado.");
      setMstResult(null);
      return;
    }
    const result = findMinimumSpanningTree(activeGraph);
    if (!result) {
      setMstError("Não foi possível calcular AGM.");
      return;
    }
    setMstResult(result);
    setSpanningResult(null);
    setMstError(null);
    setTreeHighlight({
      treeEdges: new Set(result.edges),
      treeVertices: new Set(activeGraph.vertices.map((v) => v.id)),
      rootVertex: null,
      type: "mst",
    });
  }

  function clearTreeHighlight() {
    setSpanningResult(null);
    setMstResult(null);
    setMstError(null);
    setTreeHighlight(null);
  }

  useEffect(() => {
    const graph = activeGraphRef.current;
    if (!graph || dijkstraSteps.length === 0 || currentStep < 0) {
      setDijkstraHighlight(null);
      return;
    }

    const step = dijkstraSteps[currentStep];
    if (!step) {
      setDijkstraHighlight(null);
      return;
    }

    const pr = pathResultRef.current;
    const sv = startVertexRef.current;
    const ev = endVertexRef.current;

    let pathVertices: Set<string> = new Set();
    let pathEdges: Set<string> = new Set();
    const isFinished = pr !== null;

    if (isFinished && pr) {
      pathVertices = new Set(pr.path);
      pathEdges = new Set(buildPathEdgeIds(graph, pr.path));
    }

    setDijkstraHighlight({
      currentVertex: step.current,
      visitedVertices: new Set(step.visited),
      activeEdges: new Set(step.relaxedEdges),
      pathVertices,
      pathEdges,
      targetVertex: ev || null,
      startVertex: sv,
      isFinished,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, dijkstraSteps, setDijkstraHighlight]);

  useEffect(() => {
    const graph = activeGraphRef.current;
    if (!graph || dijkstraSteps.length === 0 || currentStep < 0) return;

    const step = dijkstraSteps[currentStep];
    if (!step) return;

    const pr = pathResult;
    const sv = startVertexRef.current;
    const ev = endVertexRef.current;

    let pathVertices: Set<string> = new Set();
    let pathEdges: Set<string> = new Set();
    const isFinished = pr !== null;

    if (isFinished && pr) {
      pathVertices = new Set(pr.path);
      pathEdges = new Set(buildPathEdgeIds(graph, pr.path));
    }

    setDijkstraHighlight({
      currentVertex: step.current,
      visitedVertices: new Set(step.visited),
      activeEdges: new Set(step.relaxedEdges),
      pathVertices,
      pathEdges,
      targetVertex: ev || null,
      startVertex: sv,
      isFinished,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathResult]);

  useEffect(() => {
    return () => {
      setDijkstraHighlight(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isPlaying) {
      playInterval.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= dijkstraSteps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 800);
    } else {
      if (playInterval.current) clearInterval(playInterval.current);
    }
    return () => {
      if (playInterval.current) clearInterval(playInterval.current);
    };
  }, [isPlaying, dijkstraSteps.length]);

  if (!activeGraph) {
    return <div className="p-4 text-center text-muted-foreground text-sm">Crie seu primeiro grafo para começar.</div>;
  }

  function getVertexLabel(id: string): string {
    return activeGraph?.vertices.find((v) => v.id === id)?.label || id;
  }

  function runSearch() {
    if (!activeGraph || !startVertex) return;
    const result = searchType === "bfs" ? bfs(activeGraph, startVertex) : dfs(activeGraph, startVertex);
    setSearchResult(result);
  }

  function initDijkstra() {
    if (!activeGraph || !startVertex) return;
    setNoPath(false);
    setPathResult(null);
    setAllPathsResult(null);
    const steps = runDijkstraSteps(activeGraph, startVertex, allDestinationsMode ? null : endVertex);
    setDijkstraSteps(steps);
    setCurrentStep(0);
    setIsPlaying(false);
  }

  function computeFinalDijkstra(): { distances: Map<string, number>; previous: Map<string, string | null> } | null {
    if (!activeGraph || !startVertex) return null;

    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();
    activeGraph.vertices.forEach((v) => {
      distances.set(v.id, Infinity);
      previous.set(v.id, null);
      unvisited.add(v.id);
    });
    distances.set(startVertex, 0);

    while (unvisited.size > 0) {
      let current: string | null = null;
      let minDistance = Infinity;
      unvisited.forEach((v) => {
        const d = distances.get(v) ?? Infinity;
        if (d < minDistance) {
          minDistance = d;
          current = v;
        }
      });
      if (current === null || minDistance === Infinity) break;
      unvisited.delete(current);
      if (!allDestinationsMode && current === endVertex) break;

      activeGraph.edges.forEach((e) => {
        const neighbor = e.source === current ? e.target : !activeGraph.directed && e.target === current ? e.source : null;
        if (!neighbor || !unvisited.has(neighbor)) return;
        const weight = e.weight ?? 1;
        const alt = (distances.get(current!) ?? 0) + weight;
        if (alt < (distances.get(neighbor) ?? Infinity)) {
          distances.set(neighbor, alt);
          previous.set(neighbor, current);
        }
      });
    }

    return { distances, previous };
  }

  function computeFinalPath(): PathResult | null {
    if (!activeGraph || !startVertex || !endVertex) return null;
    const result = computeFinalDijkstra();
    if (!result) return null;
    return reconstructPath(result.previous, startVertex, endVertex, result.distances);
  }

  function computeAllPaths(): { vertexId: string; label: string; result: PathResult | null }[] {
    if (!activeGraph || !startVertex) return [];
    const result = computeFinalDijkstra();
    if (!result) return [];
    return activeGraph.vertices
      .filter((v) => v.id !== startVertex)
      .map((v) => ({
        vertexId: v.id,
        label: v.label,
        result: reconstructPath(result.previous, startVertex, v.id, result.distances),
      }));
  }

  function finishDijkstra() {
    if (!activeGraph || !startVertex) return;
    setNoPath(false);

    if (allDestinationsMode) {
      const paths = computeAllPaths();
      setAllPathsResult(paths);
      if (dijkstraSteps.length > 0) setCurrentStep(dijkstraSteps.length - 1);
    } else {
      if (!endVertex) return;
      const result = computeFinalPath();
      if (!result) {
        setNoPath(true);
        setPathResult(null);
        return;
      }
      setPathResult(result);
      if (dijkstraSteps.length > 0) setCurrentStep(dijkstraSteps.length - 1);
    }
  }

  function resetDijkstra() {
    setDijkstraSteps([]);
    setCurrentStep(-1);
    setPathResult(null);
    setAllPathsResult(null);
    setNoPath(false);
    setIsPlaying(false);
    setDijkstraHighlight(null);
  }

  const activeStep = currentStep >= 0 && currentStep < dijkstraSteps.length ? dijkstraSteps[currentStep] : null;

  const finalPath = useMemo(() => {
    if (!pathResult || !activeGraph) return [];
    return pathResult.path;
  }, [pathResult, activeGraph]);

  const canStartDijkstra = allDestinationsMode ? !!startVertex : !!startVertex && !!endVertex && startVertex !== endVertex;

  return (
    <div className="p-4 space-y-6 overflow-auto max-h-[calc(100vh-150px)]">
      <div className="space-y-3">
        <h4 className="font-semibold text-sm">Propriedades do Grafo</h4>
        <div className="grid grid-cols-2 gap-2">
          <PropertyBadge label="Conexo" value={analysis?.isConnected} />
          <PropertyBadge label="Bipartido" value={analysis?.isBipartite} />
          <PropertyBadge label="Tem Ciclo" value={analysis?.hasCycle} />
          <PropertyBadge label="Tem Loops" value={analysis?.hasLoops} />
          <PropertyBadge label="É Árvore" value={analysis?.isTree} />
          <PropertyBadge label="Completo" value={analysis?.isComplete} />
        </div>
        {analysis?.hasLoops && (
          <div className="p-2 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground">
              Loops: <span className="font-medium text-foreground">{analysis?.loopCount ?? 0}</span>
            </p>
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="font-semibold text-sm">Graus dos Vértices</h4>
        {activeGraph.vertices.length === 0 ? (
          <p className="text-xs text-muted-foreground">Adicione vértices para ver os graus</p>
        ) : (
          <div className="space-y-1">
            {activeGraph.vertices.map((vertex) => {
              const degree = degrees?.degree.get(vertex.id) || 0;
              const inDeg = degrees?.inDegree?.get(vertex.id);
              const outDeg = degrees?.outDegree?.get(vertex.id);
              return (
                <div key={vertex.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{vertex.label}</span>
                  <div className="flex gap-2">
                    {activeGraph.directed ? (
                      <>
                        <Badge variant="outline" className="text-xs">
                          in: {inDeg}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          out: {outDeg}
                        </Badge>
                      </>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        grau: {degree}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="font-semibold text-sm">Busca (BFS/DFS)</h4>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Select value={searchType} onValueChange={(v) => setSearchType(v as "bfs" | "dfs")}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bfs">BFS</SelectItem>
                <SelectItem value="dfs">DFS</SelectItem>
              </SelectContent>
            </Select>
            <Select value={startVertex} onValueChange={setStartVertex}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Início" />
              </SelectTrigger>
              <SelectContent>
                {activeGraph.vertices.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="icon" onClick={runSearch} disabled={!startVertex}>
              <Play className="h-4 w-4" />
            </Button>
          </div>
          {searchResult && (
            <div className="p-2 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground mb-1">Ordem de visita ({searchType.toUpperCase()}):</p>
              <p className="text-sm font-mono">{searchResult.map(getVertexLabel).join(" → ")}</p>
            </div>
          )}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="font-semibold text-sm">Caminho Mínimo — Dijkstra</h4>

        <div className="flex items-center gap-1 p-1 bg-muted rounded-md">
          <button
            onClick={() => {
              setAllDestinationsMode(false);
              resetDijkstra();
            }}
            className={`flex-1 text-xs py-1.5 rounded transition-colors ${!allDestinationsMode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Origem → Destino
          </button>
          <button
            onClick={() => {
              setAllDestinationsMode(true);
              resetDijkstra();
            }}
            className={`flex-1 text-xs py-1.5 rounded transition-colors ${allDestinationsMode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Todos os destinos
          </button>
        </div>

        {dijkstraSteps.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
              Atual / Caminho
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />
              Visitado
            </span>
          </div>
        )}

        <div className={`grid gap-2 ${allDestinationsMode ? "grid-cols-1" : "grid-cols-2"}`}>
          <div className="space-y-1">
            <Label className="text-xs">Origem</Label>
            <Select
              value={startVertex}
              onValueChange={(v) => {
                setStartVertex(v);
                resetDijkstra();
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {activeGraph.vertices.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!allDestinationsMode && (
            <div className="space-y-1">
              <Label className="text-xs">Destino</Label>
              <Select
                value={endVertex}
                onValueChange={(v) => {
                  setEndVertex(v);
                  resetDijkstra();
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {activeGraph.vertices.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {allDestinationsMode && startVertex && (
          <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
            Calculará o menor caminho de <span className="font-medium text-foreground">{getVertexLabel(startVertex)}</span> para todos os outros
            vértices.
          </p>
        )}

        {canStartDijkstra && (
          <div className="space-y-2">
            {dijkstraSteps.length === 0 ? (
              <div className="flex gap-2 flex-wrap">
                <Button className="flex-1" onClick={initDijkstra} size="sm">
                  <StepForward className="h-4 w-4 mr-2" />
                  Simular passo a passo
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setNoPath(false);
                    if (allDestinationsMode) {
                      const paths = computeAllPaths();
                      setAllPathsResult(paths);
                      const steps = runDijkstraSteps(activeGraph, startVertex, null);
                      setDijkstraSteps(steps);
                      setCurrentStep(steps.length - 1);
                    } else {
                      const result = computeFinalPath();
                      if (!result) {
                        setNoPath(true);
                        setPathResult(null);
                      } else {
                        setPathResult(result);
                        const steps = runDijkstraSteps(activeGraph, startVertex, endVertex);
                        setDijkstraSteps(steps);
                        setCurrentStep(steps.length - 1);
                      }
                    }
                  }}
                  size="sm"
                >
                  <SkipForward className="h-4 w-4 mr-2" />
                  Resultado direto
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                    disabled={currentStep <= 0}
                  >
                    <ChevronRight className="h-3 w-3 rotate-180" />
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => setIsPlaying(!isPlaying)}>
                    {isPlaying ? (
                      <>
                        <Pause className="h-3 w-3 mr-1" />
                        Pausar
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 mr-1" />
                        Auto
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setCurrentStep(Math.min(dijkstraSteps.length - 1, currentStep + 1))}
                    disabled={currentStep >= dijkstraSteps.length - 1}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setCurrentStep(dijkstraSteps.length - 1);
                      setIsPlaying(false);
                      finishDijkstra();
                    }}
                  >
                    <SkipForward className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetDijkstra}>
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Passo {currentStep + 1} de {dijkstraSteps.length}
                  </span>
                  <div className="flex gap-0.5">
                    {dijkstraSteps.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentStep(i)}
                        className={`w-2 h-2 rounded-full transition-colors ${i === currentStep ? "bg-primary" : i < currentStep ? "bg-primary/40" : "bg-muted"}`}
                      />
                    ))}
                  </div>
                </div>

                {activeStep && (
                  <div className="p-2 bg-muted/50 rounded-md border border-border">
                    <p className="text-xs font-medium mb-1 text-primary">Nó atual: {getVertexLabel(activeStep.current)}</p>
                    <p className="text-xs text-muted-foreground">{activeStep.description}</p>
                  </div>
                )}

                {activeStep && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Tabela de distâncias:</p>
                    <div className="rounded-md border border-border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left px-2 py-1 font-medium">Vértice</th>
                            <th className="text-center px-2 py-1 font-medium">Dist.</th>
                            <th className="text-center px-2 py-1 font-medium">Anterior</th>
                            <th className="text-center px-2 py-1 font-medium">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeGraph.vertices.map((v) => {
                            const dist = activeStep.distances.get(v.id) ?? Infinity;
                            const prev = activeStep.previous.get(v.id);
                            const isCurrent = v.id === activeStep.current;
                            const isVisited = activeStep.visited.has(v.id);
                            const isInPath = finalPath.includes(v.id);
                            return (
                              <tr
                                key={v.id}
                                className={`border-t border-border ${isCurrent ? "bg-primary/10" : isInPath && pathResult ? "bg-green-500/10" : ""}`}
                              >
                                <td className={`px-2 py-1 font-medium ${isCurrent ? "text-primary" : ""}`}>{v.label}</td>
                                <td className="px-2 py-1 text-center font-mono">{dist === Infinity ? "∞" : dist}</td>
                                <td className="px-2 py-1 text-center">{prev ? getVertexLabel(prev) : v.id === startVertex ? "—" : "∞"}</td>
                                <td className="px-2 py-1 text-center">
                                  {isCurrent ? (
                                    <span className="text-primary text-xs">atual</span>
                                  ) : isVisited ? (
                                    <span className="text-green-500 text-xs">✓</span>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">fila</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {noPath && !allDestinationsMode && (
          <div className="p-2 bg-destructive/10 border border-destructive/30 rounded-md">
            <p className="text-xs text-destructive font-medium">
              Nenhum caminho encontrado entre {getVertexLabel(startVertex)} e {getVertexLabel(endVertex)}.
            </p>
          </div>
        )}

        {pathResult && !allDestinationsMode && (
          <div className="p-2 bg-green-500/10 border border-green-500/30 rounded-md space-y-1">
            <p className="text-xs font-medium text-green-600 dark:text-green-400">Caminho mínimo encontrado:</p>
            <p className="text-sm font-mono">{pathResult.path.map(getVertexLabel).join(" → ")}</p>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>
                Distância: <span className="font-medium text-foreground">{pathResult.distance}</span>
              </span>
              <span>
                Nós: <span className="font-medium text-foreground">{pathResult.path.length}</span>
              </span>
              <span>
                Arestas: <span className="font-medium text-foreground">{pathResult.path.length - 1}</span>
              </span>
            </div>
          </div>
        )}

        {allPathsResult && allDestinationsMode && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Caminhos mínimos a partir de <span className="text-foreground">{getVertexLabel(startVertex)}</span>:
            </p>
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-2 py-1.5 font-medium">Destino</th>
                    <th className="text-center px-2 py-1.5 font-medium">Dist.</th>
                    <th className="text-left px-2 py-1.5 font-medium">Caminho</th>
                  </tr>
                </thead>
                <tbody>
                  {allPathsResult.map(({ vertexId, label, result }) => (
                    <tr key={vertexId} className="border-t border-border">
                      <td className="px-2 py-1.5 font-medium">{label}</td>
                      <td className="px-2 py-1.5 text-center font-mono">
                        {result ? (
                          <span className="text-green-600 dark:text-green-400">{result.distance}</span>
                        ) : (
                          <span className="text-destructive">∞</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 font-mono text-muted-foreground">
                        {result ? result.path.map(getVertexLabel).join(" → ") : <span className="text-destructive text-xs">Inacessível</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              {allPathsResult.filter((r) => r.result !== null).length} de {allPathsResult.length} vértices acessíveis
            </p>
          </div>
        )}

        {!activeGraph.weighted && activeGraph.vertices.length > 0 && (
          <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
            Grafo não ponderado: peso 1 por aresta. Ative "Ponderado" nas propriedades para usar pesos customizados.
          </p>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <TreePine className="h-4 w-4" />
          Árvores
        </h4>

        <div className="grid grid-cols-2 gap-2">
          <PropertyBadge label="É Árvore" value={treeAnalysis?.isTree} />
          <PropertyBadge label="É Floresta" value={forestFlag} />
        </div>

        <div className="p-2 bg-muted/50 rounded-md space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vértices (n):</span>
            <span className="font-medium">{treeAnalysis?.vertexCount ?? 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Arestas (m):</span>
            <span className="font-medium">{treeAnalysis?.edgeCount ?? 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Componentes:</span>
            <span className="font-medium">{componentsCount}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Relação m × n:</span>
            <span className="font-medium text-right">{treeAnalysis?.vertexEdgeRelation}</span>
          </div>
        </div>

        {treeAnalysis?.isTree && (
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-md space-y-1 text-xs">
            <p className="font-medium text-amber-700 dark:text-amber-300">Estrutura da Árvore</p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Folhas:</span>
              <span className="font-medium">
                {treeAnalysis.leafCount} ({treeAnalysis.leaves.map(getVertexLabel).join(", ")})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nós internos:</span>
              <span className="font-medium">{treeAnalysis.internalCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Diâmetro:</span>
              <span className="font-medium">{treeAnalysis.diameter}</span>
            </div>
            {treeAnalysis.diameterPath.length > 0 && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Caminho diâmetro:</span>
                <span className="font-medium text-right font-mono">{treeAnalysis.diameterPath.map(getVertexLabel).join(" → ")}</span>
              </div>
            )}
            {treeAnalysis.center.length > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Centro:</span>
                <span className="font-medium">{treeAnalysis.center.map(getVertexLabel).join(", ")}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <NetworkIcon className="h-4 w-4" />
          Árvore Geradora (BFS)
        </h4>
        <p className="text-xs text-muted-foreground">Subgrafo conexo acíclico contendo todos os vértices do grafo.</p>

        <div className="space-y-2">
          <Label className="text-xs">Raiz</Label>
          <div className="flex gap-2">
            <Select value={spanningRoot} onValueChange={setSpanningRoot}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {activeGraph.vertices.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={runSpanningTree} disabled={!spanningRoot}>
              <Play className="h-4 w-4 mr-1" />
              Gerar
            </Button>
          </div>
        </div>

        {spanningResult && (
          <div
            className={`p-2 rounded-md border space-y-1 ${spanningResult.isComplete ? "bg-amber-500/10 border-amber-500/30" : "bg-destructive/10 border-destructive/30"}`}
          >
            {spanningResult.isComplete ? (
              <>
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Árvore geradora encontrada</p>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>
                    Arestas: <span className="font-medium text-foreground">{spanningResult.edges.length}</span>
                  </span>
                  <span>
                    Vértices: <span className="font-medium text-foreground">{spanningResult.visited.length}</span>
                  </span>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs font-medium text-destructive">Grafo desconexo — árvore geradora não existe</p>
                <p className="text-xs text-muted-foreground">
                  Apenas {spanningResult.visited.length} de {activeGraph.vertices.length} vértices alcançados.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <TreePine className="h-4 w-4" />
          AGM — Árvore Geradora Mínima
        </h4>
        <p className="text-xs text-muted-foreground">Algoritmo de Kruskal: encontra a árvore geradora com menor soma de pesos.</p>

        <Button size="sm" className="w-full" onClick={runMST} disabled={activeGraph.directed || activeGraph.vertices.length === 0}>
          <Play className="h-4 w-4 mr-2" />
          Calcular AGM (Kruskal)
        </Button>

        {mstError && (
          <div className="p-2 bg-destructive/10 border border-destructive/30 rounded-md">
            <p className="text-xs text-destructive font-medium">{mstError}</p>
          </div>
        )}

        {mstResult && (
          <div
            className={`p-2 rounded-md border space-y-1 ${mstResult.isComplete ? "bg-amber-500/10 border-amber-500/30" : "bg-destructive/10 border-destructive/30"}`}
          >
            {mstResult.isComplete ? (
              <>
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">AGM encontrada</p>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>
                    Peso total: <span className="font-medium text-foreground">{mstResult.totalWeight}</span>
                  </span>
                  <span>
                    Arestas: <span className="font-medium text-foreground">{mstResult.edges.length}</span>
                  </span>
                </div>
                {!activeGraph.weighted && (
                  <p className="text-xs text-muted-foreground">Grafo não ponderado: cada aresta vale 1.</p>
                )}
              </>
            ) : (
              <>
                <p className="text-xs font-medium text-destructive">Grafo desconexo — AGM não existe</p>
                <p className="text-xs text-muted-foreground">
                  Apenas {mstResult.edges.length + 1} vértice(s) conectados via {mstResult.edges.length} aresta(s).
                </p>
              </>
            )}
          </div>
        )}

        {(spanningResult || mstResult) && (
          <Button size="sm" variant="outline" className="w-full" onClick={clearTreeHighlight}>
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar destaque
          </Button>
        )}
      </div>
    </div>
  );
}

function PropertyBadge({ label, value }: { label: string; value?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {value ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}
      <span>{label}</span>
    </div>
  );
}
