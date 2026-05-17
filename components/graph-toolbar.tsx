"use client";

import { useEffect, useState } from "react";
import { MousePointer2, Circle, ArrowRight, Trash2, Move, Magnet, Undo2, Redo2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useGraphStore } from "@/lib/graph-store";
import type { Tool } from "@/lib/graph-types";
import { cn } from "@/lib/utils";

const tools: { id: Tool; icon: React.ElementType; label: string; shortcut: string }[] = [
  { id: "select", icon: MousePointer2, label: "Selecionar", shortcut: "V" },
  { id: "vertex", icon: Circle, label: "Adicionar Vértice", shortcut: "N" },
  { id: "edge", icon: ArrowRight, label: "Adicionar Aresta", shortcut: "E" },
  { id: "delete", icon: Trash2, label: "Excluir", shortcut: "D" },
  { id: "pan", icon: Move, label: "Mover Canvas", shortcut: "H" },
];

interface GraphToolbarProps {
  orientation?: "horizontal" | "vertical";
  tooltipSide?: "top" | "bottom" | "left" | "right";
}

export function GraphToolbar({ orientation = "horizontal", tooltipSide = "bottom" }: GraphToolbarProps) {
  const { tool, setTool, clearGraph, activeGraphId, gridSnap, toggleGridSnap, autoLayout, undo, redo, past, future, getActiveGraph } =
    useGraphStore();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const activeGraph = mounted ? getActiveGraph() : null;
  const canAutoLayout = (activeGraph?.vertices.length ?? 0) >= 2;
  const canUndoNow = mounted && past.length > 0;
  const canRedoNow = mounted && future.length > 0;
  const canClear = mounted && !!activeGraphId;

  const isVertical = orientation === "vertical";
  const dividerClassName = cn("bg-border", isVertical ? "h-px w-6 my-1" : "w-px h-6 mx-1");

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-1", isVertical ? "flex-col" : "flex-row flex-wrap")}>
        {tools.map((t) => (
          <Tooltip key={t.id}>
            <TooltipTrigger asChild>
              <Button
                variant={tool === t.id ? "default" : "ghost"}
                size="icon"
                onClick={() => setTool(t.id)}
                className="h-9 w-9"
                aria-pressed={tool === t.id}
              >
                <t.icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide}>
              <p>
                {t.label} ({t.shortcut})
              </p>
            </TooltipContent>
          </Tooltip>
        ))}

        <div className={dividerClassName} />

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

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={autoLayout} disabled={!canAutoLayout} className="h-9 w-9">
              <Wand2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={tooltipSide}>
            <p>Organizar Layout Automaticamente</p>
          </TooltipContent>
        </Tooltip>

        <div className={dividerClassName} />

        <AlertDialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!canClear}
                  className="h-9 w-9 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide}>
              <p>Limpar Grafo</p>
            </TooltipContent>
          </Tooltip>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Limpar grafo ativo?</AlertDialogTitle>
              <AlertDialogDescription>
                Todos os vértices e arestas do grafo ativo serão removidos. Esta ação pode ser revertida usando Desfazer (Ctrl+Z) enquanto o histórico
                estiver disponível.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => activeGraphId && clearGraph(activeGraphId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Limpar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
