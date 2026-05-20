"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useGraphStore } from "@/lib/graph-store";

interface GraphNotesModalProps {
  graphId: string;
  graphName: string;
  initialNotes: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GraphNotesModal({ graphId, graphName, initialNotes, open, onOpenChange }: GraphNotesModalProps) {
  const [localNotes, setLocalNotes] = useState(initialNotes);
  const { updateGraph } = useGraphStore();

  useEffect(() => {
    if (open) setLocalNotes(initialNotes);
  }, [open, initialNotes]);

  const handleSave = useCallback(() => {
    updateGraph(graphId, { notes: localNotes });
    onOpenChange(false);
  }, [graphId, localNotes, updateGraph, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, handleSave]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg w-full">
        <DialogHeader>
          <DialogTitle className="truncate">{graphName} — Observações</DialogTitle>
        </DialogHeader>
        <Textarea
          value={localNotes}
          onChange={(e) => setLocalNotes(e.target.value)}
          placeholder="Adicione observações sobre este grafo..."
          className="min-h-50 resize-none text-sm"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
