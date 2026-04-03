"use client"

import { MousePointer2, Circle, ArrowRight, Trash2, Move, Undo2, Redo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { useGraphStore } from "@/lib/graph-store"
import type { Tool } from "@/lib/graph-types"

const tools: { id: Tool; icon: React.ElementType; label: string; shortcut: string }[] = [
  { id: "select", icon: MousePointer2, label: "Selecionar", shortcut: "V" },
  { id: "vertex", icon: Circle, label: "Adicionar Vértice", shortcut: "N" },
  { id: "edge", icon: ArrowRight, label: "Adicionar Aresta", shortcut: "E" },
  { id: "delete", icon: Trash2, label: "Excluir", shortcut: "D" },
  { id: "pan", icon: Move, label: "Mover Canvas", shortcut: "H" },
]

export function GraphToolbar() {
  const { tool, setTool, clearGraph, activeGraphId } = useGraphStore()

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 p-2 bg-card border border-border rounded-lg">
        {tools.map((t) => (
          <Tooltip key={t.id}>
            <TooltipTrigger asChild>
              <Button
                variant={tool === t.id ? "default" : "ghost"}
                size="icon"
                onClick={() => setTool(t.id)}
                className="h-9 w-9"
              >
                <t.icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t.label} ({t.shortcut})</p>
            </TooltipContent>
          </Tooltip>
        ))}

        <div className="w-px h-6 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => activeGraphId && clearGraph(activeGraphId)}
              className="h-9 w-9 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Limpar Grafo</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
