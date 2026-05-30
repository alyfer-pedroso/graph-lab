"use client";

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle, type MutableRefObject } from "react";
import { useGraphStore } from "@/lib/graph-store";
import { useDijkstraStore } from "@/lib/dijkstra-store";
import { useTreeStore } from "@/lib/tree-store";
import { GRID_SIZE, type Vertex, type Edge, type Graph } from "@/lib/graph-types";
import { computeGraphsBounds, VERTEX_RADIUS } from "@/core/domain/graph/graph-bounds";
import { computeFitTransform } from "@/lib/viewport-fit";

interface GraphCanvasProps {
  graphId?: string;
  readOnly?: boolean;
  width?: number;
  height?: number;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  showAllGraphs?: boolean;
  viewportRef?: MutableRefObject<{ pan: { x: number; y: number }; zoom: number }>;
  onVertexDoubleClick?: (vertexId: string, screenX: number, screenY: number) => void;
  onEdgeDoubleClick?: (edgeId: string, screenX: number, screenY: number) => void;
  onCanvasDoubleClick?: (localX: number, localY: number, screenX: number, screenY: number) => void;
}

export interface GraphCanvasRef {
  resetView: () => void;
  fitView: () => void;
  exportImage: (format: "png" | "jpeg") => void;
  startEdgeCreation: (sourceVertexId: string) => void;
}

