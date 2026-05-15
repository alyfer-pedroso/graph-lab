"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Wand2, Palette, RotateCcw } from "lucide-react";
import { useGraphStore } from "@/lib/graph-store";
import { calculateChromaticNumber, CHROMATIC_COLORS } from "@/lib/graph-algorithms";

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
];

export function PropertiesPanel() {
  const { graphs, activeGraphId, selectedVertexIds, selectedEdgeIds, updateVertex, updateEdge, updateGraph, autoLabelVertices, autoLabelEdges } =
    useGraphStore();

  const activeGraph = graphs.find((g) => g.id === activeGraphId);
  const selectedVertex = selectedVertexIds.length === 1 ? activeGraph?.vertices.find((v) => v.id === selectedVertexIds[0]) : null;
  const selectedEdge = selectedEdgeIds.length === 1 ? activeGraph?.edges.find((e) => e.id === selectedEdgeIds[0]) : null;

  const [vertexLabel, setVertexLabel] = useState("");
  const [edgeLabel, setEdgeLabel] = useState("");
  const [edgeWeight, setEdgeWeight] = useState("");
  const [chromaticResult, setChromaticResult] = useState<{ chromaticNumber: number; error?: string } | null>(null);

  function applyChromaticColoring() {
    if (!activeGraph) return;
    const result = calculateChromaticNumber(activeGraph);
    if (!result) {
      setChromaticResult({ chromaticNumber: 0, error: "Grafo contém laços — número cromático indefinido" });
      return;
    }
    result.colorMap.forEach((colorIdx, vertexId) => {
      const color = CHROMATIC_COLORS[colorIdx % CHROMATIC_COLORS.length];
      updateVertex(vertexId, { color });
    });
    setChromaticResult({ chromaticNumber: result.chromaticNumber });
  }

  function resetColoring() {
    if (!activeGraph) return;
    const defaultColor = activeGraph.defaultVertexColor || "#6366f1";
    activeGraph.vertices.forEach((v) => {
      updateVertex(v.id, { color: defaultColor });
    });
    setChromaticResult(null);
  }

  useEffect(() => {
    if (selectedVertex) {
      setVertexLabel(selectedVertex.label);
    }
  }, [selectedVertex]);

  useEffect(() => {
    if (selectedEdge) {
      setEdgeLabel(selectedEdge.label || "");
      setEdgeWeight(selectedEdge.weight?.toString() || "");
    }
  }, [selectedEdge]);

  if (!activeGraph) {
    return <div className="p-4 text-center text-muted-foreground text-sm">Nenhum grafo selecionado</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold text-sm">Propriedades do Grafo</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="directed" className="text-sm">
              Dígrafo
            </Label>
            <Switch id="directed" checked={activeGraph.directed} onCheckedChange={(checked) => updateGraph(activeGraph.id, { directed: checked })} />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="weighted" className="text-sm">
              Ponderado
            </Label>
            <Switch id="weighted" checked={activeGraph.weighted} onCheckedChange={(checked) => updateGraph(activeGraph.id, { weighted: checked })} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{activeGraph.vertices.length} vértices</Badge>
          <Badge variant="secondary">{activeGraph.edges.length} arestas</Badge>
        </div>

        <div className="space-y-2">
          <Button variant="outline" size="sm" className="w-full" onClick={autoLabelVertices}>
            <Wand2 className="h-4 w-4 mr-2" />
            Auto-nomear Vértices (A, B, C...)
          </Button>
          <Button variant="outline" size="sm" className="w-full" onClick={autoLabelEdges}>
            <Wand2 className="h-4 w-4 mr-2" />
            Auto-nomear Arestas (e1, e2...)
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Número Cromático</h3>
        <p className="text-xs text-muted-foreground">
          Calcula a quantidade mínima de cores para colorir vértices de modo que nenhum vértice adjacente compartilhe a mesma cor.
        </p>
        <div className="space-y-2">
          <Button variant="default" size="sm" className="w-full" onClick={applyChromaticColoring} disabled={!activeGraph || activeGraph.vertices.length === 0}>
            <Palette className="h-4 w-4 mr-2" />
            Calcular e Colorir
          </Button>
          <Button variant="outline" size="sm" className="w-full" onClick={resetColoring} disabled={!activeGraph || activeGraph.vertices.length === 0}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Resetar Cores
          </Button>
        </div>
        {chromaticResult && (
          <div className={`p-2 rounded-md border ${chromaticResult.error ? "bg-destructive/10 border-destructive/30" : "bg-primary/10 border-primary/30"}`}>
            {chromaticResult.error ? (
              <p className="text-xs text-destructive font-medium">{chromaticResult.error}</p>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-medium">
                  χ(G) = <span className="text-primary text-base font-bold">{chromaticResult.chromaticNumber}</span>
                </p>
                <p className="text-xs text-muted-foreground">{chromaticResult.chromaticNumber} cor(es) necessária(s) para colorir o grafo.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Separator />

      {selectedVertex && (
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Vértice Selecionado</h3>

          <div className="space-y-2">
            <Label htmlFor="vertex-label">Nome</Label>
            <Input
              id="vertex-label"
              value={vertexLabel}
              onChange={(e) => setVertexLabel(e.target.value)}
              onBlur={() => updateVertex(selectedVertex.id, { label: vertexLabel })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateVertex(selectedVertex.id, { label: vertexLabel });
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="grid grid-cols-8 gap-1">
              {COLORS.map((color) => (
                <button
                  key={color}
                  className="w-6 h-6 rounded-md border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor: selectedVertex.color === color ? "#fff" : "transparent",
                  }}
                  onClick={() => updateVertex(selectedVertex.id, { color })}
                />
              ))}
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Posição: ({Math.round(selectedVertex.x)}, {Math.round(selectedVertex.y)})
          </div>
        </div>
      )}

      {selectedEdge && (
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Aresta Selecionada</h3>

          <div className="space-y-2">
            <Label htmlFor="edge-label">Nome</Label>
            <Input
              id="edge-label"
              value={edgeLabel}
              onChange={(e) => setEdgeLabel(e.target.value)}
              onBlur={() => updateEdge(selectedEdge.id, { label: edgeLabel })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateEdge(selectedEdge.id, { label: edgeLabel });
                }
              }}
            />
          </div>

          {activeGraph.weighted && (
            <div className="space-y-2">
              <Label htmlFor="edge-weight">Peso</Label>
              <Input
                id="edge-weight"
                type="number"
                value={edgeWeight}
                onChange={(e) => setEdgeWeight(e.target.value)}
                onBlur={() => {
                  const weight = parseFloat(edgeWeight);
                  if (!isNaN(weight)) {
                    updateEdge(selectedEdge.id, { weight });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const weight = parseFloat(edgeWeight);
                    if (!isNaN(weight)) {
                      updateEdge(selectedEdge.id, { weight });
                    }
                  }
                }}
              />
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            {activeGraph.vertices.find((v) => v.id === selectedEdge.source)?.label} →{" "}
            {activeGraph.vertices.find((v) => v.id === selectedEdge.target)?.label}
          </div>
        </div>
      )}

      {!selectedVertex && !selectedEdge && (
        <div className="text-center text-muted-foreground text-sm">Selecione um vértice ou aresta para editar suas propriedades</div>
      )}
    </div>
  );
}
