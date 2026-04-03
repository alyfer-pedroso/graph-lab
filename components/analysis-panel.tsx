"use client"

import { useState, useMemo } from "react"
import { CheckCircle2, XCircle, Play, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useGraphStore } from "@/lib/graph-store"
import {
  analyzeGraph,
  bfs,
  dfs,
  dijkstra,
  calculateDegrees,
} from "@/lib/graph-algorithms"
import type { PathResult } from "@/lib/graph-types"

export function AnalysisPanel() {
  const { graphs, activeGraphId } = useGraphStore()
  const activeGraph = graphs.find((g) => g.id === activeGraphId)

  const [startVertex, setStartVertex] = useState<string>("")
  const [endVertex, setEndVertex] = useState<string>("")
  const [searchResult, setSearchResult] = useState<string[] | null>(null)
  const [pathResult, setPathResult] = useState<PathResult | null>(null)
  const [searchType, setSearchType] = useState<"bfs" | "dfs">("bfs")

  const analysis = useMemo(() => {
    if (!activeGraph) return null
    return analyzeGraph(activeGraph)
  }, [activeGraph])

  const degrees = useMemo(() => {
    if (!activeGraph) return null
    return calculateDegrees(activeGraph)
  }, [activeGraph])

  if (!activeGraph) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Nenhum grafo selecionado
      </div>
    )
  }

  function runSearch() {
    if (!activeGraph || !startVertex) return
    const result = searchType === "bfs"
      ? bfs(activeGraph, startVertex)
      : dfs(activeGraph, startVertex)
    setSearchResult(result)
  }

  function runDijkstra() {
    if (!activeGraph || !startVertex || !endVertex) return
    const result = dijkstra(activeGraph, startVertex, endVertex)
    setPathResult(result)
  }

  function resetResults() {
    setSearchResult(null)
    setPathResult(null)
  }

  function getVertexLabel(id: string): string {
    return activeGraph?.vertices.find((v) => v.id === id)?.label || id
  }

  return (
    <div className="p-4 space-y-6 overflow-auto max-h-[calc(100vh-200px)]">
      {/* Graph Properties */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm">Propriedades do Grafo</h4>
        
        <div className="grid grid-cols-2 gap-2">
          <PropertyBadge
            label="Conexo"
            value={analysis?.isConnected}
          />
          <PropertyBadge
            label="Bipartido"
            value={analysis?.isBipartite}
          />
          <PropertyBadge
            label="Tem Ciclo"
            value={analysis?.hasCycle}
          />
          <PropertyBadge
            label="Tem Loops"
            value={analysis?.hasLoops}
          />
          <PropertyBadge
            label="É Árvore"
            value={analysis?.isTree}
          />
          <PropertyBadge
            label="Completo"
            value={analysis?.isComplete}
          />
        </div>
        
        {analysis?.hasLoops && (
          <div className="mt-2 p-2 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground">
              Loops (lacos): <span className="font-medium text-foreground">{analysis.loopCount}</span>
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* Degrees */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm">Graus dos Vértices</h4>
        
        {activeGraph.vertices.length === 0 ? (
          <p className="text-xs text-muted-foreground">Adicione vértices para ver os graus</p>
        ) : (
          <div className="space-y-1">
            {activeGraph.vertices.map((vertex) => {
              const degree = degrees?.degree.get(vertex.id) || 0
              const inDeg = degrees?.inDegree?.get(vertex.id)
              const outDeg = degrees?.outDegree?.get(vertex.id)

              return (
                <div key={vertex.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{vertex.label}</span>
                  <div className="flex gap-2">
                    {activeGraph.directed ? (
                      <>
                        <Badge variant="outline" className="text-xs">
                          in: {inDeg}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          out: {outDeg}
                        </Badge>
                      </>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        grau: {degree}
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Separator />

      {/* Search */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm">Busca (BFS/DFS)</h4>
        
        <div className="space-y-2">
          <div className="flex gap-2">
            <Select value={searchType} onValueChange={(v) => setSearchType(v as "bfs" | "dfs")}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bfs">BFS</SelectItem>
                <SelectItem value="dfs">DFS</SelectItem>
              </SelectContent>
            </Select>

            <Select value={startVertex} onValueChange={setStartVertex}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Início" />
              </SelectTrigger>
              <SelectContent>
                {activeGraph.vertices.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="icon" onClick={runSearch} disabled={!startVertex}>
              <Play className="h-4 w-4" />
            </Button>
          </div>

          {searchResult && (
            <div className="p-2 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground mb-1">
                Ordem de visita ({searchType.toUpperCase()}):
              </p>
              <p className="text-sm font-mono">
                {searchResult.map(getVertexLabel).join(" → ")}
              </p>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Shortest Path */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm">Caminho Mínimo (Dijkstra)</h4>
        
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Origem</Label>
              <Select value={startVertex} onValueChange={setStartVertex}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {activeGraph.vertices.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Destino</Label>
              <Select value={endVertex} onValueChange={setEndVertex}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {activeGraph.vertices.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={runDijkstra}
              disabled={!startVertex || !endVertex}
            >
              <Play className="h-4 w-4 mr-2" />
              Calcular
            </Button>
            <Button variant="outline" size="icon" onClick={resetResults}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {pathResult && (
            <div className="p-2 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground mb-1">Caminho encontrado:</p>
              <p className="text-sm font-mono">
                {pathResult.path.map(getVertexLabel).join(" → ")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Distância: <span className="font-medium">{pathResult.distance}</span>
              </p>
            </div>
          )}

          {pathResult === null && startVertex && endVertex && (
            <p className="text-xs text-muted-foreground">
              Clique em Calcular para encontrar o caminho mínimo
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function PropertyBadge({ label, value }: { label: string; value?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {value ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-red-500" />
      )}
      <span>{label}</span>
    </div>
  )
}
