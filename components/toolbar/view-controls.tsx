"use client";

import { ZoomIn, ZoomOut, RotateCcw, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ViewControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFit: () => void;
  orientation: "horizontal" | "vertical";
  tooltipSide: "left" | "right";
}

export function ViewControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  onFit,
  orientation,
  tooltipSide,
}: ViewControlsProps) {
  const isVertical = orientation === "vertical";

  return (
    <div className={cn("flex items-center gap-1", isVertical ? "flex-col" : "flex-row")}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={onZoomOut} className="h-9 w-9" aria-label="Diminuir Zoom">
            <ZoomOut className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide}>Diminuir Zoom</TooltipContent>
      </Tooltip>

      <span className="text-xs text-muted-foreground tabular-nums w-10 text-center">{Math.round(zoom * 100)}%</span>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={onZoomIn} className="h-9 w-9" aria-label="Aumentar Zoom">
            <ZoomIn className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide}>Aumentar Zoom</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={onFit} className="h-9 w-9" aria-label="Ajustar à Tela">
            <Maximize className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide}>Ajustar à Tela</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={onReset} className="h-9 w-9" aria-label="Resetar Vista">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide}>Resetar Vista</TooltipContent>
      </Tooltip>
    </div>
  );
}
