"use client";

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { useGraphStore } from "@/lib/graph-store";
import type { Vertex, Edge } from "@/lib/graph-types";

interface GraphCanvasProps {
  graphId?: string;
  readOnly?: boolean;
  width?: number;
  height?: number;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
}

export interface GraphCanvasRef {
  resetView: () => void;
}

export const GraphCanvas = forwardRef<GraphCanvasRef, GraphCanvasProps>(function GraphCanvas(
  { graphId, readOnly = false, width = 800, height = 600, zoom: externalZoom, onZoomChange },
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
  } = useGraphStore();

  const targetGraphId = graphId || activeGraphId;
  const graph = graphs.find((g) => g.id === targetGraphId);

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
    if (!canvas || !graph) return;

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

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    graph.edges.forEach((edge) => {
      const source = graph.vertices.find((v) => v.id === edge.source);
      const target = graph.vertices.find((v) => v.id === edge.target);
      if (!source || !target) return;

      const isSelected = selectedEdgeIds.includes(edge.id);

      if (edge.source === edge.target) {
        drawLoop(ctx, source, edge, graph.directed, isSelected);
      } else {
        drawEdge(ctx, source, target, edge, graph.directed, isSelected);
      }
    });

    if (isCreatingEdge && edgeSourceId) {
      const sourceVertex = graph.vertices.find((v) => v.id === edgeSourceId);
      if (sourceVertex) {
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(sourceVertex.x, sourceVertex.y);
        ctx.lineTo(mousePos.x - pan.x, mousePos.y - pan.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    graph.vertices.forEach((vertex) => {
      const isSelected = selectedVertexIds.includes(vertex.id);
      const isEdgeSource = vertex.id === edgeSourceId;
      drawVertex(ctx, vertex, isSelected, isEdgeSource);
    });

    ctx.restore();
  }, [graph, canvasSize, pan, zoom, selectedVertexIds, selectedEdgeIds, isCreatingEdge, edgeSourceId, mousePos]);

  useEffect(() => {
    draw();
  }, [draw]);

  function drawVertex(ctx: CanvasRenderingContext2D, vertex: Vertex, isSelected: boolean, isEdgeSource: boolean) {
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
    } else {
      gradient.addColorStop(0, vertex.color || "#6366f1");
      gradient.addColorStop(1, vertex.color ? adjustColor(vertex.color, -30) : "#4f46e5");
    }
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = isSelected ? "#93c5fd" : isEdgeSource ? "#86efac" : "#818cf8";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.shadowBlur = 0;

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(vertex.label, vertex.x, vertex.y);
  }

  function drawEdge(ctx: CanvasRenderingContext2D, source: Vertex, target: Vertex, edge: Edge, directed: boolean, isSelected: boolean) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const angle = Math.atan2(dy, dx);
    const radius = 24;

    const startX = source.x + radius * Math.cos(angle);
    const startY = source.y + radius * Math.sin(angle);
    const endX = target.x - radius * Math.cos(angle);
    const endY = target.y - radius * Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = isSelected ? "#3b82f6" : "#6b7280";
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
      ctx.strokeStyle = isSelected ? "#3b82f6" : "#6b7280";
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

  function drawLoop(ctx: CanvasRenderingContext2D, vertex: Vertex, edge: Edge, directed: boolean, isSelected: boolean) {
    const vertexRadius = 24;
    const loopRadius = 20;

    const loopCenterX = vertex.x + vertexRadius * 0.7;
    const loopCenterY = vertex.y - vertexRadius * 0.7;

    ctx.beginPath();
    ctx.arc(loopCenterX, loopCenterY, loopRadius, 0, Math.PI * 2);
    ctx.strokeStyle = isSelected ? "#3b82f6" : "#6b7280";
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
      ctx.strokeStyle = isSelected ? "#3b82f6" : "#6b7280";
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

  function getVertexAtPosition(x: number, y: number): Vertex | null {
    if (!graph) return null;
    const adjustedX = (x - pan.x) / zoom;
    const adjustedY = (y - pan.y) / zoom;
    const radius = 24;

    for (let i = graph.vertices.length - 1; i >= 0; i--) {
      const vertex = graph.vertices[i];
      const dx = adjustedX - vertex.x;
      const dy = adjustedY - vertex.y;
      if (dx * dx + dy * dy <= radius * radius) {
        return vertex;
      }
    }
    return null;
  }

  function getEdgeAtPosition(x: number, y: number): Edge | null {
    if (!graph) return null;
    const adjustedX = (x - pan.x) / zoom;
    const adjustedY = (y - pan.y) / zoom;
    const vertexRadius = 24;
    const loopRadius = 20;

    for (const edge of graph.edges) {
      const source = graph.vertices.find((v) => v.id === edge.source);
      const target = graph.vertices.find((v) => v.id === edge.target);
      if (!source || !target) continue;

      if (edge.source === edge.target) {
        const loopCenterX = source.x + vertexRadius * 0.7;
        const loopCenterY = source.y - vertexRadius * 0.7;
        const distToLoopCenter = Math.sqrt((adjustedX - loopCenterX) ** 2 + (adjustedY - loopCenterY) ** 2);

        if (Math.abs(distToLoopCenter - loopRadius) < 8) return edge;
      } else {
        const dist = distanceToLineSegment(adjustedX, adjustedY, source.x, source.y, target.x, target.y);
        if (dist < 10) return edge;
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

    if (tool === "pan" || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: pos.x - pan.x, y: pos.y - pan.y });
      return;
    }

    const vertex = getVertexAtPosition(pos.x, pos.y);
    const edge = getEdgeAtPosition(pos.x, pos.y);

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
        if (!vertex) {
          addVertex((pos.x - pan.x) / zoom, (pos.y - pan.y) / zoom);
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

    if (isDragging && dragVertex && !readOnly) {
      moveVertex(dragVertex, (pos.x - pan.x) / zoom, (pos.y - pan.y) / zoom);
    }
  }

  function handleMouseUp() {
    setIsDragging(false);
    setDragVertex(null);
    setIsPanning(false);
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

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-100 bg-background rounded-lg overflow-hidden border border-border">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        tabIndex={0}
      />
      {!graph && <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">Nenhum grafo selecionado</div>}
    </div>
  );
});

GraphCanvas.displayName = "GraphCanvas";
