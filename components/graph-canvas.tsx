"use client";

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { useGraphStore } from "@/lib/graph-store";
import type { Vertex, Edge, Graph } from "@/lib/graph-types";

interface GraphCanvasProps {
  graphId?: string;
  readOnly?: boolean;
  width?: number;
  height?: number;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  showAllGraphs?: boolean;
}

export interface GraphCanvasRef {
  resetView: () => void;
  exportImage: (format: "png" | "jpeg") => void;
}

export const GraphCanvas = forwardRef<GraphCanvasRef, GraphCanvasProps>(function GraphCanvas(
  { graphId, readOnly = false, width = 800, height = 600, zoom: externalZoom, onZoomChange, showAllGraphs = false },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width, height });
  const [isDragging, setIsDragging] = useState(false);
  const [dragVertex, setDragVertex] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [internalZoom, setInternalZoom] = useState(1);

  const [isDraggingGraph, setIsDraggingGraph] = useState(false);
  const [draggingGraphId, setDraggingGraphId] = useState<string | null>(null);
  const [graphDragStart, setGraphDragStart] = useState({ x: 0, y: 0, ox: 0, oy: 0 });

  const zoom = externalZoom ?? internalZoom;
  const setZoom = useCallback(
    (newZoom: number) => {
      const clampedZoom = Math.max(0.1, Math.min(3, newZoom));
      setInternalZoom(clampedZoom);
      onZoomChange?.(clampedZoom);
    },
    [onZoomChange],
  );

  useImperativeHandle(
    ref,
    () => ({
      resetView: () => {
        setPan({ x: 0, y: 0 });
        setZoom(1);
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
          ctx2.drawImage(canvas, 0, 0);
          link.href = offscreen.toDataURL("image/jpeg", 0.95);
        } else {
          link.href = canvas.toDataURL("image/png");
        }
        link.click();
      },
    }),
    [setZoom],
  );

  const {
    graphs,
    activeGraphId,
    selectedVertexIds,
    selectedEdgeIds,
    tool,
    isCreatingEdge,
    edgeSourceId,
    addVertex,
    moveVertex,
    addEdge,
    deleteVertex,
    deleteEdge,
    selectVertex,
    selectEdge,
    clearSelection,
    startEdgeCreation,
    cancelEdgeCreation,
    moveGraphOffset,
  } = useGraphStore();

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

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1;
    const gridSize = 40 * zoom;
    const offsetX = pan.x % gridSize;
    const offsetY = pan.y % gridSize;
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
      ctx.translate(pan.x + graph.offsetX * zoom, pan.y + graph.offsetY * zoom);
      ctx.scale(zoom, zoom);

      graph.edges.forEach((edge) => {
        const source = graph.vertices.find((v) => v.id === edge.source);
        const target = graph.vertices.find((v) => v.id === edge.target);
        if (!source || !target) return;

        const isActive = graph.id === activeGraphId;
        const isSelected = isActive && selectedEdgeIds.includes(edge.id);

        if (edge.source === edge.target) {
          drawLoop(ctx, source, edge, graph.directed, isSelected, isActive);
        } else {
          drawEdge(ctx, source, target, edge, graph.directed, isSelected, isActive);
        }
      });

      if (graph.id === activeGraphId && isCreatingEdge && edgeSourceId) {
        const sourceVertex = graph.vertices.find((v) => v.id === edgeSourceId);
        if (sourceVertex) {
          ctx.strokeStyle = "#22c55e";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(sourceVertex.x, sourceVertex.y);

          const mx = (mousePos.x - pan.x - graph.offsetX * zoom) / zoom;
          const my = (mousePos.y - pan.y - graph.offsetY * zoom) / zoom;
          ctx.lineTo(mx, my);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      graph.vertices.forEach((vertex) => {
        const isActive = graph.id === activeGraphId;
        const isSelected = isActive && selectedVertexIds.includes(vertex.id);
        const isEdgeSource = isActive && vertex.id === edgeSourceId;
        drawVertex(ctx, vertex, isSelected, isEdgeSource, isActive);
      });

      ctx.restore();
    }

    if (showAllGraphs && activeGraph && tool === "pan") {
      ctx.save();
      ctx.globalAlpha = 0.6;
      const handleX = pan.x + activeGraph.offsetX * zoom;
      const handleY = pan.y + activeGraph.offsetY * zoom;
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(handleX - 8, handleY - 8, 16, 16);
      ctx.setLineDash([]);
      ctx.restore();
    }
  }, [
    graphsToRender,
    activeGraph,
    canvasSize,
    pan,
    zoom,
    selectedVertexIds,
    selectedEdgeIds,
    isCreatingEdge,
    edgeSourceId,
    mousePos,
    activeGraphId,
    tool,
    showAllGraphs,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  function drawVertex(ctx: CanvasRenderingContext2D, vertex: Vertex, isSelected: boolean, isEdgeSource: boolean, isActive: boolean) {
    const radius = 24;

    if (isSelected || isEdgeSource) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = isEdgeSource ? "#22c55e" : "#3b82f6";
    }

    ctx.beginPath();
    ctx.arc(vertex.x, vertex.y, radius, 0, Math.PI * 2);

    const gradient = ctx.createRadialGradient(vertex.x - 5, vertex.y - 5, 0, vertex.x, vertex.y, radius);
    if (isSelected) {
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

    ctx.strokeStyle = isSelected ? "#93c5fd" : isEdgeSource ? "#86efac" : isActive ? "#818cf8" : "#4b5563";
    ctx.lineWidth = 2;
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
  ) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const angle = Math.atan2(dy, dx);
    const radius = 24;

    const startX = source.x + radius * Math.cos(angle);
    const startY = source.y + radius * Math.sin(angle);
    const endX = target.x - radius * Math.cos(angle);
    const endY = target.y - radius * Math.sin(angle);

    const edgeColor = isSelected ? "#3b82f6" : isActive ? "#6b7280" : "#374151";

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.stroke();

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
    const labelText = edge.weight !== undefined ? `${edge.label || ""} (${edge.weight})` : edge.label || "";

    if (labelText) {
      ctx.fillStyle = "#0a0a0a";
      const textMetrics = ctx.measureText(labelText);
      const padding = 4;
      ctx.fillRect(midX - textMetrics.width / 2 - padding, midY - 8 - padding, textMetrics.width + padding * 2, 16 + padding * 2);

      ctx.fillStyle = isSelected ? "#60a5fa" : "#9ca3af";
      ctx.font = "12px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(labelText, midX, midY);
    }
  }

  function drawLoop(ctx: CanvasRenderingContext2D, vertex: Vertex, edge: Edge, directed: boolean, isSelected: boolean, isActive: boolean) {
    const vertexRadius = 24;
    const loopRadius = 20;

    const loopCenterX = vertex.x + vertexRadius * 0.7;
    const loopCenterY = vertex.y - vertexRadius * 0.7;

    const edgeColor = isSelected ? "#3b82f6" : isActive ? "#6b7280" : "#374151";

    ctx.beginPath();
    ctx.arc(loopCenterX, loopCenterY, loopRadius, 0, Math.PI * 2);
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.stroke();

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

    const labelText = edge.weight !== undefined ? `${edge.label || ""} (${edge.weight})` : edge.label || "";

    if (labelText) {
      const labelX = loopCenterX + loopRadius + 5;
      const labelY = loopCenterY;

      ctx.fillStyle = "#0a0a0a";
      const textMetrics = ctx.measureText(labelText);
      const padding = 4;
      ctx.fillRect(labelX - padding, labelY - 8 - padding, textMetrics.width + padding * 2, 16 + padding * 2);

      ctx.fillStyle = isSelected ? "#60a5fa" : "#9ca3af";
      ctx.font = "12px Inter, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(labelText, labelX, labelY);
    }
  }

  function adjustColor(color: string, amount: number): string {
    const hex = color.replace("#", "");
    const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  function getMousePosition(e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function screenToGraph(screenX: number, screenY: number, graph: Graph): { x: number; y: number } {
    return {
      x: (screenX - pan.x - graph.offsetX * zoom) / zoom,
      y: (screenY - pan.y - graph.offsetY * zoom) / zoom,
    };
  }

  function getVertexAtPosition(x: number, y: number, graph?: Graph): Vertex | null {
    const targetGraphs = graph ? [graph] : showAllGraphs ? graphsToRender : activeGraph ? [activeGraph] : [];
    const radius = 24;

    for (const g of [...targetGraphs].reverse()) {
      const local = screenToGraph(x, y, g);
      for (let i = g.vertices.length - 1; i >= 0; i--) {
        const vertex = g.vertices[i];
        const dx = local.x - vertex.x;
        const dy = local.y - vertex.y;
        if (dx * dx + dy * dy <= radius * radius) {
          return vertex;
        }
      }
    }
    return null;
  }

  function getEdgeAtPosition(x: number, y: number, graph?: Graph): Edge | null {
    const targetGraphs = graph ? [graph] : showAllGraphs ? graphsToRender : activeGraph ? [activeGraph] : [];
    const vertexRadius = 24;
    const loopRadius = 20;

    for (const g of targetGraphs) {
      const local = screenToGraph(x, y, g);
      for (const edge of g.edges) {
        const source = g.vertices.find((v) => v.id === edge.source);
        const target = g.vertices.find((v) => v.id === edge.target);
        if (!source || !target) continue;

        if (edge.source === edge.target) {
          const loopCenterX = source.x + vertexRadius * 0.7;
          const loopCenterY = source.y - vertexRadius * 0.7;
          const distToLoopCenter = Math.sqrt((local.x - loopCenterX) ** 2 + (local.y - loopCenterY) ** 2);
          if (Math.abs(distToLoopCenter - loopRadius) < 8) return edge;
        } else {
          const dist = distanceToLineSegment(local.x, local.y, source.x, source.y, target.x, target.y);
          if (dist < 10) return edge;
        }
      }
    }
    return null;
  }

  function distanceToLineSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
    const nearestX = x1 + t * dx;
    const nearestY = y1 + t * dy;
    return Math.sqrt((px - nearestX) ** 2 + (py - nearestY) ** 2);
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (readOnly) return;

    const pos = getMousePosition(e);
    setMousePos(pos);

    if (e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: pos.x - pan.x, y: pos.y - pan.y });
      return;
    }

    if (tool === "pan" && showAllGraphs && activeGraph) {
      const vertexOnActive = getVertexAtPosition(pos.x, pos.y, activeGraph);
      if (!vertexOnActive) {
        setIsDraggingGraph(true);
        setDraggingGraphId(activeGraph.id);
        setGraphDragStart({ x: pos.x, y: pos.y, ox: activeGraph.offsetX, oy: activeGraph.offsetY });
        return;
      }
    }

    if (tool === "pan") {
      setIsPanning(true);
      setPanStart({ x: pos.x - pan.x, y: pos.y - pan.y });
      return;
    }

    const vertex = getVertexAtPosition(pos.x, pos.y, activeGraph || undefined);
    const edge = getEdgeAtPosition(pos.x, pos.y, activeGraph || undefined);

    switch (tool) {
      case "select":
        if (vertex) {
          selectVertex(vertex.id, e.shiftKey);
          setIsDragging(true);
          setDragVertex(vertex.id);
        } else if (edge) {
          selectEdge(edge.id, e.shiftKey);
        } else {
          clearSelection();
        }
        break;

      case "vertex":
        if (!vertex && activeGraph) {
          const local = screenToGraph(pos.x, pos.y, activeGraph);
          addVertex(local.x, local.y);
        }
        break;

      case "edge":
        if (vertex) {
          if (isCreatingEdge && edgeSourceId) {
            addEdge(edgeSourceId, vertex.id);
            cancelEdgeCreation();
          } else {
            startEdgeCreation(vertex.id);
          }
        } else {
          cancelEdgeCreation();
        }
        break;

      case "delete":
        if (vertex) {
          deleteVertex(vertex.id);
        } else if (edge) {
          deleteEdge(edge.id);
        }
        break;
    }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const pos = getMousePosition(e);
    setMousePos(pos);

    if (isPanning) {
      setPan({
        x: pos.x - panStart.x,
        y: pos.y - panStart.y,
      });
      return;
    }

    if (isDraggingGraph && draggingGraphId) {
      const dx = (pos.x - graphDragStart.x) / zoom;
      const dy = (pos.y - graphDragStart.y) / zoom;
      const store = useGraphStore.getState();
      store.setGraphOffset(draggingGraphId, graphDragStart.ox + dx, graphDragStart.oy + dy);
      return;
    }

    if (isDragging && dragVertex && !readOnly && activeGraph) {
      const local = screenToGraph(pos.x, pos.y, activeGraph);
      moveVertex(dragVertex, local.x, local.y);
    }
  }

  function handleMouseUp() {
    setIsDragging(false);
    setDragVertex(null);
    setIsPanning(false);
    setIsDraggingGraph(false);
    setDraggingGraphId(null);
  }

  function handleContextMenu(e: React.MouseEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (isCreatingEdge) {
      cancelEdgeCreation();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (readOnly) return;

    if (e.key === "Delete" || e.key === "Backspace") {
      selectedVertexIds.forEach((id) => deleteVertex(id));
      selectedEdgeIds.forEach((id) => deleteEdge(id));
    }

    if (e.key === "Escape") {
      cancelEdgeCreation();
      clearSelection();
    }
  }

  function handleWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(zoom + delta);
  }

  let cursorStyle = "crosshair";
  if (tool === "pan") cursorStyle = isDraggingGraph || isPanning ? "grabbing" : "grab";
  else if (tool === "delete") cursorStyle = "pointer";

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-75 bg-background rounded-lg overflow-hidden border border-border">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{ cursor: cursorStyle }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        tabIndex={0}
      />
      {graphsToRender.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">Nenhum grafo selecionado</div>
      )}
    </div>
  );
});

GraphCanvas.displayName = "GraphCanvas";
