"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Network,
  HelpCircle,
  Keyboard,
  Github,
  Linkedin,
  PanelLeftOpen,
  Download,
  ArrowLeft,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { GraphCanvas, type GraphCanvasRef } from "@/components/graph-canvas";
import { GraphLayersOverlay } from "@/components/graph-layer/graph-layers-overlay";
import { GraphManager } from "@/components/graph-manager";
import { EmptyGraphState } from "@/components/simulator/empty-graph-state";
import { FloatingToolbar } from "@/components/toolbar/floating-toolbar";
import { RenameProjectDialog } from "@/components/home/rename-project-dialog";
import { CanvasContextMenu } from "@/components/canvas-menus/canvas-context-menu";
import { VertexContextMenu } from "@/components/canvas-menus/vertex-context-menu";
import { EdgeContextMenu } from "@/components/canvas-menus/edge-context-menu";
import { useGraphStore } from "@/lib/graph-store";

function ShortcutGroup({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</h4>
      <div className="grid gap-1.5">
        {items.map(([label, key]) => (
          <div key={key} className="flex items-center justify-between">
            <span>{label}</span>
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">{key}</kbd>
          </div>
        ))}
      </div>
    </div>
  );
}

type ContextMenuState =
  | { type: "canvas"; localX: number; localY: number; screenX: number; screenY: number }
  | { type: "vertex"; vertexId: string; screenX: number; screenY: number }
  | { type: "edge"; edgeId: string; screenX: number; screenY: number }
  | null;

interface GraphSimulatorProps {
  projectName: string;
  onRenameProject: (name: string) => void;
}

