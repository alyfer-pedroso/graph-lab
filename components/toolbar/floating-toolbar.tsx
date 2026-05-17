"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { GraphToolbar } from "@/components/graph-toolbar";
import { ToolbarDragHandle } from "@/components/toolbar/toolbar-drag-handle";
import { ViewControls } from "@/components/toolbar/view-controls";
import { anchorPositionClass, tooltipSideFor } from "@/components/toolbar/anchor-style";
import { useToolbarStore } from "@/lib/toolbar-store";
import { useDraggableAnchor } from "@/hooks/use-draggable-anchor";
import { useIsMobilePortrait } from "@/hooks/use-mobile-portrait";
import { cn } from "@/lib/utils";

interface FloatingToolbarProps {
  containerRef: RefObject<HTMLDivElement | null>;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onReset: () => void;
  onFitView: () => void;
}

export function FloatingToolbar({ containerRef, zoom, onZoomChange, onReset, onFitView }: FloatingToolbarProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const anchor = useToolbarStore((state) => state.anchor);
  const isMobilePortrait = useIsMobilePortrait();
  const orientation = isMobilePortrait ? "vertical" : "horizontal";

  const panelRef = useRef<HTMLDivElement>(null);
  const { dragging, dragPos, handleProps } = useDraggableAnchor({ containerRef, panelRef });

  if (!mounted) return null;

  const tooltipSide = tooltipSideFor(anchor);
  const isDragging = dragging && dragPos !== null;

  return (
    <div
      ref={panelRef}
      style={isDragging ? { left: dragPos!.x, top: dragPos!.y } : undefined}
      className={cn(
        "absolute z-40 flex items-center gap-1 p-1.5 rounded-lg border border-border bg-card/95 backdrop-blur shadow-lg",
        orientation === "vertical" ? "flex-col" : "flex-row flex-wrap",
        isDragging ? "cursor-grabbing" : cn("transition-all duration-200", anchorPositionClass(anchor)),
      )}
    >
      <ToolbarDragHandle orientation={orientation} {...handleProps} />

      <div className={cn("bg-border", orientation === "vertical" ? "h-px w-6" : "w-px h-6")} />

      <GraphToolbar orientation={orientation} tooltipSide={tooltipSide} />

      <div className={cn("bg-border", orientation === "vertical" ? "h-px w-6" : "w-px h-6")} />

      <ViewControls
        zoom={zoom}
        onZoomIn={() => onZoomChange(Math.min(3, zoom + 0.1))}
        onZoomOut={() => onZoomChange(Math.max(0.1, zoom - 0.1))}
        onReset={onReset}
        onFit={onFitView}
        orientation={orientation}
        tooltipSide={tooltipSide}
      />
    </div>
  );
}
