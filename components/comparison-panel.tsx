"use client"

import { useState, useMemo } from "react"
import { CheckCircle2, XCircle, GitCompare, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { checkIsomorphism, analyzeGraph, calculateDegrees } from "@/lib/graph-algorithms"
import { GraphCanvas } from "./graph-canvas"

export function ComparisonPanel() {
  const { graphs, activeGraphId } = useGraphStore()
  const [compareGraphId, setCompareGraphId] = useState<string>("")

  const activeGraph = graphs.find((g) => g.id === activeGraphId)
  const compareGraph = graphs.find((g) => g.id === compareGraphId)

  const isomorphismResult = useMemo(() => {
    if (!activeGraph || !compareGraph) return null
    return checkIsomorphism(activeGraph, compareGraph)
  }, [activeGraph, compareGraph])

  const activeAnalysis = useMemo(() => {
    if (!activeGraph) return null
    return analyzeGraph(activeGraph)
  }, [activeGraph])

  const compareAnalysis = useMemo(() => {
    if (!compareGraph) return null
    return analyzeGraph(compareGraph)
  }, [compareGraph])

  const activeDegrees = useMemo(() => {
    if (!activeGraph) return null
    return calculateDegrees(activeGraph)
  }, [activeGraph])

  const compareDegrees = useMemo(() => {
    if (!compareGraph) return null
    return calculateDegrees(compareGraph)
  }, [compareGraph])

  if (!activeGraph) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Nenhum grafo selecionado
      </div>
    )
  }

  const otherGraphs = graphs.filter((g) => g.id !== activeGraphId)

  return (
    <div className="p-4 space-y-6 overflow-auto max-h-[calc(100vh-200px)]">
      <div className="space-y-3">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <GitCompare className="h-4 w-4" />
          Comparar Grafos
        </h4>

        <div className="flex items-center gap-2">
          <div className="flex-1 p-2 bg-muted rounded-md text-center">
            <p className="text-xs text-muted-foreground">Grafo Atual</p>
            <p className="font-medium text-sm">{activeGraph.name}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <Select value={compareGraphId} onValueChange={setCompareGraphId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecione um grafo" />
            </SelectTrigger>
            <SelectContent>
              {otherGraphs.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {otherGraphs.length === 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Crie outro grafo para poder comparar
          </p>
        )}
      </div>

      {compareGraph && (
        <>
          <Separator />

          {/* Isomorphism Check */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Verificação de Isomorfismo</h4>

            <div
              className={`p-3 rounded-md border ${
                isomorphismResult?.isIsomorphic
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-red-500/10 border-red-500/30"
              }`}
            >
              <div className="flex items-center gap-2">
                {isomorphismResult?.isIsomorphic ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium">
                  {isomorphismResult?.isIsomorphic
                    ? "Os grafos SÃO isomorfos"
                    : "Os grafos NÃO são isomorfos"}
                </span>
              </div>
              {isomorphismResult?.reason && (
                <p className="text-xs text-muted-foreground mt-1">
                  {isomorphismResult.reason}
                </p>
              )}
              {isomorphismResult?.mapping && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Mapeamento:</p>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(isomorphismResult.mapping.entries()).map(([v1, v2]) => {
                      const label1 = activeGraph.vertices.find((v) => v.id === v1)?.label || v1
                      const label2 = compareGraph.vertices.find((v) => v.id === v2)?.label || v2
                      return (
                        <Badge key={v1} variant="secondary" className="text-xs">
                          {label1} ↔ {label2}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Side by Side Comparison */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Comparação de Propriedades</h4>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="font-medium text-muted-foreground">Propriedade</div>
              <div className="font-medium text-center">{activeGraph.name}</div>
              <div className="font-medium text-center">{compareGraph.name}</div>

              <div>Vértices</div>
              <div className="text-center">{activeGraph.vertices.length}</div>
              <div className="text-center">{compareGraph.vertices.length}</div>

              <div>Arestas</div>
              <div className="text-center">{activeGraph.edges.length}</div>
              <div className="text-center">{compareGraph.edges.length}</div>

              <div>Direcionado</div>
              <div className="text-center">{activeGraph.directed ? "Sim" : "Não"}</div>
              <div className="text-center">{compareGraph.directed ? "Sim" : "Não"}</div>

              <div>Ponderado</div>
              <div className="text-center">{activeGraph.weighted ? "Sim" : "Não"}</div>
              <div className="text-center">{compareGraph.weighted ? "Sim" : "Não"}</div>

              <div>Conexo</div>
              <div className="text-center">
                <StatusIcon value={activeAnalysis?.isConnected} />
              </div>
              <div className="text-center">
                <StatusIcon value={compareAnalysis?.isConnected} />
              </div>

              <div>Bipartido</div>
              <div className="text-center">
                <StatusIcon value={activeAnalysis?.isBipartite} />
              </div>
              <div className="text-center">
                <StatusIcon value={compareAnalysis?.isBipartite} />
              </div>

              <div>Tem Ciclo</div>
              <div className="text-center">
                <StatusIcon value={activeAnalysis?.hasCycle} />
              </div>
              <div className="text-center">
                <StatusIcon value={compareAnalysis?.hasCycle} />
              </div>

              <div>É Árvore</div>
              <div className="text-center">
                <StatusIcon value={activeAnalysis?.isTree} />
              </div>
              <div className="text-center">
                <StatusIcon value={compareAnalysis?.isTree} />
              </div>

              <div>Completo</div>
              <div className="text-center">
                <StatusIcon value={activeAnalysis?.isComplete} />
              </div>
              <div className="text-center">
                <StatusIcon value={compareAnalysis?.isComplete} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Degree Sequences */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Sequência de Graus</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{activeGraph.name}</p>
                <p className="font-mono text-sm">
                  [{Array.from(activeDegrees?.degree.values() || [])
                    .sort((a, b) => b - a)
                    .join(", ")}]
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{compareGraph.name}</p>
                <p className="font-mono text-sm">
                  [{Array.from(compareDegrees?.degree.values() || [])
                    .sort((a, b) => b - a)
                    .join(", ")}]
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Visual Comparison */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Visualização</h4>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground text-center">{activeGraph.name}</p>
                <div className="h-48 border border-border rounded-md overflow-hidden">
                  <GraphCanvas graphId={activeGraph.id} readOnly width={200} height={192} />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground text-center">{compareGraph.name}</p>
                <div className="h-48 border border-border rounded-md overflow-hidden">
                  <GraphCanvas graphId={compareGraph.id} readOnly width={200} height={192} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatusIcon({ value }: { value?: boolean }) {
  if (value === undefined) return <span className="text-muted-foreground">-</span>
  return value ? (
    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 inline" />
  ) : (
    <XCircle className="h-3.5 w-3.5 text-red-500 inline" />
  )
}
