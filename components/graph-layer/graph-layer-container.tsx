"use client";

import { useRef, useState, type MutableRefObject } from "react";
import { Eye, MoreHorizontal, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Graph } from "@/lib/graph-types";
import { computeSingleGraphBounds, VERTEX_RADIUS } from "@/core/domain/graph/graph-bounds";
import { useGraphStore } from "@/lib/graph-store";
import { GraphContainerMenu } from "./graph-container-menu";

type MenuAnchor = { x: number; y: number };

const TITLE_HEIGHT = 24;
const CONTAINER_PADDING = VERTEX_RADIUS + 8;

interface GraphLayerContainerProps {
  graph: Graph;
  isActive: boolean;
  viewportRef: MutableRefObject<{ pan: { x: number; y: number }; zoom: number }>;
  onSelect: () => void;
  onOpenNote: () => void;
}

export function GraphLayerContainer({ graph, isActive, viewportRef, onSelect, onOpenNote }: GraphLayerContainerProps) {
  const { pushHistory, moveGraphOffset, autoLayout, getActiveGraph } = useGraphStore();
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const lastPos = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);
  const historyPushed = useRef(false);

  const bounds = computeSingleGraphBounds(graph, CONTAINER_PADDING, CONTAINER_PADDING, CONTAINER_PADDING);
  if (!bounds) return null;

  const left = graph.offsetX + bounds.minX;
  const top = graph.offsetY + bounds.minY - TITLE_HEIGHT;
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY + TITLE_HEIGHT;

  const canAutoLayout = (getActiveGraph()?.id === graph.id) && (graph.vertices.length >= 2);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    lastPos.current = { x: e.clientX, y: e.clientY };
    hasDragged.current = false;
    historyPushed.current = false;
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const screenDx = e.clientX - lastPos.current.x;
    const screenDy = e.clientY - lastPos.current.y;
    if (!hasDragged.current && (Math.abs(screenDx) > 3 || Math.abs(screenDy) > 3)) {
      hasDragged.current = true;
    }
    if (hasDragged.current) {
      if (!historyPushed.current) {
        pushHistory();
        historyPushed.current = true;
      }
      const zoom = viewportRef.current.zoom;
      moveGraphOffset(graph.id, screenDx / zoom, screenDy / zoom);
    }
    lastPos.current = { x: e.clientX, y: e.clientY };
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (!hasDragged.current) onSelect();
  }

  const titleBarCursor = hasDragged.current ? "grabbing" : "grab";

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        pointerEvents: "none",
      }}
    >
      <div
        className={cn(
          "absolute inset-0 rounded-lg border transition-colors",
          isActive ? "border-primary/40 bg-primary/3" : "border-white/10 bg-white/1.5",
        )}
      />

      <div
        style={{
          pointerEvents: "auto",
          cursor: titleBarCursor,
          height: TITLE_HEIGHT,
          touchAction: "none",
        }}
        className={cn(
          "absolute top-0 left-0 right-0 flex items-center gap-1 px-2 rounded-t-lg select-none",
          isActive ? "bg-primary/10" : "bg-black/20 hover:bg-white/5",
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <span className={cn("text-[11px] font-medium truncate leading-none flex-1", isActive ? "text-primary/90" : "text-white/50")}>
          {graph.name}
        </span>

        <button
          style={{ pointerEvents: "auto" }}
          onClick={(e) => {
            e.stopPropagation();
            if (canAutoLayout) autoLayout();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          disabled={!canAutoLayout}
          className={cn(
            "shrink-0 p-1 rounded transition-colors",
            isActive && canAutoLayout
              ? "text-primary/60 hover:text-primary"
              : "text-white/20 cursor-not-allowed",
          )}
          aria-label="Auto-layout"
        >
          <Wand2 size={11} />
        </button>

        <button
          ref={menuButtonRef}
          style={{ pointerEvents: "auto" }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
            if (menuAnchor) {
              setMenuAnchor(null);
            } else {
              const rect = menuButtonRef.current?.getBoundingClientRect();
              if (rect) setMenuAnchor({ x: rect.left, y: rect.bottom + 4 });
            }
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "shrink-0 p-1 rounded transition-colors",
            isActive ? "text-primary/60 hover:text-primary" : "text-white/30 hover:text-white/70",
          )}
          aria-label={`Menu de ${graph.name}`}
        >
          <MoreHorizontal size={11} />
        </button>
        {menuAnchor && (
          <GraphContainerMenu
            graphId={graph.id}
            anchor={menuAnchor}
            onClose={() => setMenuAnchor(null)}
            onOpenNote={onOpenNote}
          />
        )}

        <button
          style={{ pointerEvents: "auto" }}
          onClick={(e) => {
            e.stopPropagation();
            onOpenNote();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "shrink-0 p-1 rounded transition-colors",
            isActive ? "text-primary/60 hover:text-primary" : "text-white/30 hover:text-white/70",
          )}
          aria-label={`Anotação de ${graph.name}`}
        >
          <Eye size={11} />
        </button>
      </div>
    </div>
  );
}
