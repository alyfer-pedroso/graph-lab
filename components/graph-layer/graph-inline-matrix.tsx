"use client";

import { useState } from "react";
import { X, Copy, Download, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Graph } from "@/lib/graph-types";
import { getAdjacencyMatrix, getIncidenceMatrix } from "@/lib/graph-algorithms";
import { computeSingleGraphBounds, VERTEX_RADIUS } from "@/core/domain/graph/graph-bounds";
import { useGraphStore } from "@/lib/graph-store";

const TITLE_HEIGHT = 24;
const CONTAINER_PADDING = VERTEX_RADIUS + 8;
const MATRIX_GAP = 16;

interface GraphInlineMatrixProps {
  graph: Graph;
}

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
    ctx.fillStyle = "#7dd3fc";
    ctx.fillText(label, ox + j * cellSize + cellSize / 2, padding + headerSize / 2 + fontSize / 3);
  });
  rowLabels.forEach((label, i) => {
    ctx.fillStyle = "#7dd3fc";
    ctx.fillText(label, padding + headerSize / 2, oy + i * cellSize + cellSize / 2 + fontSize / 3);
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
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
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

export function GraphInlineMatrix({ graph }: GraphInlineMatrixProps) {
  const { updateGraph } = useGraphStore();
  const [copied, setCopied] = useState(false);

  const bounds = computeSingleGraphBounds(graph, CONTAINER_PADDING, CONTAINER_PADDING, CONTAINER_PADDING);
  if (!bounds) return null;
  if (graph.vertices.length === 0) return null;

  const left = graph.offsetX + bounds.maxX + MATRIX_GAP;
  const top = graph.offsetY + bounds.minY - TITLE_HEIGHT;

  const matrixType = graph.matrixType ?? "adjacency";
  const adjMatrix = getAdjacencyMatrix(graph);
  const incMatrix = getIncidenceMatrix(graph);

  const activeMatrix = matrixType === "adjacency" ? adjMatrix.matrix : incMatrix.matrix;
  const rowLabels = matrixType === "adjacency" ? adjMatrix.labels : incMatrix.vertexLabels;
  const colLabels = matrixType === "adjacency" ? adjMatrix.labels : incMatrix.edgeLabels;

  function copyMatrix() {
    const header = "\t" + colLabels.join("\t");
    const rows = activeMatrix.map((row, i) => rowLabels[i] + "\t" + row.join("\t"));
    navigator.clipboard.writeText(header + "\n" + rows.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        pointerEvents: "auto",
      }}
      className="bg-card/95 border border-border rounded-lg shadow-lg p-3 space-y-2"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex rounded-md border border-border overflow-hidden">
          <button
            className={cn(
              "px-2.5 py-1 text-[11px] font-medium transition-colors",
              matrixType === "adjacency" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => updateGraph(graph.id, { matrixType: "adjacency" })}
          >
            Adjacência
          </button>
          <button
            className={cn(
              "px-2.5 py-1 text-[11px] font-medium transition-colors",
              matrixType === "incidence" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => updateGraph(graph.id, { matrixType: "incidence" })}
          >
            Incidência
          </button>
        </div>

        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" title="Copiar" onClick={copyMatrix}>
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Exportar CSV"
            onClick={() =>
              downloadCSV(
                activeMatrix,
                colLabels,
                `matriz_${matrixType}_${graph.name.replace(/\s/g, "_")}.csv`,
              )
            }
          >
            <Download className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Exportar imagem"
            onClick={() =>
              exportMatrixAsImage(
                activeMatrix,
                rowLabels,
                colLabels,
                `Matriz de ${matrixType === "adjacency" ? "Adjacência" : "Incidência"} — ${graph.name}`,
                `matriz_${matrixType}_${graph.name.replace(/\s/g, "_")}.png`,
              )
            }
          >
            <Image className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => updateGraph(graph.id, { showMatrix: false })}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {copied && <p className="text-[10px] text-green-500">Copiado!</p>}

      {matrixType === "incidence" && graph.edges.length === 0 ? (
        <p className="text-xs text-muted-foreground">Adicione arestas para ver a matriz de incidência.</p>
      ) : (
        <div className="overflow-auto max-w-[400px] max-h-[300px]">
          <table className="text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-1 border border-border bg-muted/50 min-w-7" />
                {colLabels.map((label) => (
                  <th key={label} className="p-1 border border-border bg-muted/50 font-medium min-w-7 text-center">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeMatrix.map((row, i) => (
                <tr key={i}>
                  <th className="p-1 border border-border bg-muted/50 font-medium">{rowLabels[i]}</th>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={cn(
                        "p-1 border border-border text-center",
                        matrixType === "adjacency" && cell > 0 && "bg-primary/20 text-primary font-medium",
                        matrixType === "incidence" && cell === 1 && "bg-green-500/20 text-green-500 font-medium",
                        matrixType === "incidence" && cell === -1 && "bg-red-500/20 text-red-500 font-medium",
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
    </div>
  );
}
