"use client";

import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronRight,
  Wand2,
  Palette,
  RotateCcw,
  Play,
  SkipForward,
  Pause,
  StepForward,
  Grid3X3,
  Trash2,
  StickyNote,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useGraphStore } from "@/lib/graph-store";
import { useDijkstraStore } from "@/lib/dijkstra-store";
import { useTreeStore } from "@/lib/tree-store";
import {
  calculateChromaticNumber,
  CHROMATIC_COLORS,
  bfs,
  dfs,
  findSpanningTree,
  findMinimumSpanningTree,
  analyzeTree,
  checkIsomorphism,
} from "@/lib/graph-algorithms";
import type { PathResult } from "@/lib/graph-types";

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
      if (d < minDistance) { minDistance = d; current = v; }
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

    const neighborEdgeIds = neighbors.map((n) => findEdgeId(graph, current!, n)).filter(Boolean) as string[];
    const relaxedLabels = relaxed.map((id) => graph.vertices.find((v: any) => v.id === id)?.label ?? id).join(", ");

    steps.push({
      current,
      distances: new Map(distances),
      previous: new Map(previous),
      visited: new Set(visited),
      unvisited: new Set(unvisited),
      relaxedEdges: neighborEdgeIds,
      description: relaxed.length > 0
        ? `Visitando ${currentLabel} (dist=${currentDist === Infinity ? "∞" : currentDist}). Atualizando: ${relaxedLabels}`
        : `Visitando ${currentLabel} (dist=${currentDist === Infinity ? "∞" : currentDist}). Nenhuma atualização.`,
    });

    if (endId && current === endId) break;
  }
  return steps;
}

function buildPathEdgeIds(graph: any, path: string[]): string[] {
  const ids: string[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const eid = findEdgeId(graph, path[i], path[i + 1]);
    if (eid) ids.push(eid);
  }
  return ids;
}

function reconstructPath(previous: Map<string, string | null>, startId: string, endId: string, distances: Map<string, number>): PathResult | null {
  const dist = distances.get(endId) ?? Infinity;
  if (dist === Infinity) return null;
  const path: string[] = [];
  let cur: string | null = endId;
  while (cur !== null) { path.unshift(cur); cur = previous.get(cur) ?? null; }
  if (path[0] !== startId) return null;
  return { path, distance: dist };
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border last:border-0">
      <button
        className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {title}
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </div>
  );
}

interface GraphContainerMenuProps {
  graphId: string;
  anchor: { x: number; y: number };
  onClose: () => void;
  onOpenNote: () => void;
}

