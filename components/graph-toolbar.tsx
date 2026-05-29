"use client";

import { useEffect, useState } from "react";
import { Magnet, Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useGraphStore } from "@/lib/graph-store";
import { cn } from "@/lib/utils";

interface GraphToolbarProps {
  orientation?: "horizontal" | "vertical";
  tooltipSide?: "top" | "bottom" | "left" | "right";
}

export function GraphToolbar({ orientation = "horizontal", tooltipSide = "bottom" }: GraphToolbarProps) {
  const { gridSnap, toggleGridSnap, undo, redo, past, future } = useGraphStore();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const canUndoNow = mounted && past.length > 0;
  const canRedoNow = mounted && future.length > 0;

  const isVertical = orientation === "vertical";
  const dividerClassName = cn("bg-border", isVertical ? "h-px w-6 my-1" : "w-px h-6 mx-1");

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-1", isVertical ? "flex-col" : "flex-row flex-wrap")}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndoNow} className="h-9 w-9">
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={tooltipSide}>
            <p>Desfazer (Ctrl+Z)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={redo} disabled={!canRedoNow} className="h-9 w-9">
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={tooltipSide}>
            <p>Refazer (Ctrl+Y)</p>
          </TooltipContent>
        </Tooltip>

        <div className={dividerClassName} />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={gridSnap ? "default" : "ghost"} size="icon" onClick={toggleGridSnap} className="h-9 w-9" aria-pressed={gridSnap}>
              <Magnet className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={tooltipSide}>
            <p>{gridSnap ? "Desativar Snap à Grade" : "Ativar Snap à Grade"}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
