"use client"

import { useEffect, useState, useRef } from "react"
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
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { GraphCanvas, type GraphCanvasRef } from "@/components/graph-canvas"
import { GraphToolbar } from "@/components/graph-toolbar"
import { GraphManager } from "@/components/graph-manager"
import { PropertiesPanel } from "@/components/properties-panel"
import { MatrixPanel } from "@/components/matrix-panel"
import { AnalysisPanel } from "@/components/analysis-panel"
import { ComparisonPanel } from "@/components/comparison-panel"
import { useGraphStore } from "@/lib/graph-store"

export default function GraphSimulator() {
  const { setTool, tool } = useGraphStore()
  const [zoom, setZoom] = useState(1)
  const canvasRef = useRef<GraphCanvasRef>(null)

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key.toLowerCase()) {
        case "v":
          setTool("select")
          break
        case "n":
          setTool("vertex")
          break
        case "e":
          setTool("edge")
          break
        case "d":
          setTool("delete")
          break
        case "h":
          setTool("pan")
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [setTool])

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-background text-foreground">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Network className="h-5 w-5 text-primary" />
              </div>
              <h1 className="font-bold text-lg">GraphLab</h1>
            </div>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Simulador de Teoria dos Grafos
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Keyboard className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Atalhos de Teclado</DialogTitle>
                  <DialogDescription>Use atalhos para trabalhar mais rapido.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>Selecionar</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">V</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Novo Vértice</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">N</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Nova Aresta</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">E</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Excluir</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">D</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Mover Canvas</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">H</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Deletar Seleção</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">Delete</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Cancelar</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">Esc</kbd>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
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
                    <p className="text-muted-foreground">
                      Selecione a ferramenta de vértice (N) e clique no canvas para adicionar vértices.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Criar Arestas</h4>
                    <p className="text-muted-foreground">
                      Selecione a ferramenta de aresta (E), clique em um vértice de origem e depois no vértice de destino.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Editar Propriedades</h4>
                    <p className="text-muted-foreground">
                      Selecione um vértice ou aresta para editar seu nome, cor ou peso no painel direito.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Analisar Grafo</h4>
                    <p className="text-muted-foreground">
                      Use as abas Análise e Matrizes para ver propriedades, rodar algoritmos e exportar matrizes.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Comparar Grafos</h4>
                    <p className="text-muted-foreground">
                      Crie múltiplos grafos e use a aba Comparar para verificar isomorfismo e outras propriedades.
                    </p>
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

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Graph Manager */}
          <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col">
            <GraphManager />
          </aside>

          {/* Main Canvas Area */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="p-2 border-b border-border flex items-center justify-between">
              <GraphToolbar />
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Ferramenta:</span>
                  <span className="font-medium text-foreground capitalize">
                    {tool === "select" && "Selecionar"}
                    {tool === "vertex" && "Vértice"}
                    {tool === "edge" && "Aresta"}
                    {tool === "delete" && "Excluir"}
                    {tool === "pan" && "Mover"}
                  </span>
                </div>

                <div className="flex items-center gap-2 border-l border-border pl-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Diminuir Zoom</TooltipContent>
                  </Tooltip>

                  <div className="flex items-center gap-2 w-32">
                    <Slider
                      value={[zoom * 100]}
                      min={10}
                      max={300}
                      step={10}
                      onValueChange={([val]) => setZoom(val / 100)}
                      className="w-20"
                    />
                    <Input
                      type="number"
                      value={Math.round(zoom * 100)}
                      onChange={(e) => {
                        const val = parseInt(e.target.value)
                        if (!isNaN(val)) {
                          setZoom(Math.max(0.1, Math.min(3, val / 100)))
                        }
                      }}
                      className="w-14 h-7 text-xs text-center"
                      min={10}
                      max={300}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Aumentar Zoom</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => canvasRef.current?.resetView()}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Resetar Vista</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 p-4 overflow-hidden">
              <GraphCanvas ref={canvasRef} zoom={zoom} onZoomChange={setZoom} />
            </div>
          </main>

          {/* Right Sidebar - Properties & Tools */}
          <aside className="w-80 border-l border-border bg-card hidden lg:flex flex-col">
            <Tabs defaultValue="properties" className="flex flex-col h-full">
              <TabsList className="w-full rounded-none border-b border-border bg-transparent p-0 h-auto">
                <TabsTrigger
                  value="properties"
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Settings2 className="h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent>Propriedades</TooltipContent>
                  </Tooltip>
                </TabsTrigger>
                <TabsTrigger
                  value="matrix"
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Grid3X3 className="h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent>Matrizes</TooltipContent>
                  </Tooltip>
                </TabsTrigger>
                <TabsTrigger
                  value="analysis"
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <BarChart3 className="h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent>Análise</TooltipContent>
                  </Tooltip>
                </TabsTrigger>
                <TabsTrigger
                  value="compare"
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <GitCompare className="h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent>Comparar</TooltipContent>
                  </Tooltip>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="properties" className="flex-1 m-0 overflow-auto">
                <PropertiesPanel />
              </TabsContent>
              <TabsContent value="matrix" className="flex-1 m-0 overflow-auto">
                <MatrixPanel />
              </TabsContent>
              <TabsContent value="analysis" className="flex-1 m-0 overflow-auto">
                <AnalysisPanel />
              </TabsContent>
              <TabsContent value="compare" className="flex-1 m-0 overflow-auto">
                <ComparisonPanel />
              </TabsContent>
            </Tabs>
          </aside>
        </div>
      </div>
    </TooltipProvider>
  )
}
