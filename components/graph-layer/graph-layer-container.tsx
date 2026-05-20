"use client";

import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Graph } from "@/lib/graph-types";
import { computeSingleGraphBounds } from "@/core/domain/graph/graph-bounds";

interface GraphLayerContainerProps {
  graph: Graph;
  isActive: boolean;
  onSelect: () => void;
  onOpenNotes: () => void;
}

export function GraphLayerContainer({ graph, isActive, onSelect, onOpenNotes }: GraphLayerContainerProps) {
  const bounds = computeSingleGraphBounds(graph);

  if (!bounds) return null;

  const left = graph.offsetX + bounds.minX;
  const top = graph.offsetY + bounds.minY;
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;

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
          isActive
            ? "border-primary/40 bg-primary/[0.03]"
            : "border-white/10 bg-white/[0.015]",
        )}
      />

      <div
        style={{ pointerEvents: "auto" }}
        className={cn(
          "absolute top-0 left-0 right-0 flex items-center justify-between gap-1 px-2 py-1 rounded-t-lg cursor-pointer",
          isActive ? "bg-primary/10" : "bg-black/20 hover:bg-white/5",
        )}
        onClick={onSelect}
      >
        <span
          className={cn(
            "text-[11px] font-medium truncate leading-none select-none",
            isActive ? "text-primary/90" : "text-white/50",
          )}
        >
          {graph.name}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenNotes();
          }}
          className={cn(
            "flex-shrink-0 p-1 rounded transition-colors",
            isActive
              ? "text-primary/60 hover:text-primary"
              : "text-white/30 hover:text-white/70",
          )}
          aria-label={`Notes for ${graph.name}`}
        >
          <Eye size={11} />
        </button>
      </div>
    </div>
  );
}
