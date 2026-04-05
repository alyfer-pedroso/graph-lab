"use client";

import { useState, useRef } from "react";
import { Plus, Copy, Trash2, Settings, GitBranch, Eye, EyeOff, Move, Upload, Download as DownloadIcon } from "lucide-react";
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
import type { Graph } from "@/lib/graph-types";

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
    importGraph,
  } = useGraphStore();

  const [newGraphName, setNewGraphName] = useState("");
  const [newGraphDirected, setNewGraphDirected] = useState(false);
  const [newGraphWeighted, setNewGraphWeighted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  function handleCreateGraph() {
    if (newGraphName.trim()) {
      createGraph(newGraphName.trim(), newGraphDirected, newGraphWeighted);
      setNewGraphName("");
      setNewGraphDirected(false);
      setNewGraphWeighted(false);
      setDialogOpen(false);
    }
  }

  function exportGraph(graph: Graph) {
    const exportData = {
      version: "1.0",
      graph: {
        id: graph.id,
        name: graph.name,
        directed: graph.directed,
        weighted: graph.weighted,
        opacity: graph.opacity,
        visible: graph.visible,
        offsetX: graph.offsetX,
        offsetY: graph.offsetY,
        defaultVertexColor: graph.defaultVertexColor,
        vertices: graph.vertices.map((v) => ({ id: v.id, label: v.label, x: v.x, y: v.y, color: v.color })),
        edges: graph.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label, weight: e.weight, directed: e.directed })),
      },
    };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${graph.name.replace(/\s+/g, "_")}.graphlab.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    setImportError(null);
    importInputRef.current?.click();
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result as string;
        const parsed = JSON.parse(raw);
        let graphData: any = null;
        if (parsed.version && parsed.graph) {
          graphData = parsed.graph;
        } else if (parsed.vertices !== undefined && parsed.edges !== undefined) {
          graphData = parsed;
        } else {
          throw new Error("Formato inválido. Use um arquivo exportado pelo GraphLab (.graphlab.json).");
        }
        importGraph({
          name: graphData.name || file.name.replace(/\.graphlab\.json$/, "").replace(/\.json$/, ""),
          directed: graphData.directed ?? false,
          weighted: graphData.weighted ?? false,
          opacity: graphData.opacity ?? 1,
          visible: graphData.visible ?? true,
          offsetX: graphData.offsetX ?? 0,
          offsetY: graphData.offsetY ?? 0,
          defaultVertexColor: graphData.defaultVertexColor,
          vertices: (graphData.vertices || []).map((v: any) => ({ id: v.id, label: v.label, x: v.x, y: v.y, color: v.color })),
          edges: (graphData.edges || []).map((e: any) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.label,
            weight: e.weight,
            directed: e.directed ?? graphData.directed ?? false,
          })),
        });
        setImportError(null);
      } catch (err: any) {
        setImportError(err.message || "Erro ao importar o arquivo.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="font-semibold text-sm">Camadas / Grafos</h3>
        <div className="flex items-center gap-1">
          <input ref={importInputRef} type="file" accept=".json,.graphlab.json" className="hidden" onChange={handleImportFile} />
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Importar grafo (.json)" onClick={handleImportClick}>
            <Upload className="h-4 w-4" />
          </Button>
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
      </div>

      {importError && (
        <div className="mx-2 mt-2 p-2 bg-destructive/10 border border-destructive/30 rounded-md">
          <p className="text-xs text-destructive">{importError}</p>
        </div>
      )}

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
                          const n = prompt("Novo nome:", graph.name);
                          if (n) updateGraph(graph.id, { name: n });
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
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          exportGraph(graph);
                        }}
                      >
                        <DownloadIcon className="h-4 w-4 mr-2" />
                        Exportar grafo (.json)
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
