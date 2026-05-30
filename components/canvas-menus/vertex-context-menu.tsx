"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Spline, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useGraphStore } from "@/lib/graph-store";
import { COLORS } from "@/lib/graph-algorithms";

interface VertexContextMenuProps {
  vertexId: string;
  screenX: number;
  screenY: number;
  onClose: () => void;
  onStartEdge: (vertexId: string) => void;
}

export function VertexContextMenu({ vertexId, screenX, screenY, onClose, onStartEdge }: VertexContextMenuProps) {
  const { graphs, activeGraphId, updateVertex, deleteVertex } = useGraphStore();

  const activeGraph = graphs.find((g) => g.id === activeGraphId);
  const vertex = activeGraph?.vertices.find((v) => v.id === vertexId);

  const [label, setLabel] = useState(vertex?.label ?? "");
  const savedRef = useRef(false);

  function saveLabel() {
    if (!savedRef.current && label !== vertex?.label) {
      updateVertex(vertexId, { label });
    }
    savedRef.current = true;
  }

  if (!vertex) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-49" onPointerDown={() => { saveLabel(); onClose(); }} />
      <div
        style={{ position: "fixed", left: screenX, top: screenY, zIndex: 50 }}
        className="bg-popover border border-border rounded-lg shadow-lg p-3 w-55 text-sm space-y-3"
      >
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Rótulo</Label>
          <Input
            value={label}
            autoFocus
            onChange={(e) => setLabel(e.target.value)}
            onBlur={saveLabel}
            onKeyDown={(e) => {
              if (e.key === "Enter") { saveLabel(); onClose(); }
              if (e.key === "Escape") onClose();
            }}
            className="h-7 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Cor</Label>
          <div className="grid grid-cols-8 gap-1">
            {COLORS.map((color) => (
              <button
                key={color}
                className="w-6 h-6 rounded-md border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor: vertex.color === color ? "#fff" : "transparent",
                }}
                onClick={() => updateVertex(vertexId, { color })}
              />
            ))}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Posição: ({Math.round(vertex.x)}, {Math.round(vertex.y)})
        </div>

        <Separator />

        <button
          onClick={() => onStartEdge(vertexId)}
          className="flex items-center gap-2 w-full px-2 py-1.5 text-left rounded hover:bg-accent hover:text-accent-foreground transition-colors text-xs"
        >
          <Spline className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          Desenhar aresta a partir daqui
        </button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="flex items-center gap-2 w-full px-2 py-1.5 text-left rounded hover:bg-destructive/10 hover:text-destructive transition-colors text-xs text-destructive">
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              Excluir vértice
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir vértice?</AlertDialogTitle>
              <AlertDialogDescription>
                O vértice &quot;{vertex.label}&quot; e todas as suas arestas serão removidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { deleteVertex(vertexId); onClose(); }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>,
    document.body,
  );
}