export function GraphContainerMenu({ graphId, anchor, onClose, onOpenNote }: GraphContainerMenuProps) {
  const setDijkstraHighlight = useDijkstraStore.getState().setDijkstraHighlight;
  const setTreeHighlight = useTreeStore.getState().setTreeHighlight;

  const { graphs, updateGraph, updateVertex, clearGraph, autoLabelVertices, autoLabelEdges } = useGraphStore();
  const graph = graphs.find((g) => g.id === graphId);

  const [chromaticError, setChromaticError] = useState<string | null>(null);

  const [traversalOrigin, setTraversalOrigin] = useState<string>("");
  const [traversalResult, setTraversalResult] = useState<string[] | null>(null);
  const [traversalType, setTraversalType] = useState<"bfs" | "dfs">("bfs");

  const [dijkstraStart, setDijkstraStart] = useState<string>("");
  const [dijkstraEnd, setDijkstraEnd] = useState<string>("");
  const [dijkstraAllMode, setDijkstraAllMode] = useState(false);
  const [dijkstraSteps, setDijkstraSteps] = useState<DijkstraStep[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pathResult, setPathResult] = useState<PathResult | null>(null);
  const [allPathsResult, setAllPathsResult] = useState<{ vertexId: string; label: string; result: PathResult | null }[] | null>(null);
  const [noPath, setNoPath] = useState(false);
  const playInterval = useRef<NodeJS.Timeout | null>(null);

  const [spanningRoot, setSpanningRoot] = useState<string>("");
  const [spanningResult, setSpanningResult] = useState<{ edges: string[]; visited: string[]; isComplete: boolean } | null>(null);
  const [mstResult, setMstResult] = useState<{ edges: string[]; totalWeight: number; isComplete: boolean } | null>(null);
  const [mstError, setMstError] = useState<string | null>(null);

  const [compareGraphId, setCompareGraphId] = useState<string>("");
  const [isoResult, setIsoResult] = useState<{ isIsomorphic: boolean; reason?: string } | null>(null);

  const treeAnalysis = useMemo(() => graph ? analyzeTree(graph) : null, [graph]);
  const finalPath = useMemo(() => (pathResult && graph ? pathResult.path : []), [pathResult, graph]);

  const otherGraphs = graphs.filter((g) => g.id !== graphId);

  const canStartDijkstra = dijkstraAllMode ? !!dijkstraStart : !!dijkstraStart && !!dijkstraEnd && dijkstraStart !== dijkstraEnd;

  useEffect(() => {
    return () => {
      if (playInterval.current) clearInterval(playInterval.current);
      setDijkstraHighlight(null);
      setTreeHighlight(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pathResultRef = useRef(pathResult);
  useEffect(() => { pathResultRef.current = pathResult; }, [pathResult]);

  useEffect(() => {
    if (!graph || dijkstraSteps.length === 0 || currentStep < 0) {
      setDijkstraHighlight(null);
      return;
    }
    const step = dijkstraSteps[currentStep];
    if (!step) return;

    const pr = pathResultRef.current;
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
      targetVertex: dijkstraEnd || null,
      startVertex: dijkstraStart,
      isFinished,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, dijkstraSteps]);

  const stopPlay = useCallback(() => {
    if (playInterval.current) { clearInterval(playInterval.current); playInterval.current = null; }
    setIsPlaying(false);
  }, []);

  function getVertexLabel(id: string): string {
    return graph?.vertices.find((v) => v.id === id)?.label ?? id;
  }

  function computeFinalDijkstra(): { distances: Map<string, number>; previous: Map<string, string | null> } | null {
    if (!graph || !dijkstraStart) return null;
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();
    graph.vertices.forEach((v) => { distances.set(v.id, Infinity); previous.set(v.id, null); unvisited.add(v.id); });
    distances.set(dijkstraStart, 0);
    while (unvisited.size > 0) {
      let current: string | null = null;
      let minDist = Infinity;
      unvisited.forEach((v) => { const d = distances.get(v) ?? Infinity; if (d < minDist) { minDist = d; current = v; } });
      if (current === null || minDist === Infinity) break;
      unvisited.delete(current);
      if (!dijkstraAllMode && current === dijkstraEnd) break;
      graph.edges.forEach((e) => {
        const neighbor = e.source === current ? e.target : (!graph.directed && e.target === current ? e.source : null);
        if (!neighbor || !unvisited.has(neighbor)) return;
        const alt = (distances.get(current!) ?? 0) + (e.weight ?? 1);
        if (alt < (distances.get(neighbor) ?? Infinity)) { distances.set(neighbor, alt); previous.set(neighbor, current); }
      });
    }
    return { distances, previous };
  }

  function computeAllPaths(): { vertexId: string; label: string; result: PathResult | null }[] {
    if (!graph || !dijkstraStart) return [];
    const res = computeFinalDijkstra();
    if (!res) return [];
    return graph.vertices
      .filter((v) => v.id !== dijkstraStart)
      .map((v) => ({ vertexId: v.id, label: v.label, result: reconstructPath(res.previous, dijkstraStart, v.id, res.distances) }));
  }

  function computeFinalPath(): PathResult | null {
    if (!graph || !dijkstraStart || !dijkstraEnd) return null;
    const res = computeFinalDijkstra();
    if (!res) return null;
    return reconstructPath(res.previous, dijkstraStart, dijkstraEnd, res.distances);
  }

  function finishDijkstra() {
    if (!graph || !dijkstraStart) return;
    setNoPath(false);
    if (dijkstraAllMode) {
      setAllPathsResult(computeAllPaths());
      if (dijkstraSteps.length > 0) setCurrentStep(dijkstraSteps.length - 1);
    } else {
      if (!dijkstraEnd) return;
      const result = computeFinalPath();
      if (!result) { setNoPath(true); setPathResult(null); }
      else { setPathResult(result); if (dijkstraSteps.length > 0) setCurrentStep(dijkstraSteps.length - 1); }
    }
  }

  function startDijkstra() {
    if (!graph || !dijkstraStart) return;
    stopPlay();
    setNoPath(false);
    setPathResult(null);
    setAllPathsResult(null);
    const steps = runDijkstraSteps(graph, dijkstraStart, dijkstraAllMode ? null : dijkstraEnd || null);
    setDijkstraSteps(steps);
    setCurrentStep(0);
    setIsPlaying(false);
  }

  function startDijkstraDirect() {
    if (!graph || !dijkstraStart) return;
    stopPlay();
    setNoPath(false);
    const steps = runDijkstraSteps(graph, dijkstraStart, dijkstraAllMode ? null : dijkstraEnd || null);
    setDijkstraSteps(steps);
    setCurrentStep(steps.length - 1);
    setIsPlaying(false);
    if (dijkstraAllMode) {
      setAllPathsResult(computeAllPaths());
    } else if (dijkstraEnd) {
      const lastStep = steps[steps.length - 1];
      const path = lastStep ? reconstructPath(lastStep.previous, dijkstraStart, dijkstraEnd, lastStep.distances) : null;
      if (!path) setNoPath(true);
      setPathResult(path);
    }
  }

  function stepDijkstra() {
    if (currentStep < dijkstraSteps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      stopPlay();
    }
  }

  function playDijkstra() {
    if (isPlaying) { stopPlay(); return; }
    setIsPlaying(true);
    playInterval.current = setInterval(() => {
      setCurrentStep((s) => {
        if (s >= dijkstraSteps.length - 1) { stopPlay(); return s; }
        return s + 1;
      });
    }, 800);
  }

  function resetDijkstra() {
    stopPlay();
    setDijkstraSteps([]);
    setCurrentStep(-1);
    setPathResult(null);
    setAllPathsResult(null);
    setNoPath(false);
    setDijkstraHighlight(null);
  }

  function applyChromaticColoring() {
    if (!graph) return;
    setChromaticError(null);
    const result = calculateChromaticNumber(graph);
    if (!result) {
      setChromaticError("Grafo contém laços — número cromático indefinido");
      updateGraph(graphId, { chromaticNumber: undefined, chromaticColors: undefined });
      return;
    }
    const usedColors = new Set<string>();
    result.colorMap.forEach((colorIdx, vertexId) => {
      const color = CHROMATIC_COLORS[colorIdx % CHROMATIC_COLORS.length];
      usedColors.add(color);
      updateVertex(vertexId, { color });
    });
    updateGraph(graphId, { chromaticNumber: result.chromaticNumber, chromaticColors: Array.from(usedColors) });
  }

  function resetColoring() {
    if (!graph) return;
    const defaultColor = graph.defaultVertexColor || "#6366f1";
    graph.vertices.forEach((v) => updateVertex(v.id, { color: defaultColor }));
    updateGraph(graphId, { chromaticNumber: undefined, chromaticColors: undefined });
    setChromaticError(null);
  }

  function runTraversal(type: "bfs" | "dfs") {
    if (!graph || !traversalOrigin) return;
    setTraversalType(type);
    const result = type === "bfs" ? bfs(graph, traversalOrigin) : dfs(graph, traversalOrigin);
    setTraversalResult(result);
  }

  function runSpanning() {
    if (!graph || !spanningRoot) return;
    const result = findSpanningTree(graph, spanningRoot);
    if (!result) return;
    setSpanningResult(result);
    setMstResult(null);
    setMstError(null);
    setTreeHighlight({ treeEdges: new Set(result.edges), treeVertices: new Set(result.visited), rootVertex: spanningRoot, type: "spanning" });
  }

  function runMST() {
    if (!graph) return;
    if (graph.directed) { setMstError("AGM requer grafo não direcionado."); return; }
    const result = findMinimumSpanningTree(graph);
    if (!result) { setMstError("Não foi possível calcular AGM."); return; }
    setMstResult(result);
    setSpanningResult(null);
    setMstError(null);
    setTreeHighlight({ treeEdges: new Set(result.edges), treeVertices: new Set(graph.vertices.map((v) => v.id)), rootVertex: null, type: "mst" });
  }

  function clearTree() {
    setSpanningResult(null);
    setMstResult(null);
    setMstError(null);
    setTreeHighlight(null);
  }

  function runIsomorphism() {
    if (!graph || !compareGraphId) return;
    const other = graphs.find((g) => g.id === compareGraphId);
    if (!other) return;
    const result = checkIsomorphism(graph, other);
    setIsoResult({ isIsomorphic: result.isIsomorphic, reason: result.reason });
  }

  if (!graph) return null;

  const chromaticResult = graph.chromaticNumber !== undefined
    ? { chromaticNumber: graph.chromaticNumber, colors: graph.chromaticColors || [] }
    : null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-49" onPointerDown={(e) => { e.stopPropagation(); onClose(); }} />
    <div
      style={{ position: "fixed", left: anchor.x, top: anchor.y, zIndex: 50 }}
      className="bg-popover border border-border rounded-lg shadow-xl w-70 max-h-[80vh] overflow-y-auto text-sm"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Section title="Propriedades do Grafo" defaultOpen>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Dígrafo</Label>
          <Switch
            checked={graph.directed}
            onCheckedChange={(checked) => updateGraph(graphId, { directed: checked })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Ponderado</Label>
          <Switch
            checked={graph.weighted}
            onCheckedChange={(checked) => updateGraph(graphId, { weighted: checked })}
          />
        </div>
        <div className="flex gap-1.5 mt-1">
          <Badge variant="secondary" className="text-[10px]">{graph.vertices.length} vértices</Badge>
          <Badge variant="secondary" className="text-[10px]">{graph.edges.length} arestas</Badge>
        </div>
        <div className="grid grid-cols-2 gap-1.5 mt-1">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={autoLabelVertices}>
            <Wand2 className="h-3 w-3 mr-1" />A, B, C…
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={autoLabelEdges}>
            <Wand2 className="h-3 w-3 mr-1" />e1, e2…
          </Button>
        </div>
      </Section>

      <Section title="Número Cromático">
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            variant="default"
            size="sm"
            className="h-7 text-xs"
            onClick={applyChromaticColoring}
            disabled={graph.vertices.length === 0}
          >
            <Palette className="h-3 w-3 mr-1" />Calcular
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={resetColoring}
            disabled={graph.vertices.length === 0}
          >
            <RotateCcw className="h-3 w-3 mr-1" />Resetar
          </Button>
        </div>
        {chromaticError && (
          <p className="text-[10px] text-destructive">{chromaticError}</p>
        )}
        {chromaticResult && !chromaticError && (
          <div className="flex items-center justify-between bg-primary/10 rounded p-2">
            <span className="text-xs text-muted-foreground">χ(G)</span>
            <span className="text-lg font-bold text-primary">{chromaticResult.chromaticNumber}</span>
          </div>
        )}
      </Section>

      <Section title="Travessia (BFS / DFS)">
        <Select value={traversalOrigin} onValueChange={setTraversalOrigin}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Vértice de origem" />
          </SelectTrigger>
          <SelectContent>
            {graph.vertices.map((v) => (
              <SelectItem key={v.id} value={v.id} className="text-xs">{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-1.5">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => runTraversal("bfs")} disabled={!traversalOrigin}>
            BFS
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => runTraversal("dfs")} disabled={!traversalOrigin}>
            DFS
          </Button>
        </div>
        {traversalResult && (
          <div className="bg-muted rounded p-2">
            <p className="text-[10px] text-muted-foreground mb-1">{traversalType.toUpperCase()}:</p>
            <p className="text-xs font-mono">
              {traversalResult.map((id) => graph.vertices.find((v) => v.id === id)?.label ?? id).join(" → ")}
            </p>
          </div>
        )}
      </Section>

      <Section title="Dijkstra">
        <div className="flex items-center gap-1 p-0.5 bg-muted rounded-md">
          <button
            onClick={() => { setDijkstraAllMode(false); resetDijkstra(); }}
            className={`flex-1 text-[11px] py-1 rounded transition-colors ${!dijkstraAllMode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Origem → Destino
          </button>
          <button
            onClick={() => { setDijkstraAllMode(true); resetDijkstra(); }}
            className={`flex-1 text-[11px] py-1 rounded transition-colors ${dijkstraAllMode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Todos os destinos
          </button>
        </div>

        <Select value={dijkstraStart} onValueChange={(v) => { setDijkstraStart(v); resetDijkstra(); }}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Vértice de início" />
          </SelectTrigger>
          <SelectContent>
            {graph.vertices.map((v) => (
              <SelectItem key={v.id} value={v.id} className="text-xs">{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!dijkstraAllMode && (
          <Select value={dijkstraEnd} onValueChange={(v) => { setDijkstraEnd(v); resetDijkstra(); }}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Destino" />
            </SelectTrigger>
            <SelectContent>
              {graph.vertices.filter((v) => v.id !== dijkstraStart).map((v) => (
                <SelectItem key={v.id} value={v.id} className="text-xs">{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {canStartDijkstra && dijkstraSteps.length === 0 && (
          <div className="grid grid-cols-2 gap-1.5">
            <Button variant="default" size="sm" className="h-7 text-xs" onClick={startDijkstra}>
              <StepForward className="h-3 w-3 mr-1" />Passo a passo
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={startDijkstraDirect}>
              <SkipForward className="h-3 w-3 mr-1" />Resultado direto
            </Button>
          </div>
        )}

        {dijkstraSteps.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep <= 0}>
                <ChevronRight className="h-3 w-3 rotate-180" />
              </Button>
              <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={playDijkstra}>
                {isPlaying ? <><Pause className="h-3 w-3 mr-1" />Pausar</> : <><Play className="h-3 w-3 mr-1" />Auto</>}
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={stepDijkstra} disabled={currentStep >= dijkstraSteps.length - 1}>
                <ChevronRight className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => { finishDijkstra(); }}>
                <SkipForward className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetDijkstra}>
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Passo {currentStep + 1} de {dijkstraSteps.length}</span>
              <div className="flex gap-0.5 flex-wrap justify-end max-w-28">
                {dijkstraSteps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${i === currentStep ? "bg-primary" : i < currentStep ? "bg-primary/40" : "bg-muted"}`}
                  />
                ))}
              </div>
            </div>

            {dijkstraSteps[currentStep] && (
              <div className="p-1.5 bg-muted/50 rounded border border-border">
                <p className="text-[10px] font-medium text-primary mb-0.5">
                  Nó atual: {getVertexLabel(dijkstraSteps[currentStep].current)}
                </p>
                <p className="text-[10px] text-muted-foreground">{dijkstraSteps[currentStep].description}</p>
              </div>
            )}

            {dijkstraSteps[currentStep] && (
              <div className="rounded border border-border overflow-hidden">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-1.5 py-1 font-medium">Vértice</th>
                      <th className="text-center px-1.5 py-1 font-medium">Dist.</th>
                      <th className="text-center px-1.5 py-1 font-medium">Anterior</th>
                      <th className="text-center px-1.5 py-1 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {graph.vertices.map((v) => {
                      const step = dijkstraSteps[currentStep];
                      const dist = step.distances.get(v.id) ?? Infinity;
                      const prev = step.previous.get(v.id);
                      const isCurrent = v.id === step.current;
                      const isVisited = step.visited.has(v.id);
                      const isInPath = finalPath.includes(v.id);
                      return (
                        <tr
                          key={v.id}
                          className={`border-t border-border ${isCurrent ? "bg-primary/10" : isInPath && pathResult ? "bg-green-500/10" : ""}`}
                        >
                          <td className={`px-1.5 py-1 font-medium ${isCurrent ? "text-primary" : ""}`}>{v.label}</td>
                          <td className="px-1.5 py-1 text-center font-mono">{dist === Infinity ? "∞" : dist}</td>
                          <td className="px-1.5 py-1 text-center">{prev ? getVertexLabel(prev) : v.id === dijkstraStart ? "—" : "∞"}</td>
                          <td className="px-1.5 py-1 text-center">
                            {isCurrent ? (
                              <span className="text-primary">atual</span>
                            ) : isVisited ? (
                              <span className="text-green-500">✓</span>
                            ) : (
                              <span className="text-muted-foreground">fila</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {noPath && !dijkstraAllMode && (
              <div className="p-1.5 bg-destructive/10 border border-destructive/30 rounded">
                <p className="text-[10px] text-destructive font-medium">
                  Nenhum caminho encontrado entre {getVertexLabel(dijkstraStart)} e {getVertexLabel(dijkstraEnd)}.
                </p>
              </div>
            )}

            {pathResult && !dijkstraAllMode && (
              <div className="p-1.5 bg-green-500/10 border border-green-500/30 rounded space-y-0.5">
                <p className="text-[10px] font-medium text-green-600 dark:text-green-400">Caminho mínimo encontrado:</p>
                <p className="text-xs font-mono">{pathResult.path.map(getVertexLabel).join(" → ")}</p>
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  <span>Distância: <span className="font-medium text-foreground">{pathResult.distance}</span></span>
                  <span>Nós: <span className="font-medium text-foreground">{pathResult.path.length}</span></span>
                  <span>Arestas: <span className="font-medium text-foreground">{pathResult.path.length - 1}</span></span>
                </div>
              </div>
            )}

            {allPathsResult && dijkstraAllMode && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium text-muted-foreground">
                  Caminhos mínimos a partir de <span className="text-foreground">{getVertexLabel(dijkstraStart)}</span>:
                </p>
                <div className="rounded border border-border overflow-hidden">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left px-1.5 py-1 font-medium">Destino</th>
                        <th className="text-center px-1.5 py-1 font-medium">Dist.</th>
                        <th className="text-left px-1.5 py-1 font-medium">Caminho</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allPathsResult.map(({ vertexId, label, result }) => (
                        <tr key={vertexId} className="border-t border-border">
                          <td className="px-1.5 py-1 font-medium">{label}</td>
                          <td className="px-1.5 py-1 text-center font-mono">
                            {result ? (
                              <span className="text-green-600 dark:text-green-400">{result.distance}</span>
                            ) : (
                              <span className="text-destructive">∞</span>
                            )}
                          </td>
                          <td className="px-1.5 py-1 font-mono text-muted-foreground">
                            {result ? result.path.map(getVertexLabel).join(" → ") : <span className="text-destructive">Inacessível</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {allPathsResult.filter((r) => r.result !== null).length} de {allPathsResult.length} vértices acessíveis
                </p>
              </div>
            )}
          </div>
        )}

        {!graph.weighted && graph.vertices.length > 0 && (
          <p className="text-[10px] text-muted-foreground bg-muted/50 p-1.5 rounded">
            Grafo não ponderado: peso 1 por aresta.
          </p>
        )}
      </Section>

      <Section title="Árvore Geradora (BFS)">
        <Select value={spanningRoot} onValueChange={setSpanningRoot}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Raiz" />
          </SelectTrigger>
          <SelectContent>
            {graph.vertices.map((v) => (
              <SelectItem key={v.id} value={v.id} className="text-xs">{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1.5">
          <Button variant="default" size="sm" className="h-7 text-xs flex-1" onClick={runSpanning} disabled={!spanningRoot}>
            <Play className="h-3 w-3 mr-1" />Executar
          </Button>
          {spanningResult && (
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={clearTree}>
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
        </div>
        {spanningResult && (
          <div className="bg-muted rounded p-2 text-xs">
            {spanningResult.isComplete ? "Árvore geradora completa" : "Árvore geradora parcial"}
            {" · "}{spanningResult.edges.length} arestas
          </div>
        )}
      </Section>

      <Section title="Árvore Geradora Mínima (Kruskal)">
        <div className="flex gap-1.5">
          <Button
            variant="default"
            size="sm"
            className="h-7 text-xs flex-1"
            onClick={runMST}
            disabled={graph.directed || graph.vertices.length === 0}
          >
            <Play className="h-3 w-3 mr-1" />Calcular AGM
          </Button>
          {mstResult && (
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={clearTree}>
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
        </div>
        {mstError && <p className="text-[10px] text-destructive">{mstError}</p>}
        {mstResult && (
          <div className="bg-muted rounded p-2 text-xs">
            {mstResult.isComplete ? "AGM completa" : "AGM parcial"}
            {" · "}{mstResult.edges.length} arestas
            {graph.weighted && ` · Peso total: ${mstResult.totalWeight}`}
          </div>
        )}
      </Section>

      <Section title="Análise de Árvore">
        {treeAnalysis ? (
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Folhas</span>
              <span>{treeAnalysis.leafCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nós internos</span>
              <span>{treeAnalysis.internalCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Diâmetro</span>
              <span>{treeAnalysis.diameter}</span>
            </div>
            {treeAnalysis.center.length > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Centro</span>
                <span>{treeAnalysis.center.map((id) => graph.vertices.find((v) => v.id === id)?.label ?? id).join(", ")}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Sem vértices para analisar.</p>
        )}
      </Section>

      <Section title="Isomorfismo">
        <Select value={compareGraphId} onValueChange={setCompareGraphId}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Comparar com…" />
          </SelectTrigger>
          <SelectContent>
            {otherGraphs.map((g) => (
              <SelectItem key={g.id} value={g.id} className="text-xs">{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="default"
          size="sm"
          className="h-7 text-xs w-full"
          onClick={runIsomorphism}
          disabled={!compareGraphId}
        >
          Verificar isomorfismo
        </Button>
        {isoResult && (
          <div className={cn("rounded p-2 text-xs", isoResult.isIsomorphic ? "bg-green-500/10 text-green-400" : "bg-destructive/10 text-destructive")}>
            {isoResult.isIsomorphic ? "Isomórficos" : "Não isomórficos"}
            {isoResult.reason && <p className="text-[10px] opacity-75 mt-0.5">{isoResult.reason}</p>}
          </div>
        )}
      </Section>

      <Section title="Matrizes">
        <Button
          variant={graph.showMatrix ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs w-full"
          onClick={() => updateGraph(graphId, { showMatrix: !graph.showMatrix, matrixType: graph.matrixType ?? "adjacency" })}
        >
          <Grid3X3 className="h-3 w-3 mr-1" />
          {graph.showMatrix ? "Ocultar matriz" : "Mostrar matriz"}
        </Button>
      </Section>

      <Section title="Anotação">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs w-full"
          onClick={() => { onOpenNote(); onClose(); }}
        >
          <StickyNote className="h-3 w-3 mr-1" />
          {graph.notes ? "Abrir anotação" : "Criar anotação"}
        </Button>
      </Section>

      <Separator />

      <div className="p-3">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              disabled={graph.vertices.length === 0 && graph.edges.length === 0}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Limpar grafo
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Limpar grafo?</AlertDialogTitle>
              <AlertDialogDescription>
                Todos os vértices e arestas de &quot;{graph.name}&quot; serão removidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { clearGraph(graphId); onClose(); }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Limpar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
    </>,
    document.body,
  );
}
