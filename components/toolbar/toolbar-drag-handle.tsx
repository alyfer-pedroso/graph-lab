"use client";

import { type PointerEvent as ReactPointerEvent } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolbarDragHandleProps {
  orientation: "horizontal" | "vertical";
  onPointerDown: (event: ReactPointerEvent) => void;
  style: { touchAction: "none" };
}

export function ToolbarDragHandle({ orientation, onPointerDown, style }: ToolbarDragHandleProps) {
  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      style={style}
      aria-label="Mover barra de ferramentas"
      className={cn(
        "flex items-center justify-center text-muted-foreground hover:text-foreground rounded-md cursor-grab active:cursor-grabbing select-none",
        orientation === "vertical" ? "h-6 w-9 rotate-90" : "h-9 w-6",
      )}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}