export const GraphCanvas = forwardRef<GraphCanvasRef, GraphCanvasProps>(function GraphCanvas(
  {
    graphId,
    readOnly = false,
    width = 800,
    height = 600,
    zoom: externalZoom,
    onZoomChange,
    showAllGraphs = false,
    viewportRef,
    onVertexDoubleClick,
    onEdgeDoubleClick,
    onCanvasDoubleClick,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width, height });
  const dprRef = useRef<number>(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef({ x: 0, y: 0 });

  const [internalZoom, setInternalZoom] = useState(1);
  const zoom = externalZoom ?? internalZoom;
  const zoomRef = useRef(zoom);

  const setZoom = useCallback(
    (newZoom: number) => {
      const clampedZoom = Math.max(0.1, Math.min(3, newZoom));
      setInternalZoom(clampedZoom);
      zoomRef.current = clampedZoom;
      onZoomChange?.(clampedZoom);
      if (viewportRef) viewportRef.current = { pan: panRef.current, zoom: clampedZoom };
    },
    [onZoomChange, viewportRef],
  );

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  const [isCreatingEdge, setIsCreatingEdge] = useState(false);
  const [edgeSourceVertexId, setEdgeSourceVertexId] = useState<string | null>(null);
  const isCreatingEdgeRef = useRef(false);
  const edgeSourceVertexIdRef = useRef<string | null>(null);

  const [isMovingSelection, setIsMovingSelection] = useState(false);
  const moveStart = useRef({ x: 0, y: 0 });
  const isMovingSelectionRef = useRef(false);
  const movingVerticesStartRef = useRef<Map<string, { x: number; y: number }> | null>(null);
  const dragHistoryPushedRef = useRef(false);
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [_, setDragVertex] = useState<string | null>(null);
  const dragVertexRef = useRef<string | null>(null);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const mousePosRef = useRef({ x: 0, y: 0 });

  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);
  const touchActionRef = useRef<"none" | "pan" | "pinch">("none");

  const animFrameRef = useRef<number | null>(null);
  const animTimeRef = useRef<number>(0);

  function cancelEdgeCreationLocal() {
    setIsCreatingEdge(false);
    setEdgeSourceVertexId(null);
    isCreatingEdgeRef.current = false;
    edgeSourceVertexIdRef.current = null;
  }

  useImperativeHandle(
    ref,
    () => ({
      resetView: () => {
        setPan({ x: 0, y: 0 });
        panRef.current = { x: 0, y: 0 };
        setZoom(1);
      },
      startEdgeCreation: (sourceVertexId: string) => {
        setIsCreatingEdge(true);
        setEdgeSourceVertexId(sourceVertexId);
        isCreatingEdgeRef.current = true;
        edgeSourceVertexIdRef.current = sourceVertexId;
      },
      fitView: () => {
        const container = containerRef.current;
        const viewport = {
          width: container?.clientWidth ?? canvasSize.width,
          height: container?.clientHeight ?? canvasSize.height,
        };
        if (viewport.width <= 0 || viewport.height <= 0) return;

        const bounds = computeGraphsBounds(useGraphStore.getState().graphs);
        if (!bounds) return;

        const { zoom: nextZoom, pan: nextPan } = computeFitTransform(bounds, viewport, {
          padding: 56,
          minZoom: 0.1,
          maxZoom: 3,
        });

        setPan(nextPan);
        panRef.current = nextPan;
        setZoom(nextZoom);
      },
      exportImage: (format: "png" | "jpeg") => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement("a");
        link.download = `grafo.${format}`;
        if (format === "jpeg") {
          const offscreen = document.createElement("canvas");
          offscreen.width = canvas.width;
          offscreen.height = canvas.height;
          const ctx2 = offscreen.getContext("2d")!;
          ctx2.fillStyle = "#ffffff";
          ctx2.fillRect(0, 0, offscreen.width, offscreen.height);
          ctx2.drawImage(canvas, 0, 0, offscreen.width, offscreen.height);
          link.href = offscreen.toDataURL("image/jpeg", 0.95);
        } else {
          link.href = canvas.toDataURL("image/png");
        }
        link.click();
      },
    }),
    [setZoom, canvasSize],
  );

  const {
    graphs,
    activeGraphId,
    selectedVertexIds,
    selectedEdgeIds,
    gridSnap,
    addVertex,
    moveVertex,
    addEdge,
    deleteVertex,
    deleteEdge,
    selectVertex,
    selectEdge,
    clearSelection,
    pushHistory,
    setActiveGraph,
  } = useGraphStore();

  const { dijkstraHighlight } = useDijkstraStore();
  const { treeHighlight } = useTreeStore();

  const selectedVertexIdsRef = useRef(selectedVertexIds);
  const selectedEdgeIdsRef = useRef(selectedEdgeIds);
  const dijkstraHighlightRef = useRef(dijkstraHighlight);
  const treeHighlightRef = useRef(treeHighlight);
  const gridSnapRef = useRef(gridSnap);
  useEffect(() => {
    selectedVertexIdsRef.current = selectedVertexIds;
  }, [selectedVertexIds]);
  useEffect(() => {
    selectedEdgeIdsRef.current = selectedEdgeIds;
  }, [selectedEdgeIds]);
  useEffect(() => {
    dijkstraHighlightRef.current = dijkstraHighlight;
  }, [dijkstraHighlight]);
  useEffect(() => {
    treeHighlightRef.current = treeHighlight;
  }, [treeHighlight]);
  useEffect(() => {
    gridSnapRef.current = gridSnap;
  }, [gridSnap]);

  const targetGraphId = graphId || activeGraphId;
  const activeGraph = graphs.find((g) => g.id === targetGraphId);
  const graphsToRender = showAllGraphs ? graphs.filter((g) => g.visible) : activeGraph ? [activeGraph] : [];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        setCanvasSize({ width: w, height: h });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function handleDprChange() {
      dprRef.current = window.devicePixelRatio || 1;
      draw();
    }
    const mql = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    mql.addEventListener?.("change", handleDprChange);
    return () => mql.removeEventListener?.("change", handleDprChange);
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = dprRef.current;
    canvas.width = Math.max(1, Math.floor(canvasSize.width * dpr));
    canvas.height = Math.max(1, Math.floor(canvasSize.height * dpr));
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;
  }, [canvasSize]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    if (dijkstraHighlight || treeHighlight) {
      const animate = (time: number) => {
        animTimeRef.current = time;
        draw();
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);
      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    }
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dijkstraHighlight, treeHighlight]);

  function hasReverseEdge(graph: Graph, sourceId: string, targetId: string): boolean {
    if (!graph.directed) return false;
    return graph.edges.some((e) => e.source === targetId && e.target === sourceId);
  }

  function getCurvedEdgePoints(
    source: Vertex,
    target: Vertex,
    vertexRadius: number = 24,
  ): { startX: number; startY: number; cpX: number; cpY: number; endX: number; endY: number } {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const curvature = 0.2;
    const cpOffset = dist * curvature;

    const midX = (source.x + target.x) / 2;
    const midY = (source.y + target.y) / 2;

    const perpX = -Math.sin(angle) * cpOffset;
    const perpY = Math.cos(angle) * cpOffset;
    const cpX = midX + perpX;
    const cpY = midY + perpY;

    const startAngle = Math.atan2(cpY - source.y, cpX - source.x);
    const startX = source.x + vertexRadius * Math.cos(startAngle);
    const startY = source.y + vertexRadius * Math.sin(startAngle);

    const endAngle = Math.atan2(cpY - target.y, cpX - target.x);
    const endX = target.x + vertexRadius * Math.cos(endAngle);
    const endY = target.y + vertexRadius * Math.sin(endAngle);

    return { startX, startY, cpX, cpY, endX, endY };
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const currentPan = panRef.current;
    const currentZoom = zoomRef.current;
    const dh = dijkstraHighlightRef.current;
    const th = treeHighlightRef.current;
    const t = animTimeRef.current;
    const dpr = dprRef.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1;
    const gridSize = 40 * currentZoom;
    const offsetX = currentPan.x % gridSize;
    const offsetY = currentPan.y % gridSize;
    for (let x = offsetX; x < canvasSize.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasSize.height);
      ctx.stroke();
    }
    for (let y = offsetY; y < canvasSize.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasSize.width, y);
      ctx.stroke();
    }

    for (const graph of graphsToRender) {
      ctx.save();
      ctx.globalAlpha = graph.opacity;
      ctx.translate(currentPan.x + graph.offsetX * currentZoom, currentPan.y + graph.offsetY * currentZoom);
      ctx.scale(currentZoom, currentZoom);

      graph.edges.forEach((edge) => {
        const source = graph.vertices.find((v) => v.id === edge.source);
        const target = graph.vertices.find((v) => v.id === edge.target);
        if (!source || !target) return;
        const isActive = graph.id === activeGraphId;
        const isSelected = isActive && selectedEdgeIdsRef.current.includes(edge.id);

        let dijkstraEdgeState: "none" | "active" | "path" | "tree-mst" | "tree-span" = "none";
        if (dh && isActive) {
          if (dh.pathEdges.has(edge.id)) dijkstraEdgeState = "path";
          else if (dh.activeEdges.has(edge.id)) dijkstraEdgeState = "active";
        }
        if (th && isActive && th.treeEdges.has(edge.id)) {
          dijkstraEdgeState = th.type === "mst" ? "tree-mst" : "tree-span";
        }

        if (edge.source === edge.target) {
          drawLoop(ctx, source, edge, graph.directed, isSelected, isActive, graph.weighted, dijkstraEdgeState, t);
        } else {
          const isBidirectional = graph.directed && hasReverseEdge(graph, edge.source, edge.target);
          drawEdge(ctx, source, target, edge, graph.directed, isSelected, isActive, graph.weighted, dijkstraEdgeState, t, isBidirectional);
        }
      });

      if (graph.id === activeGraphId && isCreatingEdgeRef.current && edgeSourceVertexIdRef.current) {
        const sourceVertex = graph.vertices.find((v) => v.id === edgeSourceVertexIdRef.current);
        if (sourceVertex) {
          ctx.strokeStyle = "#22c55e";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(sourceVertex.x, sourceVertex.y);
          const mp = mousePosRef.current;
          const mx = (mp.x - currentPan.x - graph.offsetX * currentZoom) / currentZoom;
          const my = (mp.y - currentPan.y - graph.offsetY * currentZoom) / currentZoom;
          ctx.lineTo(mx, my);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      graph.vertices.forEach((vertex) => {
        const isActive = graph.id === activeGraphId;
        const isSelected = isActive && selectedVertexIdsRef.current.includes(vertex.id);
        const isEdgeSource = isActive && vertex.id === edgeSourceVertexIdRef.current;

        let dijkstraVertexState: "none" | "current" | "visited" | "path" | "start" | "target" | "tree-root" | "tree-node" = "none";
        if (dh && isActive) {
          if (dh.pathVertices.has(vertex.id)) {
            dijkstraVertexState = vertex.id === dh.targetVertex && dh.isFinished ? "target" : "path";
          } else if (vertex.id === dh.currentVertex) {
            dijkstraVertexState = "current";
          } else if (dh.visitedVertices.has(vertex.id)) {
            dijkstraVertexState = "visited";
          } else if (vertex.id === dh.startVertex) {
            dijkstraVertexState = "start";
          }
        }
        if (th && isActive) {
          if (vertex.id === th.rootVertex) dijkstraVertexState = "tree-root";
          else if (th.treeVertices.has(vertex.id)) dijkstraVertexState = "tree-node";
        }

        drawVertex(ctx, vertex, isSelected, isEdgeSource, isActive, dijkstraVertexState, t);
      });

      ctx.restore();
    }

  }, [graphsToRender, activeGraph, canvasSize, isCreatingEdge, edgeSourceVertexId, activeGraphId]);

  useEffect(() => {
    if (!dijkstraHighlight && !treeHighlight) {
      draw();
    }
  }, [draw, pan, zoom, mousePos, selectedVertexIds, selectedEdgeIds, dijkstraHighlight, treeHighlight]);

  function drawVertex(
    ctx: CanvasRenderingContext2D,
    vertex: Vertex,
    isSelected: boolean,
    isEdgeSource: boolean,
    isActive: boolean,
    dijkstraState: "none" | "current" | "visited" | "path" | "start" | "target" | "tree-root" | "tree-node",
    time: number,
  ) {
    const radius = 24;
    const pulse = Math.sin(time / 300) * 0.5 + 0.5;

    ctx.shadowBlur = 0;

    if (dijkstraState === "current") {
      ctx.shadowBlur = 20 + pulse * 20;
      ctx.shadowColor = "#22c55e";
    } else if (dijkstraState === "start") {
      ctx.shadowBlur = 15 + pulse * 10;
      ctx.shadowColor = "#22c55e";
    } else if (dijkstraState === "target") {
      ctx.shadowBlur = 20 + pulse * 20;
      ctx.shadowColor = "#22c55e";
    } else if (dijkstraState === "path") {
      ctx.shadowBlur = 15 + pulse * 10;
      ctx.shadowColor = "#22c55e";
    } else if (dijkstraState === "visited") {
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#3b82f6";
    } else if (dijkstraState === "tree-root") {
      ctx.shadowBlur = 20 + pulse * 15;
      ctx.shadowColor = "#f59e0b";
    } else if (dijkstraState === "tree-node") {
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#fbbf24";
    } else if (isSelected || isEdgeSource) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = isEdgeSource ? "#22c55e" : "#3b82f6";
    }

    ctx.beginPath();
    ctx.arc(vertex.x, vertex.y, radius, 0, Math.PI * 2);

    const gradient = ctx.createRadialGradient(vertex.x - 5, vertex.y - 5, 0, vertex.x, vertex.y, radius);

    if (dijkstraState === "current") {
      gradient.addColorStop(0, "#4ade80");
      gradient.addColorStop(1, "#15803d");
    } else if (dijkstraState === "start") {
      gradient.addColorStop(0, "#4ade80");
      gradient.addColorStop(1, "#16a34a");
    } else if (dijkstraState === "target") {
      gradient.addColorStop(0, "#4ade80");
      gradient.addColorStop(1, "#15803d");
    } else if (dijkstraState === "path") {
      gradient.addColorStop(0, "#34d399");
      gradient.addColorStop(1, "#059669");
    } else if (dijkstraState === "visited") {
      gradient.addColorStop(0, "#60a5fa");
      gradient.addColorStop(1, "#1d4ed8");
    } else if (dijkstraState === "tree-root") {
      gradient.addColorStop(0, "#fbbf24");
      gradient.addColorStop(1, "#b45309");
    } else if (dijkstraState === "tree-node") {
      gradient.addColorStop(0, "#fcd34d");
      gradient.addColorStop(1, "#d97706");
    } else if (isSelected) {
      gradient.addColorStop(0, "#60a5fa");
      gradient.addColorStop(1, "#2563eb");
    } else if (isEdgeSource) {
      gradient.addColorStop(0, "#4ade80");
      gradient.addColorStop(1, "#16a34a");
    } else if (!isActive) {
      gradient.addColorStop(0, vertex.color || "#6366f1");
      gradient.addColorStop(1, vertex.color ? adjustColor(vertex.color, -50) : "#312e81");
    } else {
      gradient.addColorStop(0, vertex.color || "#6366f1");
      gradient.addColorStop(1, vertex.color ? adjustColor(vertex.color, -30) : "#4f46e5");
    }

    ctx.fillStyle = gradient;
    ctx.fill();

    let strokeColor = isActive ? "#818cf8" : "#4b5563";
    if (dijkstraState === "current" || dijkstraState === "start" || dijkstraState === "target") strokeColor = "#86efac";
    else if (dijkstraState === "path") strokeColor = "#6ee7b7";
    else if (dijkstraState === "visited") strokeColor = "#93c5fd";
    else if (dijkstraState === "tree-root") strokeColor = "#fde68a";
    else if (dijkstraState === "tree-node") strokeColor = "#fcd34d";
    else if (isSelected) strokeColor = "#93c5fd";
    else if (isEdgeSource) strokeColor = "#86efac";

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = dijkstraState !== "none" ? 2.5 : 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(vertex.label, vertex.x, vertex.y);
  }

  function drawEdge(
    ctx: CanvasRenderingContext2D,
    source: Vertex,
    target: Vertex,
    edge: Edge,
    directed: boolean,
    isSelected: boolean,
    isActive: boolean,
    isWeighted: boolean,
    dijkstraState: "none" | "active" | "path" | "tree-mst" | "tree-span",
    time: number,
    isBidirectional: boolean = false,
  ) {
    const radius = 24;
    const pulse = Math.sin(time / 250) * 0.5 + 0.5;

    let edgeColor = isSelected ? "#3b82f6" : isActive ? "#6b7280" : "#374151";
    let lineWidth = isSelected ? 3 : 2;
    ctx.shadowBlur = 0;

    if (dijkstraState === "path") {
      edgeColor = "#22c55e";
      lineWidth = 3.5;
      ctx.shadowBlur = 8 + pulse * 8;
      ctx.shadowColor = "#22c55e";
    } else if (dijkstraState === "active") {
      edgeColor = "#3b82f6";
      lineWidth = 3;
      ctx.shadowBlur = 6 + pulse * 6;
      ctx.shadowColor = "#3b82f6";
    } else if (dijkstraState === "tree-mst") {
      edgeColor = "#f59e0b";
      lineWidth = 3.5;
      ctx.shadowBlur = 8 + pulse * 8;
      ctx.shadowColor = "#f59e0b";
    } else if (dijkstraState === "tree-span") {
      edgeColor = "#fbbf24";
      lineWidth = 3;
      ctx.shadowBlur = 6 + pulse * 6;
      ctx.shadowColor = "#fbbf24";
    }

    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = lineWidth;

    if (isBidirectional) {
      const { startX, startY, cpX, cpY, endX, endY } = getCurvedEdgePoints(source, target, radius);

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(cpX, cpY, endX, endY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (directed) {
        const arrowLength = 12;
        const arrowAngle = Math.PI / 6;
        const arrowDir = Math.atan2(endY - cpY, endX - cpX);
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - arrowLength * Math.cos(arrowDir - arrowAngle), endY - arrowLength * Math.sin(arrowDir - arrowAngle));
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - arrowLength * Math.cos(arrowDir + arrowAngle), endY - arrowLength * Math.sin(arrowDir + arrowAngle));
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      const labelX = 0.25 * startX + 0.5 * cpX + 0.25 * endX;
      const labelY = 0.25 * startY + 0.5 * cpY + 0.25 * endY;

      drawEdgeLabels(ctx, edge, isWeighted, isSelected, dijkstraState, labelX, labelY);
    } else {
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const angle = Math.atan2(dy, dx);

      const startX = source.x + radius * Math.cos(angle);
      const startY = source.y + radius * Math.sin(angle);
      const endX = target.x - radius * Math.cos(angle);
      const endY = target.y - radius * Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (directed) {
        const arrowLength = 12;
        const arrowAngle = Math.PI / 6;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - arrowLength * Math.cos(angle - arrowAngle), endY - arrowLength * Math.sin(angle - arrowAngle));
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - arrowLength * Math.cos(angle + arrowAngle), endY - arrowLength * Math.sin(angle + arrowAngle));
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      const perpX = -Math.sin(angle);
      const perpY = Math.cos(angle);
      const labelOffsetDist = 14;
      const labelX = midX + perpX * labelOffsetDist;
      const labelY = midY + perpY * labelOffsetDist;

      drawEdgeLabels(ctx, edge, isWeighted, isSelected, dijkstraState, labelX, labelY);
    }
  }

  function drawEdgeLabels(
    ctx: CanvasRenderingContext2D,
    edge: Edge,
    isWeighted: boolean,
    isSelected: boolean,
    dijkstraState: "none" | "active" | "path" | "tree-mst" | "tree-span",
    labelX: number,
    labelY: number,
  ) {
    const weightText = isWeighted && edge.weight !== undefined ? String(edge.weight) : null;
    const labelText = edge.label && edge.label !== "" ? edge.label : null;

    if (weightText) {
      ctx.font = "bold 12px Inter, system-ui, sans-serif";
      const textW = ctx.measureText(weightText).width;
      const padX = 6;
      const padY = 3;
      const bw = textW + padX * 2;
      const bh = 18;

      const bgFill =
        dijkstraState === "path"
          ? "rgba(34,197,94,0.25)"
          : dijkstraState === "active"
            ? "rgba(59,130,246,0.25)"
            : dijkstraState === "tree-mst"
              ? "rgba(245,158,11,0.3)"
              : dijkstraState === "tree-span"
                ? "rgba(251,191,36,0.25)"
                : "rgba(10,10,10,0.85)";
      const strokeC =
        dijkstraState === "path"
          ? "#22c55e"
          : dijkstraState === "active"
            ? "#3b82f6"
            : dijkstraState === "tree-mst"
              ? "#f59e0b"
              : dijkstraState === "tree-span"
                ? "#fbbf24"
                : isSelected
                  ? "#3b82f6"
                  : "#4b5563";
      const textC =
        dijkstraState === "path"
          ? "#4ade80"
          : dijkstraState === "active"
            ? "#93c5fd"
            : dijkstraState === "tree-mst"
              ? "#fde68a"
              : dijkstraState === "tree-span"
                ? "#fef3c7"
                : isSelected
                  ? "#60a5fa"
                  : "#e5e7eb";

      ctx.fillStyle = bgFill;
      ctx.strokeStyle = strokeC;
      ctx.lineWidth = 1.5;
      roundRect(ctx, labelX - bw / 2, labelY - bh / 2, bw, bh, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = textC;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(weightText, labelX, labelY);
    }

    if (labelText) {
      const labelY2 = weightText ? labelY + 18 : labelY;
      ctx.font = "11px Inter, system-ui, sans-serif";
      const textW2 = ctx.measureText(labelText).width;
      const padX2 = 4;
      const bw2 = textW2 + padX2 * 2;
      const bh2 = 15;

      ctx.fillStyle = "rgba(10,10,10,0.75)";
      ctx.strokeStyle = "#374151";
      ctx.lineWidth = 1;
      roundRect(ctx, labelX - bw2 / 2, labelY2 - bh2 / 2, bw2, bh2, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isSelected ? "#60a5fa" : "#9ca3af";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(labelText, labelX, labelY2);
    }
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawLoop(
    ctx: CanvasRenderingContext2D,
    vertex: Vertex,
    edge: Edge,
    directed: boolean,
    isSelected: boolean,
    isActive: boolean,
    isWeighted: boolean,
    dijkstraState: "none" | "active" | "path" | "tree-mst" | "tree-span",
    time: number,
  ) {
    const vertexRadius = 24;
    const loopRadius = 20;
    const loopCenterX = vertex.x + vertexRadius * 0.7;
    const loopCenterY = vertex.y - vertexRadius * 0.7;

    const pulse = Math.sin(time / 250) * 0.5 + 0.5;
    let edgeColor = isSelected ? "#3b82f6" : isActive ? "#6b7280" : "#374151";
    let lineWidth = isSelected ? 3 : 2;
    ctx.shadowBlur = 0;

    if (dijkstraState === "path") {
      edgeColor = "#22c55e";
      lineWidth = 3.5;
      ctx.shadowBlur = 8 + pulse * 8;
      ctx.shadowColor = "#22c55e";
    } else if (dijkstraState === "active") {
      edgeColor = "#3b82f6";
      lineWidth = 3;
      ctx.shadowBlur = 6 + pulse * 6;
      ctx.shadowColor = "#3b82f6";
    }

    ctx.beginPath();
    ctx.arc(loopCenterX, loopCenterY, loopRadius, 0, Math.PI * 2);
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (directed) {
      const arrowLength = 10;
      const arrowAngle = Math.PI / 6;
      const arrowX = loopCenterX - loopRadius * Math.cos(Math.PI / 4);
      const arrowY = loopCenterY + loopRadius * Math.sin(Math.PI / 4);
      const angle = Math.PI / 4 + Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(arrowX - arrowLength * Math.cos(angle - arrowAngle), arrowY - arrowLength * Math.sin(angle - arrowAngle));
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(arrowX - arrowLength * Math.cos(angle + arrowAngle), arrowY - arrowLength * Math.sin(angle + arrowAngle));
      ctx.strokeStyle = edgeColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    const weightText = isWeighted && edge.weight !== undefined ? String(edge.weight) : null;
    const labelText = edge.label && edge.label !== "" ? edge.label : null;
    const baseLabelX = loopCenterX + loopRadius + 8;
    const baseLabelY = loopCenterY;

    if (weightText) {
      ctx.font = "bold 12px Inter, system-ui, sans-serif";
      const textW = ctx.measureText(weightText).width;
      const padX = 6;
      const bw = textW + padX * 2;
      const bh = 18;
      ctx.fillStyle = "rgba(10,10,10,0.85)";
      ctx.strokeStyle = isSelected ? "#3b82f6" : "#4b5563";
      ctx.lineWidth = 1.5;
      roundRect(ctx, baseLabelX, baseLabelY - bh / 2, bw, bh, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = isSelected ? "#60a5fa" : "#e5e7eb";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(weightText, baseLabelX + padX, baseLabelY);
    }

    if (labelText) {
      const labelY2 = weightText ? baseLabelY + 20 : baseLabelY;
      ctx.font = "11px Inter, system-ui, sans-serif";
      const textW2 = ctx.measureText(labelText).width;
      const padX2 = 4;
      const bw2 = textW2 + padX2 * 2;
      const bh2 = 15;
      ctx.fillStyle = "rgba(10,10,10,0.75)";
      ctx.strokeStyle = "#374151";
      ctx.lineWidth = 1;
      roundRect(ctx, baseLabelX, labelY2 - bh2 / 2, bw2, bh2, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = isSelected ? "#60a5fa" : "#9ca3af";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(labelText, baseLabelX + padX2, labelY2);
    }
  }

  function adjustColor(color: string, amount: number): string {
    const hex = color.replace("#", "");
    const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  function getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function screenToGraph(screenX: number, screenY: number, graph: Graph): { x: number; y: number } {
    const currentPan = panRef.current;
    const currentZoom = zoomRef.current;
    return {
      x: (screenX - currentPan.x - graph.offsetX * currentZoom) / currentZoom,
      y: (screenY - currentPan.y - graph.offsetY * currentZoom) / currentZoom,
    };
  }

  function snapVertexPosition(x: number, y: number, graph: Graph): { x: number; y: number } {
    if (!gridSnapRef.current) return { x, y };
    const snappedX = Math.round((x + graph.offsetX) / GRID_SIZE) * GRID_SIZE - graph.offsetX;
    const snappedY = Math.round((y + graph.offsetY) / GRID_SIZE) * GRID_SIZE - graph.offsetY;
    return { x: snappedX, y: snappedY };
  }

  function snapGroupDelta(dx: number, dy: number, anchor: { x: number; y: number }, graph: Graph): { dx: number; dy: number } {
    if (!gridSnapRef.current) return { dx, dy };
    const targetX = anchor.x + dx + graph.offsetX;
    const targetY = anchor.y + dy + graph.offsetY;
    const snappedX = Math.round(targetX / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(targetY / GRID_SIZE) * GRID_SIZE;
    return {
      dx: snappedX - graph.offsetX - anchor.x,
      dy: snappedY - graph.offsetY - anchor.y,
    };
  }

  function snapshotSelectedVertices(graph: Graph): Map<string, { x: number; y: number }> {
    const snapshot = new Map<string, { x: number; y: number }>();
    for (const id of selectedVertexIdsRef.current) {
      const v = graph.vertices.find((vx) => vx.id === id);
      if (v) snapshot.set(id, { x: v.x, y: v.y });
    }
    return snapshot;
  }

  function getVertexAtPosition(screenX: number, screenY: number, graph?: Graph): { vertex: Vertex; graphId: string } | null {
    const currentPan = panRef.current;
    const currentZoom = zoomRef.current;
    const targetGraphs = graph ? [graph] : showAllGraphs ? graphsToRender : activeGraph ? [activeGraph] : [];
    const radius = 24;
    for (const g of [...targetGraphs].reverse()) {
      const local = {
        x: (screenX - currentPan.x - g.offsetX * currentZoom) / currentZoom,
        y: (screenY - currentPan.y - g.offsetY * currentZoom) / currentZoom,
      };
      for (let i = g.vertices.length - 1; i >= 0; i--) {
        const vertex = g.vertices[i];
        const dx = local.x - vertex.x;
        const dy = local.y - vertex.y;
        if (dx * dx + dy * dy <= radius * radius) {
          return { vertex, graphId: g.id };
        }
      }
    }
    return null;
  }

  /**
   * Distance from point (px,py) to a quadratic bezier curve P0->CP->P1.
   * Sampled at N steps for hit-testing.
   */
  function distanceToQuadraticBezier(
    px: number,
    py: number,
    p0x: number,
    p0y: number,
    cpx: number,
    cpy: number,
    p1x: number,
    p1y: number,
    steps = 30,
  ): number {
    let minDist = Infinity;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      const bx = mt * mt * p0x + 2 * mt * t * cpx + t * t * p1x;
      const by = mt * mt * p0y + 2 * mt * t * cpy + t * t * p1y;
      const d = Math.sqrt((px - bx) ** 2 + (py - by) ** 2);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  function getEdgeAtPosition(screenX: number, screenY: number, graph?: Graph): Edge | null {
    const currentPan = panRef.current;
    const currentZoom = zoomRef.current;
    const targetGraphs = graph ? [graph] : showAllGraphs ? graphsToRender : activeGraph ? [activeGraph] : [];
    const vertexRadius = 24;
    const loopRadius = 20;

    for (const g of targetGraphs) {
      const local = {
        x: (screenX - currentPan.x - g.offsetX * currentZoom) / currentZoom,
        y: (screenY - currentPan.y - g.offsetY * currentZoom) / currentZoom,
      };
      for (const edge of g.edges) {
        const source = g.vertices.find((v) => v.id === edge.source);
        const target = g.vertices.find((v) => v.id === edge.target);
        if (!source || !target) continue;

        if (edge.source === edge.target) {
          const loopCenterX = source.x + vertexRadius * 0.7;
          const loopCenterY = source.y - vertexRadius * 0.7;
          const dist = Math.sqrt((local.x - loopCenterX) ** 2 + (local.y - loopCenterY) ** 2);
          if (Math.abs(dist - loopRadius) < 8) return edge;
        } else {
          const isBidirectional = g.directed && hasReverseEdge(g, edge.source, edge.target);

          if (isBidirectional) {
            const { startX, startY, cpX, cpY, endX, endY } = getCurvedEdgePoints(source, target, vertexRadius);
            const d = distanceToQuadraticBezier(local.x, local.y, startX, startY, cpX, cpY, endX, endY);
            if (d < 12) return edge;
          } else {
            const d = distanceToLineSegment(local.x, local.y, source.x, source.y, target.x, target.y);
            if (d < 10) return edge;
          }
        }
      }
    }
    return null;
  }

  function distanceToLineSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1,
      dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
    return Math.sqrt((px - (x1 + t * dx)) ** 2 + (py - (y1 + t * dy)) ** 2);
  }

  function getVerticesInRect(x1: number, y1: number, x2: number, y2: number): string[] {
    const currentPan = panRef.current;
    const currentZoom = zoomRef.current;
    if (!activeGraph) return [];
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    const result: string[] = [];
    for (const vertex of activeGraph.vertices) {
      const sx = currentPan.x + (activeGraph.offsetX + vertex.x) * currentZoom;
      const sy = currentPan.y + (activeGraph.offsetY + vertex.y) * currentZoom;
      if (sx >= minX && sx <= maxX && sy >= minY && sy <= maxY) {
        result.push(vertex.id);
      }
    }
    return result;
  }

  function getGraphContainingPoint(screenX: number, screenY: number): Graph | null {
    const currentPan = panRef.current;
    const currentZoom = zoomRef.current;
    const candidates = graphsToRender.filter((g) => g.id !== activeGraphId);
    for (const g of [...candidates].reverse()) {
      if (!g.vertices.length) continue;
      const local = {
        x: (screenX - currentPan.x - g.offsetX * currentZoom) / currentZoom,
        y: (screenY - currentPan.y - g.offsetY * currentZoom) / currentZoom,
      };
      const xs = g.vertices.map((v) => v.x);
      const ys = g.vertices.map((v) => v.y);
      const pad = VERTEX_RADIUS;
      if (
        local.x >= Math.min(...xs) - pad &&
        local.x <= Math.max(...xs) + pad &&
        local.y >= Math.min(...ys) - pad &&
        local.y <= Math.max(...ys) + pad
      ) {
        return g;
      }
    }
    return null;
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (readOnly) return;
    const pos = getCanvasPos(e.clientX, e.clientY);
    mousePosRef.current = pos;
    setMousePos(pos);

    if (e.button === 1) {
      setIsPanning(true);
      panStart.current = { x: pos.x - panRef.current.x, y: pos.y - panRef.current.y };
      return;
    }

    if (e.button !== 0) return;

    if (isCreatingEdgeRef.current) {
      const hitResult = getVertexAtPosition(pos.x, pos.y, activeGraph || undefined);
      if (hitResult && edgeSourceVertexIdRef.current) {
        addEdge(edgeSourceVertexIdRef.current, hitResult.vertex.id);
      }
      cancelEdgeCreationLocal();
      return;
    }

    const hitResult = getVertexAtPosition(pos.x, pos.y);

    if (hitResult && hitResult.graphId !== activeGraphId) {
      setActiveGraph(hitResult.graphId);
      return;
    }

    const edge = getEdgeAtPosition(pos.x, pos.y, activeGraph || undefined);

    if (hitResult) {
      const vertexId = hitResult.vertex.id;
      const alreadySelected = selectedVertexIdsRef.current.includes(vertexId);

      if (alreadySelected && selectedVertexIdsRef.current.length > 1) {
        setIsMovingSelection(true);
        isMovingSelectionRef.current = true;
        moveStart.current = pos;
        if (activeGraph) movingVerticesStartRef.current = snapshotSelectedVertices(activeGraph);
        dragHistoryPushedRef.current = false;
      } else {
        selectVertex(vertexId, e.shiftKey);
        setIsDragging(true);
        dragVertexRef.current = vertexId;
        setDragVertex(vertexId);
        dragHistoryPushedRef.current = false;
        dragOriginRef.current = pos;
      }
    } else if (edge) {
      selectEdge(edge.id, e.shiftKey);
    } else {
      const targetGraph = getGraphContainingPoint(pos.x, pos.y);
      if (targetGraph) {
        setActiveGraph(targetGraph.id);
        return;
      }
      clearSelection();
      setIsPanning(true);
      panStart.current = { x: pos.x - panRef.current.x, y: pos.y - panRef.current.y };
    }
  }

  function handleDoubleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (readOnly) return;
    const pos = getCanvasPos(e.clientX, e.clientY);

    cancelEdgeCreationLocal();

    const hitResult = getVertexAtPosition(pos.x, pos.y);
    if (hitResult) {
      if (hitResult.graphId !== activeGraphId) setActiveGraph(hitResult.graphId);
      onVertexDoubleClick?.(hitResult.vertex.id, e.clientX, e.clientY);
      return;
    }

    const edge = getEdgeAtPosition(pos.x, pos.y, activeGraph || undefined);
    if (edge) {
      onEdgeDoubleClick?.(edge.id, e.clientX, e.clientY);
      return;
    }

    if (activeGraph) {
      const local = screenToGraph(pos.x, pos.y, activeGraph);
      onCanvasDoubleClick?.(local.x, local.y, e.clientX, e.clientY);
    }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const pos = getCanvasPos(e.clientX, e.clientY);
    mousePosRef.current = pos;
    setMousePos(pos);

    if (isPanning) {
      const newPan = { x: pos.x - panStart.current.x, y: pos.y - panStart.current.y };
      setPan(newPan);
      panRef.current = newPan;
      if (viewportRef) viewportRef.current = { pan: newPan, zoom: zoomRef.current };
      draw();
      return;
    }

    if (isMovingSelectionRef.current && activeGraph && movingVerticesStartRef.current) {
      const totalDx = (pos.x - moveStart.current.x) / zoomRef.current;
      const totalDy = (pos.y - moveStart.current.y) / zoomRef.current;
      const anchorId = selectedVertexIdsRef.current[0];
      const anchor = movingVerticesStartRef.current.get(anchorId);
      const { dx, dy } = anchor
        ? snapGroupDelta(totalDx, totalDy, anchor, activeGraph)
        : { dx: totalDx, dy: totalDy };
      if ((dx !== 0 || dy !== 0) && !dragHistoryPushedRef.current) {
        pushHistory();
        dragHistoryPushedRef.current = true;
      }
      const store = useGraphStore.getState();
      for (const [id, start] of movingVerticesStartRef.current) {
        store.moveVertex(id, start.x + dx, start.y + dy);
      }
      return;
    }

    if (isDragging && dragVertexRef.current && activeGraph) {
      const local = screenToGraph(pos.x, pos.y, activeGraph);
      const snapped = snapVertexPosition(local.x, local.y, activeGraph);
      const origin = dragOriginRef.current;
      const moved = !origin || Math.abs(pos.x - origin.x) > 1 || Math.abs(pos.y - origin.y) > 1;
      if (moved && !dragHistoryPushedRef.current) {
        pushHistory();
        dragHistoryPushedRef.current = true;
      }
      moveVertex(dragVertexRef.current, snapped.x, snapped.y);
    }
  }

  function handleMouseUp() {
    setIsDragging(false);
    dragVertexRef.current = null;
    setDragVertex(null);

    setIsPanning(false);
    setIsMovingSelection(false);
    isMovingSelectionRef.current = false;
    movingVerticesStartRef.current = null;
    dragHistoryPushedRef.current = false;
    dragOriginRef.current = null;
  }

  function handleContextMenu(e: React.MouseEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (readOnly) return;

    if (isCreatingEdgeRef.current) {
      cancelEdgeCreationLocal();
      return;
    }

    const pos = getCanvasPos(e.clientX, e.clientY);

    const hitResult = getVertexAtPosition(pos.x, pos.y);
    if (hitResult) {
      if (hitResult.graphId !== activeGraphId) setActiveGraph(hitResult.graphId);
      onVertexDoubleClick?.(hitResult.vertex.id, e.clientX, e.clientY);
      return;
    }

    const edge = getEdgeAtPosition(pos.x, pos.y, activeGraph || undefined);
    if (edge) {
      onEdgeDoubleClick?.(edge.id, e.clientX, e.clientY);
      return;
    }

    if (activeGraph) {
      const local = screenToGraph(pos.x, pos.y, activeGraph);
      onCanvasDoubleClick?.(local.x, local.y, e.clientX, e.clientY);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (readOnly) return;
    if (e.key === "Delete" || e.key === "Backspace") {
      selectedVertexIds.forEach((id) => deleteVertex(id));
      selectedEdgeIds.forEach((id) => deleteEdge(id));
    }
    if (e.key === "Escape") {
      cancelEdgeCreationLocal();
      clearSelection();
    }
  }

  function handleWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const pos = getCanvasPos(e.clientX, e.clientY);
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const oldZoom = zoomRef.current;
    const newZoom = Math.max(0.1, Math.min(3, oldZoom + delta));

    const scaleRatio = newZoom / oldZoom;
    const newPanX = pos.x - scaleRatio * (pos.x - panRef.current.x);
    const newPanY = pos.y - scaleRatio * (pos.y - panRef.current.y);
    setPan({ x: newPanX, y: newPanY });
    panRef.current = { x: newPanX, y: newPanY };
    setZoom(newZoom);
  }

  function getTouchPos(touch: React.Touch): { x: number; y: number } {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }

  function getPinchDistance(t1: React.Touch, t2: React.Touch): number {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function handleTouchStart(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (readOnly) return;

    if (e.touches.length === 2) {
      touchActionRef.current = "pinch";
      pinchStartDistRef.current = getPinchDistance(e.touches[0], e.touches[1]);
      pinchStartZoomRef.current = zoomRef.current;
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const pos = getTouchPos(touch);
      touchStartRef.current = pos;
      lastTouchRef.current = pos;
      mousePosRef.current = pos;
      setMousePos(pos);
      touchActionRef.current = "none";

      if (isCreatingEdgeRef.current) {
        const hitResult = getVertexAtPosition(pos.x, pos.y, activeGraph || undefined);
        if (hitResult && edgeSourceVertexIdRef.current) {
          addEdge(edgeSourceVertexIdRef.current, hitResult.vertex.id);
        }
        cancelEdgeCreationLocal();
        return;
      }

      const hitResult = getVertexAtPosition(pos.x, pos.y);
      if (hitResult && hitResult.graphId !== activeGraphId) {
        setActiveGraph(hitResult.graphId);
        return;
      }

      const edge = getEdgeAtPosition(pos.x, pos.y, activeGraph || undefined);

      if (hitResult) {
        const vertexId = hitResult.vertex.id;
        const alreadySelected = selectedVertexIdsRef.current.includes(vertexId);
        if (alreadySelected && selectedVertexIdsRef.current.length > 1) {
          setIsMovingSelection(true);
          isMovingSelectionRef.current = true;
          moveStart.current = pos;
          if (activeGraph) movingVerticesStartRef.current = snapshotSelectedVertices(activeGraph);
          dragHistoryPushedRef.current = false;
        } else {
          selectVertex(vertexId, false);
          setIsDragging(true);
          dragVertexRef.current = vertexId;
          setDragVertex(vertexId);
          dragHistoryPushedRef.current = false;
          dragOriginRef.current = pos;
        }
      } else if (edge) {
        selectEdge(edge.id, false);
      } else {
        clearSelection();
      }
    }
  }

  function handleTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();

    if (e.touches.length === 2 && touchActionRef.current === "pinch") {
      const dist = getPinchDistance(e.touches[0], e.touches[1]);
      if (pinchStartDistRef.current !== null) {
        const ratio = dist / pinchStartDistRef.current;
        const newZoom = Math.max(0.1, Math.min(3, pinchStartZoomRef.current * ratio));

        const mx = (getTouchPos(e.touches[0]).x + getTouchPos(e.touches[1]).x) / 2;
        const my = (getTouchPos(e.touches[0]).y + getTouchPos(e.touches[1]).y) / 2;
        const scaleRatio = newZoom / zoomRef.current;
        const newPanX = mx - scaleRatio * (mx - panRef.current.x);
        const newPanY = my - scaleRatio * (my - panRef.current.y);
        setPan({ x: newPanX, y: newPanY });
        panRef.current = { x: newPanX, y: newPanY };
        setZoom(newZoom);
      }
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const pos = getTouchPos(touch);
      mousePosRef.current = pos;
      setMousePos(pos);

      if (touchActionRef.current === "pan") {
        const newPan = { x: pos.x - panStart.current.x, y: pos.y - panStart.current.y };
        setPan(newPan);
        panRef.current = newPan;
        if (viewportRef) viewportRef.current = { pan: newPan, zoom: zoomRef.current };
        draw();
        lastTouchRef.current = pos;
        return;
      }

      if (isMovingSelectionRef.current && activeGraph && movingVerticesStartRef.current) {
        const totalDx = (pos.x - moveStart.current.x) / zoomRef.current;
        const totalDy = (pos.y - moveStart.current.y) / zoomRef.current;
        const anchorId = selectedVertexIdsRef.current[0];
        const anchor = movingVerticesStartRef.current.get(anchorId);
        const { dx, dy } = anchor
          ? snapGroupDelta(totalDx, totalDy, anchor, activeGraph)
          : { dx: totalDx, dy: totalDy };
        if ((dx !== 0 || dy !== 0) && !dragHistoryPushedRef.current) {
          pushHistory();
          dragHistoryPushedRef.current = true;
        }
        const store = useGraphStore.getState();
        for (const [id, start] of movingVerticesStartRef.current) {
          store.moveVertex(id, start.x + dx, start.y + dy);
        }
        lastTouchRef.current = pos;
        return;
      }

      if (isDragging && dragVertexRef.current && activeGraph) {
        const local = screenToGraph(pos.x, pos.y, activeGraph);
        const snapped = snapVertexPosition(local.x, local.y, activeGraph);
        const origin = dragOriginRef.current;
        const moved = !origin || Math.abs(pos.x - origin.x) > 1 || Math.abs(pos.y - origin.y) > 1;
        if (moved && !dragHistoryPushedRef.current) {
          pushHistory();
          dragHistoryPushedRef.current = true;
        }
        moveVertex(dragVertexRef.current, snapped.x, snapped.y);
        lastTouchRef.current = pos;
        return;
      }

      if (touchStartRef.current && touchActionRef.current === "none") {
        const dx = pos.x - touchStartRef.current.x;
        const dy = pos.y - touchStartRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > 8) {
          touchActionRef.current = "pan";
          panStart.current = { x: touchStartRef.current.x - panRef.current.x, y: touchStartRef.current.y - panRef.current.y };
        }
      }

      lastTouchRef.current = pos;
    }
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();

    if (e.touches.length === 0) {
      touchActionRef.current = "none";
      pinchStartDistRef.current = null;
      setIsDragging(false);
      dragVertexRef.current = null;
      setDragVertex(null);
      setIsMovingSelection(false);
      isMovingSelectionRef.current = false;
      lastTouchRef.current = null;
      touchStartRef.current = null;
      movingVerticesStartRef.current = null;
      dragHistoryPushedRef.current = false;
      dragOriginRef.current = null;
    }
  }

  let cursorStyle = "default";
  if (isCreatingEdge) {
    cursorStyle = "crosshair";
  } else if (isPanning) {
    cursorStyle = "grabbing";
  } else if (isDragging || isMovingSelection) {
    cursorStyle = "move";
  }

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-75 bg-background rounded-lg overflow-hidden border border-border">
      <canvas
        ref={canvasRef}
        style={{ cursor: cursorStyle, touchAction: "none", width: canvasSize.width, height: canvasSize.height }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        tabIndex={0}
      />
      {graphsToRender.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">Nenhum grafo selecionado</div>
      )}
    </div>
  );
});

GraphCanvas.displayName = "GraphCanvas";
