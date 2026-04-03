"use client";

import { useState } from "react";
import { Plus, Copy, Trash2, Settings, GitBranch, Eye, EyeOff, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useGraphStore } from "@/lib/graph-store";
import { cn } from "@/lib/utils";

export function GraphManager() {
  const {
    graphs,
    activeGraphId,
    createGraph,
    deleteGraph,
    setActiveGraph,
    updateGraph,
    duplicateGraph,
    setGraphOpacity,
    setGraphVisible,
    setGraphOffset,
  } = useGraphStore();

  const [newGraphName, setNewGraphName] = useState("");
  const [newGraphDirected, setNewGraphDirected] = useState(false);
  const [newGraphWeighted, setNewGraphWeighted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleCreateGraph() {
    if (newGraphName.trim()) {
      createGraph(newGraphName.trim(), newGraphDirected, newGraphWeighted);
      setNewGraphName("");
      setNewGraphDirected(false);
      setNewGraphWeighted(false);
      setDialogOpen(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="font-semibold text-sm">Camadas / Grafos</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Grafo</DialogTitle>
              <DialogDescription>Configure as propriedades do novo grafo.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={newGraphName}
                  onChange={(e) => setNewGraphName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateGraph()}
                  placeholder="Meu Grafo"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="directed">Dígrafo (Direcionado)</Label>
                <Switch id="directed" checked={newGraphDirected} onCheckedChange={setNewGraphDirected} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="weighted">Ponderado</Label>
                <Switch id="weighted" checked={newGraphWeighted} onCheckedChange={setNewGraphWeighted} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateGraph}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {graphs.map((graph) => (
            <div
              key={graph.id}
              className={cn(
                "group flex flex-col gap-1 p-2 rounded-md cursor-pointer transition-colors border",
                activeGraphId === graph.id ? "bg-primary/10 text-primary border-primary/30" : "hover:bg-muted border-transparent",
              )}
              onClick={() => setActiveGraph(graph.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <GitBranch className="h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{graph.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {graph.vertices.length}V, {graph.edges.length}A{graph.directed && " · Dígrafo"}
                      {graph.weighted && " · Pond."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGraphVisible(graph.id, !graph.visible);
                    }}
                    title={graph.visible ? "Ocultar grafo" : "Mostrar grafo"}
                  >
                    {graph.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => duplicateGraph(graph.id)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          const newName = prompt("Novo nome:", graph.name);
                          if (newName) updateGraph(graph.id, { name: newName });
                        }}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Renomear
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setGraphOffset(graph.id, 0, 0)}>
                        <Move className="h-4 w-4 mr-2" />
                        Resetar posição
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteGraph(graph.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div
                className={cn("px-1 space-y-1", activeGraphId === graph.id ? "block" : "hidden group-hover:block")}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Opacidade</span>
                  <span className="text-xs text-muted-foreground">{Math.round(graph.opacity * 100)}%</span>
                </div>
                <Slider
                  value={[graph.opacity * 100]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={([val]) => setGraphOpacity(graph.id, val / 100)}
                  className="w-full"
                />
                {(graph.offsetX !== 0 || graph.offsetY !== 0) && (
                  <p className="text-xs text-muted-foreground">
                    Offset: ({Math.round(graph.offsetX)}, {Math.round(graph.offsetY)})
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
