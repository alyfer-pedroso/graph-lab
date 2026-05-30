"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";
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

interface EdgeContextMenuProps {
  edgeId: string;
  screenX: number;
  screenY: number;
  onClose: () => void;
}

export function EdgeContextMenu({ edgeId, screenX, screenY, onClose }: EdgeContextMenuProps) {
  const { graphs, activeGraphId, updateEdge, deleteEdge } = useGraphStore();

  const activeGraph = graphs.find((g) => g.id === activeGraphId);
  const edge = activeGraph?.edges.find((e) => e.id === edgeId);

  const [label, setLabel] = useState(edge?.label ?? "");
  const [weight, setWeight] = useState(edge?.weight?.toString() ?? "");
  const savedRef = useRef(false);

  function saveFields() {
    if (savedRef.current) return;
    savedRef.current = true;
    if (label !== (edge?.label ?? "")) updateEdge(edgeId, { label });
    if (activeGraph?.weighted) {
      const w = parseFloat(weight);
      if (!isNaN(w) && w !== edge?.weight) updateEdge(edgeId, { weight: w });
    }
  }

  if (!edge || !activeGraph) return null;

  const sourceLabel = activeGraph.vertices.find((v) => v.id === edge.source)?.label ?? edge.source;
  const targetLabel = activeGraph.vertices.find((v) => v.id === edge.target)?.label ?? edge.target;

  return createPortal(
    <>
      <div className="fixed inset-0 z-49" onPointerDown={() => { saveFields(); onClose(); }} />
      <div
        style={{ position: "fixed", left: screenX, top: screenY, zIndex: 50 }}
        className="bg-popover border border-border rounded-lg shadow-lg p-3 w-50 text-sm space-y-3"
      >
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Rótulo</Label>
          <Input
            value={label}
            autoFocus
            onChange={(e) => setLabel(e.target.value)}
            onBlur={saveFields}
            onKeyDown={(e) => {
              if (e.key === "Enter") { saveFields(); onClose(); }
              if (e.key === "Escape") onClose();
            }}
            className="h-7 text-xs"
          />
        </div>

        {activeGraph.weighted && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Peso</Label>
            <Input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onBlur={saveFields}
              onKeyDown={(e) => {
                if (e.key === "Enter") { saveFields(); onClose(); }
                if (e.key === "Escape") onClose();
              }}
              className="h-7 text-xs"
            />
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          {sourceLabel} → {targetLabel}
        </div>

        <Separator />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="flex items-center gap-2 w-full px-2 py-1.5 text-left rounded hover:bg-destructive/10 hover:text-destructive transition-colors text-xs text-destructive">
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              Excluir aresta
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir aresta?</AlertDialogTitle>
              <AlertDialogDescription>
                A aresta entre &quot;{sourceLabel}&quot; e &quot;{targetLabel}&quot; será removida.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { deleteEdge(edgeId); onClose(); }}
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
