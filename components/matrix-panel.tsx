"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Copy, Download, Image } from "lucide-react";
import { useGraphStore } from "@/lib/graph-store";
import { getAdjacencyMatrix, getIncidenceMatrix } from "@/lib/graph-algorithms";
import { cn } from "@/lib/utils";

function exportMatrixAsImage(matrix: number[][], rowLabels: string[], colLabels: string[], title: string, filename: string) {
  const cellSize = 48;
  const headerSize = 48;
  const padding = 20;
  const fontSize = 13;

  const cols = colLabels.length;
  const rows = rowLabels.length;
  const width = padding * 2 + headerSize + cols * cellSize;
  const height = padding * 2 + headerSize + rows * cellSize;

  const canvas = document.createElement("canvas");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = "#0f0f13";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#e2e8f0";
  ctx.font = `600 14px 'Inter', system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText(title, padding, padding - 4);

  const ox = padding + headerSize;
  const oy = padding + headerSize;

  ctx.font = `500 ${fontSize}px 'Inter', system-ui, sans-serif`;
  ctx.textAlign = "center";
  colLabels.forEach((label, j) => {
    const x = ox + j * cellSize + cellSize / 2;
    const y = padding + headerSize / 2 + fontSize / 3;
    ctx.fillStyle = "#7dd3fc";
    ctx.fillText(label, x, y);
  });

  ctx.textAlign = "center";
  rowLabels.forEach((label, i) => {
    const x = padding + headerSize / 2;
    const y = oy + i * cellSize + cellSize / 2 + fontSize / 3;
    ctx.fillStyle = "#7dd3fc";
    ctx.fillText(label, x, y);
  });

  matrix.forEach((row, i) => {
    row.forEach((cell, j) => {
      const x = ox + j * cellSize;
      const y = oy + i * cellSize;
      const isActive = cell !== 0;

      ctx.fillStyle = isActive ? "rgba(125,211,252,0.15)" : "rgba(255,255,255,0.03)";
      ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

      ctx.strokeStyle = isActive ? "rgba(125,211,252,0.3)" : "rgba(255,255,255,0.08)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);

      ctx.fillStyle = isActive ? "#7dd3fc" : "#64748b";
      ctx.font = `${isActive ? "600" : "400"} ${fontSize}px 'Inter', system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(String(cell), x + cellSize / 2, y + cellSize / 2 + fontSize / 3);
    });
  });

  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.strokeRect(ox + 0.5, oy + 0.5, cols * cellSize - 1, rows * cellSize - 1);

  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export function MatrixPanel() {
  const { graphs, activeGraphId } = useGraphStore();
  const activeGraph = graphs.find((g) => g.id === activeGraphId);
  const [copiedMatrix, setCopiedMatrix] = useState<string | null>(null);

  if (!activeGraph || activeGraph.vertices.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        {!activeGraph ? "Nenhum grafo selecionado" : "Adicione vértices para ver as matrizes"}
      </div>
    );
  }

  const adjMatrix = getAdjacencyMatrix(activeGraph);
  const incMatrix = getIncidenceMatrix(activeGraph);

  function copyMatrix(matrix: number[][], labels: string[], type: string) {
    const header = "\t" + labels.join("\t");
    const rows = matrix.map((row, i) => labels[i] + "\t" + row.join("\t"));
    const text = header + "\n" + rows.join("\n");
    navigator.clipboard.writeText(text);
    setCopiedMatrix(type);
    setTimeout(() => setCopiedMatrix(null), 2000);
  }

  function downloadCSV(matrix: number[][], labels: string[], filename: string) {
    const header = "," + labels.join(",");
    const rows = matrix.map((row, i) => labels[i] + "," + row.join(","));
    const csv = header + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4">
      <Tabs defaultValue="adjacency">
        <TabsList className="w-full">
          <TabsTrigger value="adjacency" className="flex-1">
            Adjacência
          </TabsTrigger>
          <TabsTrigger value="incidence" className="flex-1">
            Incidência
          </TabsTrigger>
        </TabsList>

        <TabsContent value="adjacency" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Matriz de Adjacência</h4>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Copiar"
                onClick={() => copyMatrix(adjMatrix.matrix, adjMatrix.labels, "adj")}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Exportar CSV"
                onClick={() => downloadCSV(adjMatrix.matrix, adjMatrix.labels, "matriz_adjacencia.csv")}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Exportar como imagem"
                onClick={() =>
                  exportMatrixAsImage(
                    adjMatrix.matrix,
                    adjMatrix.labels,
                    adjMatrix.labels,
                    `Matriz de Adjacência — ${activeGraph.name}`,
                    `adj_${activeGraph.name.replace(/\s/g, "_")}.png`,
                  )
                }
              >
                <Image className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {copiedMatrix === "adj" && <p className="text-xs text-green-500">Copiado!</p>}

          <div className="overflow-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr>
                  <th className="p-1.5 border border-border bg-muted/50"></th>
                  {adjMatrix.labels.map((label) => (
                    <th key={label} className="p-1.5 border border-border bg-muted/50 font-medium min-w-8">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {adjMatrix.matrix.map((row, i) => (
                  <tr key={i}>
                    <th className="p-1.5 border border-border bg-muted/50 font-medium">{adjMatrix.labels[i]}</th>
                    {row.map((cell, j) => (
                      <td key={j} className={cn("p-1.5 border border-border text-center", cell > 0 && "bg-primary/20 text-primary font-medium")}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">
            {activeGraph.directed ? "Matriz[i][j] = peso da aresta de i para j" : "Matriz simétrica: Matriz[i][j] = Matriz[j][i]"}
          </p>
        </TabsContent>

        <TabsContent value="incidence" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Matriz de Incidência</h4>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Copiar"
                onClick={() => copyMatrix(incMatrix.matrix, incMatrix.edgeLabels, "inc")}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Exportar CSV"
                onClick={() => downloadCSV(incMatrix.matrix, incMatrix.edgeLabels, "matriz_incidencia.csv")}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Exportar como imagem"
                onClick={() =>
                  exportMatrixAsImage(
                    incMatrix.matrix,
                    incMatrix.vertexLabels,
                    incMatrix.edgeLabels,
                    `Matriz de Incidência — ${activeGraph.name}`,
                    `inc_${activeGraph.name.replace(/\s/g, "_")}.png`,
                  )
                }
              >
                <Image className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {copiedMatrix === "inc" && <p className="text-xs text-green-500">Copiado!</p>}

          {activeGraph.edges.length === 0 ? (
            <p className="text-xs text-muted-foreground">Adicione arestas para ver a matriz de incidência</p>
          ) : (
            <div className="overflow-auto">
              <table className="text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="p-1.5 border border-border bg-muted/50"></th>
                    {incMatrix.edgeLabels.map((label) => (
                      <th key={label} className="p-1.5 border border-border bg-muted/50 font-medium min-w-8">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {incMatrix.matrix.map((row, i) => (
                    <tr key={i}>
                      <th className="p-1.5 border border-border bg-muted/50 font-medium">{incMatrix.vertexLabels[i]}</th>
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          className={cn(
                            "p-1.5 border border-border text-center",
                            cell === 1 && "bg-green-500/20 text-green-500 font-medium",
                            cell === -1 && "bg-red-500/20 text-red-500 font-medium",
                          )}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-muted-foreground">{activeGraph.directed ? "-1 = origem, 1 = destino" : "1 = vértice incidente na aresta"}</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
