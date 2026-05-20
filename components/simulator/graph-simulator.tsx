"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Network,
  Settings2,
  Grid3X3,
  BarChart3,
  GitCompare,
  HelpCircle,
  Keyboard,
  Github,
  Linkedin,
  PanelLeftOpen,
  PanelRightOpen,
  Download,
  ArrowLeft,
  Pencil,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { GraphCanvas, type GraphCanvasRef } from "@/components/graph-canvas";
import { GraphLayersOverlay } from "@/components/graph-layer/graph-layers-overlay";
import { GraphManager } from "@/components/graph-manager";
import { PropertiesPanel } from "@/components/properties-panel";
import { MatrixPanel } from "@/components/matrix-panel";
import { AnalysisPanel } from "@/components/analysis-panel";
import { ComparisonPanel } from "@/components/comparison-panel";
import { EmptyGraphState } from "@/components/simulator/empty-graph-state";
import { FloatingToolbar } from "@/components/toolbar/floating-toolbar";
import { RenameProjectDialog } from "@/components/home/rename-project-dialog";
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

interface GraphSimulatorProps {
  projectName: string;
  onRenameProject: (name: string) => void;
}

export function GraphSimulator({ projectName, onRenameProject }: GraphSimulatorProps) {
  const router = useRouter();
  const { setTool, undo, redo, toggleGridSnap, graphs, createGraph } = useGraphStore();
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<GraphCanvasRef>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<{ pan: { x: number; y: number }; zoom: number }>({ pan: { x: 0, y: 0 }, zoom: 1 });
  const didInitialFitRef = useRef(false);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("properties");
  const [renameOpen, setRenameOpen] = useState(false);

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

      switch (e.key.toLowerCase()) {
        case "v":
          setTool("select");
          break;
        case "n":
          setTool("vertex");
          break;
        case "e":
          setTool("edge");
          break;
        case "d":
          setTool("delete");
          break;
        case "h":
          setTool("pan");
          break;
        case "g":
          toggleGridSnap();
          break;
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setTool, undo, redo, toggleGridSnap]);

  const RightPanelContent = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
      <TabsList className="w-full rounded-none border-b border-border bg-transparent p-0 h-auto shrink-0">
        {[
          { value: "properties", icon: Settings2, label: "Propriedades" },
          { value: "matrix", icon: Grid3X3, label: "Matrizes" },
          { value: "analysis", icon: BarChart3, label: "Análise" },
          { value: "compare", icon: GitCompare, label: "Comparar" },
        ].map(({ value, icon: Icon, label }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Icon className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          </TabsTrigger>
        ))}
      </TabsList>
      <div className="flex-1 overflow-auto">
        <TabsContent value="properties" className="m-0 h-full">
          <PropertiesPanel />
        </TabsContent>
        <TabsContent value="matrix" className="m-0 h-full">
          <MatrixPanel />
        </TabsContent>
        <TabsContent value="analysis" className="m-0 h-full">
          <AnalysisPanel />
        </TabsContent>
        <TabsContent value="compare" className="m-0 h-full">
          <ComparisonPanel />
        </TabsContent>
      </div>
    </Tabs>
  );

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
                    title="Ferramentas"
                    items={[
                      ["Selecionar", "V"],
                      ["Novo Vértice", "N"],
                      ["Nova Aresta", "E"],
                      ["Excluir", "D"],
                      ["Mover Canvas", "H"],
                    ]}
                  />
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
                    <p className="text-muted-foreground">Selecione a ferramenta de vértice (N) e clique no canvas para adicionar.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Criar Arestas</h4>
                    <p className="text-muted-foreground">Selecione a ferramenta de aresta (E), clique no vértice origem e depois no destino.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Mover Vértices</h4>
                    <p className="text-muted-foreground">
                      Use a ferramenta Selecionar (V) e arraste qualquer vértice. Quando o Snap à Grade (G) está ativado, os vértices se alinham
                      automaticamente à grade ao serem movidos.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Barra de Ferramentas Flutuante</h4>
                    <p className="text-muted-foreground">
                      Arraste a alça da barra de ferramentas para reposicioná-la em qualquer canto ou borda lateral do canvas. Use o botão Ajustar à
                      Tela para enquadrar todos os grafos automaticamente.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Desfazer e Refazer</h4>
                    <p className="text-muted-foreground">
                      Use os botões da toolbar ou os atalhos Ctrl+Z para desfazer e Ctrl+Y para refazer.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Camadas de Grafos</h4>
                    <p className="text-muted-foreground">
                      Use a barra lateral esquerda para controlar opacidade, visibilidade e posição de cada grafo.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Gestos em Mobile</h4>
                    <p className="text-muted-foreground">
                      Toque para selecionar, arraste para mover vértices e use dois dedos para aplicar zoom. Em modo retrato, a barra de ferramentas
                      fica na vertical e pode ser arrastada para liberar espaço no canvas.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Exportar</h4>
                    <p className="text-muted-foreground">Clique no ícone de download no cabeçalho para exportar o canvas como PNG ou JPEG.</p>
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

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 sm:h-8 sm:w-8"
                  onClick={() => setRightOpen(true)}
                  aria-label="Abrir painel de propriedades"
                >
                  <PanelRightOpen className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Propriedades</TooltipContent>
            </Tooltip>
          </div>
        </header>

        <Sheet open={leftOpen} onOpenChange={setLeftOpen}>
          <SheetContent side="left" className="w-[85vw] max-w-xs p-0 flex flex-col">
            <GraphManager />
          </SheetContent>
        </Sheet>

        <Sheet open={rightOpen} onOpenChange={setRightOpen}>
          <SheetContent side="right" className="w-[90vw] max-w-sm p-0 flex flex-col">
            <RightPanelContent />
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
            <div ref={canvasWrapperRef} className="flex-1 p-1.5 sm:p-4 overflow-hidden relative">
              <GraphCanvas ref={canvasRef} zoom={zoom} onZoomChange={setZoom} showAllGraphs={true} viewportRef={viewportRef} />
              <GraphLayersOverlay viewportRef={viewportRef} />
              {isEmpty && <EmptyGraphState onCreate={() => createGraph()} />}
              <FloatingToolbar
                containerRef={canvasWrapperRef}
                zoom={zoom}
                onZoomChange={setZoom}
                onReset={handleReset}
                onFitView={handleFitView}
              />
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