export function GraphSimulator({ projectName, onRenameProject }: GraphSimulatorProps) {
  const router = useRouter();
  const { undo, redo, toggleGridSnap, graphs, createGraph } = useGraphStore();
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<GraphCanvasRef>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<{ pan: { x: number; y: number }; zoom: number }>({ pan: { x: 0, y: 0 }, zoom: 1 });
  const didInitialFitRef = useRef(false);
  const [leftOpen, setLeftOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);

  const isEmpty = graphs.length === 0;

  const handleReset = () => canvasRef.current?.resetView();
  const handleFitView = () => canvasRef.current?.fitView();

  useEffect(() => {
    if (didInitialFitRef.current) return;

    let outerFrame = 0;
    let innerFrame = 0;

    outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => {
        const hasVertices = useGraphStore.getState().graphs.some((g) => g.vertices.length > 0);
        if (hasVertices) {
          canvasRef.current?.fitView();
          didInitialFitRef.current = true;
        }
      });
    });

    return () => {
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const isMod = e.ctrlKey || e.metaKey;
      if (isMod) {
        const key = e.key.toLowerCase();
        if (key === "z" && !e.shiftKey) {
          e.preventDefault();
          undo();
          return;
        }
        if (key === "y" || (key === "z" && e.shiftKey)) {
          e.preventDefault();
          redo();
          return;
        }
        return;
      }

      if (e.key.toLowerCase() === "g") {
        toggleGridSnap();
      }

      if (e.key === "Escape") {
        setContextMenu(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, toggleGridSnap]);

  function handleStartEdge(vertexId: string) {
    setContextMenu(null);
    canvasRef.current?.startEdgeCreation(vertexId);
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
        <header className="flex items-center justify-between px-3 py-2 border-b border-border bg-card shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 sm:h-8 sm:w-8 shrink-0"
                  onClick={() => router.push("/")}
                  aria-label="Voltar para projetos"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Projetos</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 sm:h-8 sm:w-8 shrink-0"
                  onClick={() => setLeftOpen(true)}
                  aria-label="Abrir painel de grafos"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Grafos</TooltipContent>
            </Tooltip>
            <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
              <Network className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-center gap-1 min-w-0">
              <h1 className="font-bold text-base truncate">{projectName}</h1>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => setRenameOpen(true)}
                    aria-label="Renomear projeto"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Renomear projeto</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-8 sm:w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Exportar Canvas</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => canvasRef.current?.exportImage("png")}>Exportar como PNG</DropdownMenuItem>
                <DropdownMenuItem onClick={() => canvasRef.current?.exportImage("jpeg")}>Exportar como JPEG</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-8 sm:w-8">
                  <Keyboard className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Atalhos de Teclado</DialogTitle>
                  <DialogDescription>Use atalhos para trabalhar mais rápido.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  <ShortcutGroup
                    title="Histórico"
                    items={[
                      ["Desfazer", "Ctrl+Z"],
                      ["Refazer", "Ctrl+Y"],
                      ["Refazer (alternativo)", "Ctrl+Shift+Z"],
                    ]}
                  />
                  <ShortcutGroup
                    title="Edição"
                    items={[
                      ["Deletar Seleção", "Delete"],
                      ["Cancelar Ação", "Esc"],
                      ["Snap à Grade", "G"],
                    ]}
                  />
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-8 sm:w-8">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Como Usar</DialogTitle>
                  <DialogDescription>Aprenda a usar o simulador de grafos.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-1">Criar Vértices</h4>
                    <p className="text-muted-foreground">Dê um duplo clique (ou duplo toque) em qualquer área vazia do canvas para adicionar um vértice.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Criar Arestas</h4>
                    <p className="text-muted-foreground">Dê um duplo clique em um vértice e selecione "Desenhar aresta". Clique no vértice destino para conectar.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Editar Vértices e Arestas</h4>
                    <p className="text-muted-foreground">Dê um duplo clique em um vértice ou aresta para abrir o menu de edição com opções de rótulo, cor e exclusão.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Mover Vértices</h4>
                    <p className="text-muted-foreground">Arraste qualquer vértice. Com o Snap à Grade (G) ativado, os vértices se alinham à grade automaticamente.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Mover o Canvas</h4>
                    <p className="text-muted-foreground">Arraste uma área vazia do canvas para navegar. Use o scroll para aplicar zoom.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Menu do Grafo (⋯)</h4>
                    <p className="text-muted-foreground">Clique no botão ⋯ no cabeçalho do container do grafo para acessar propriedades, algoritmos, matrizes e muito mais.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Mover o Container</h4>
                    <p className="text-muted-foreground">Arraste a barra de título do container para reposicionar o grafo no canvas.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Anotações (Post-it)</h4>
                    <p className="text-muted-foreground">Use o ícone de olho no cabeçalho do container para abrir ou criar uma anotação em post-it para o grafo.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Barra de Ferramentas Flutuante</h4>
                    <p className="text-muted-foreground">Arraste a alça da barra de ferramentas para reposicioná-la. Use os botões de zoom para enquadrar os grafos.</p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-border">
                    <p className="text-muted-foreground text-center mb-2">Criado por Alyfer Pedroso</p>
                    <div className="flex items-center justify-center gap-3">
                      <a
                        href="https://github.com/alyfer-pedroso"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-md hover:bg-muted transition-colors"
                      >
                        <Github className="h-5 w-5" />
                      </a>
                      <a
                        href="https://www.linkedin.com/in/alyfer-pedroso/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-md hover:bg-muted transition-colors"
                      >
                        <Linkedin className="h-5 w-5" />
                      </a>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <Sheet open={leftOpen} onOpenChange={setLeftOpen}>
          <SheetContent side="left" className="w-[85vw] max-w-xs p-0 flex flex-col">
            <GraphManager />
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
            <div ref={canvasWrapperRef} className="flex-1 p-1.5 sm:p-4 overflow-hidden relative">
              <GraphCanvas
                ref={canvasRef}
                zoom={zoom}
                onZoomChange={setZoom}
                showAllGraphs={true}
                viewportRef={viewportRef}
                onCanvasDoubleClick={(localX, localY, screenX, screenY) =>
                  setContextMenu({ type: "canvas", localX, localY, screenX, screenY })
                }
                onVertexDoubleClick={(vertexId, screenX, screenY) =>
                  setContextMenu({ type: "vertex", vertexId, screenX, screenY })
                }
                onEdgeDoubleClick={(edgeId, screenX, screenY) =>
                  setContextMenu({ type: "edge", edgeId, screenX, screenY })
                }
              />
              <GraphLayersOverlay viewportRef={viewportRef} />
              {isEmpty && <EmptyGraphState onCreate={() => createGraph()} />}
              <FloatingToolbar
                containerRef={canvasWrapperRef}
                zoom={zoom}
                onZoomChange={setZoom}
                onReset={handleReset}
                onFitView={handleFitView}
              />

              {contextMenu?.type === "canvas" && (
                <CanvasContextMenu
                  screenX={contextMenu.screenX}
                  screenY={contextMenu.screenY}
                  localX={contextMenu.localX}
                  localY={contextMenu.localY}
                  onClose={() => setContextMenu(null)}
                />
              )}
              {contextMenu?.type === "vertex" && (
                <VertexContextMenu
                  vertexId={contextMenu.vertexId}
                  screenX={contextMenu.screenX}
                  screenY={contextMenu.screenY}
                  onClose={() => setContextMenu(null)}
                  onStartEdge={handleStartEdge}
                />
              )}
              {contextMenu?.type === "edge" && (
                <EdgeContextMenu
                  edgeId={contextMenu.edgeId}
                  screenX={contextMenu.screenX}
                  screenY={contextMenu.screenY}
                  onClose={() => setContextMenu(null)}
                />
              )}
            </div>
          </main>
        </div>
      </div>

      <RenameProjectDialog
        open={renameOpen}
        initialName={projectName}
        onOpenChange={setRenameOpen}
        onConfirm={onRenameProject}
      />
    </TooltipProvider>
  );
}
