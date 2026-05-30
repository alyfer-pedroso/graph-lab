"use client";

import { createPortal } from "react-dom";
import { PlusCircle } from "lucide-react";
import { useGraphStore } from "@/lib/graph-store";
import { cn } from "@/lib/utils";

interface CanvasContextMenuProps {
  screenX: number;
  screenY: number;
  localX: number;
  localY: number;
  onClose: () => void;
}

export function CanvasContextMenu({ screenX, screenY, localX, localY, onClose }: CanvasContextMenuProps) {
  const { addVertex } = useGraphStore();

  function handleAddVertex() {
    addVertex(localX, localY);
    onClose();
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-49" onPointerDown={onClose} />
      <div
        style={{ position: "fixed", left: screenX, top: screenY, zIndex: 50 }}
        className="bg-popover border border-border rounded-lg shadow-lg py-1 min-w-40 text-sm"
      >
        <button
          onClick={handleAddVertex}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors",
          )}
        >
          <PlusCircle className="h-4 w-4 text-muted-foreground shrink-0" />
          Adicionar vértice
        </button>
      </div>
    </>,
    document.body,
  );
}
