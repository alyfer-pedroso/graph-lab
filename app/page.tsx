"use client";

import { useEffect, useState, useRef } from "react";
import {
  Network,
  Settings2,
  Grid3X3,
  BarChart3,
  GitCompare,
  HelpCircle,
  Keyboard,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Github,
  Linkedin,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Download,
  Menu,
  Layers,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { GraphCanvas, type GraphCanvasRef } from "@/components/graph-canvas";
import { GraphToolbar } from "@/components/graph-toolbar";
import { GraphManager } from "@/components/graph-manager";
import { PropertiesPanel } from "@/components/properties-panel";
import { MatrixPanel } from "@/components/matrix-panel";
import { AnalysisPanel } from "@/components/analysis-panel";
import { ComparisonPanel } from "@/components/comparison-panel";
import { useGraphStore } from "@/lib/graph-store";

export default function GraphSimulator() {
  const { setTool, tool } = useGraphStore();
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<GraphCanvasRef>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("properties");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
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
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setTool]);

  const toolLabel: Record<string, string> = {
    select: "Selecionar",
    vertex: "Vértice",
    edge: "Aresta",
    delete: "Excluir",
    pan: "Mover",
  };

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
            <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
              <Network className="h-4 w-4 text-primary" />
            </div>
            <h1 className="font-bold text-base truncate">GraphLab</h1>
            <span className="text-xs text-muted-foreground hidden sm:inline truncate">Simulador de Teoria dos Grafos</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
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
                <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex">
                  <Keyboard className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Atalhos de Teclado</DialogTitle>
                  <DialogDescription>Use atalhos para trabalhar mais rápido.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-2 text-sm">
                  {[
                    ["Selecionar", "V"],
                    ["Novo Vértice", "N"],
                    ["Nova Aresta", "E"],
                    ["Excluir", "D"],
                    ["Mover Canvas", "H"],
                    ["Deletar Seleção", "Delete"],
                    ["Cancelar", "Esc"],
                  ].map(([label, key]) => (
                    <div key={key} className="flex justify-between">
                      <span>{label}</span>
                      <kbd className="px-2 py-1 bg-muted rounded text-xs">{key}</kbd>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Como Usar</DialogTitle>
                  <DialogDescription>Aprenda a usar o simulador de grafos.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-1">Criar Vértices</h4>
                    <p className="text-muted-foreground">Selecione a ferramenta de vértice (N) e clique no canvas.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Criar Arestas</h4>
                    <p className="text-muted-foreground">Selecione a ferramenta de aresta (E), clique no vértice origem e depois no destino.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Camadas de Grafos</h4>
                    <p className="text-muted-foreground">
                      Use a barra lateral esquerda para controlar opacidade, visibilidade e posição de cada grafo. Na ferramenta Mover (H), arraste a
                      área vazia para mover o grafo ativo como camada.
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
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {leftOpen && (
            <aside className="w-60 border-r border-border bg-card hidden md:flex flex-col shrink-0 transition-all">
              <GraphManager />
            </aside>
          )}

          <main className="flex-1 flex flex-col overflow-hidden min-w-0">
            <div className="p-2 border-b border-border flex items-center gap-2 shrink-0 flex-wrap">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hidden md:flex shrink-0" onClick={() => setLeftOpen(!leftOpen)}>
                    {leftOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{leftOpen ? "Ocultar painel esquerdo" : "Mostrar painel esquerdo"}</TooltipContent>
              </Tooltip>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden shrink-0">
                    <Layers className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <GraphManager />
                </SheetContent>
              </Sheet>

              <GraphToolbar />

              <div className="flex items-center gap-1 ml-auto shrink-0 flex-wrap">
                <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground border-r border-border pr-2 mr-1">
                  <span>Ferramenta:</span>
                  <span className="font-medium text-foreground">{toolLabel[tool] || tool}</span>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Diminuir Zoom</TooltipContent>
                </Tooltip>

                <div className="hidden sm:flex items-center gap-1">
                  <Slider value={[zoom * 100]} min={10} max={300} step={10} onValueChange={([val]) => setZoom(val / 100)} className="w-16" />
                  <Input
                    type="number"
                    value={Math.round(zoom * 100)}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) setZoom(Math.max(0.1, Math.min(3, val / 100)));
                    }}
                    className="w-14 h-7 text-xs text-center [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
                    min={10}
                    max={300}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.min(3, zoom + 0.1))}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Aumentar Zoom</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => canvasRef.current?.resetView()}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Resetar Vista</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 hidden lg:flex" onClick={() => setRightOpen(!rightOpen)}>
                      {rightOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{rightOpen ? "Ocultar painel direito" : "Mostrar painel direito"}</TooltipContent>
                </Tooltip>

                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80 p-0">
                    <RightPanelContent />
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            <div className="flex-1 p-2 sm:p-4 overflow-hidden">
              <GraphCanvas ref={canvasRef} zoom={zoom} onZoomChange={setZoom} showAllGraphs={true} />
            </div>
          </main>

          {rightOpen && (
            <aside className="w-80 border-l border-border bg-card hidden lg:flex flex-col shrink-0 transition-all">
              <RightPanelContent />
            </aside>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
