"use client";

import { useRef, useEffect, useState, type MutableRefObject } from "react";
import { useGraphStore } from "@/lib/graph-store";
import { GraphLayerContainer } from "./graph-layer-container";
import { GraphInlineMatrix } from "./graph-inline-matrix";
import { GraphStickyNote } from "./graph-sticky-note";

interface GraphLayersOverlayProps {
  viewportRef: MutableRefObject<{ pan: { x: number; y: number }; zoom: number }>;
}

export function GraphLayersOverlay({ viewportRef }: GraphLayersOverlayProps) {
  const { graphs, activeGraphId, setActiveGraph, updateGraph } = useGraphStore();
  const viewportLayerRef = useRef<HTMLDivElement>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  useEffect(() => {
    let frameId: number;

    const sync = () => {
      if (viewportLayerRef.current) {
        const { pan, zoom } = viewportRef.current;
        viewportLayerRef.current.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
      }
      frameId = requestAnimationFrame(sync);
    };

    frameId = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(frameId);
  }, [viewportRef]);

  const visibleGraphs = graphs.filter((g) => g.visible !== false);

  function handleOpenNote(graphId: string) {
    setEditingNoteId(graphId);
    if (!graphs.find((g) => g.id === graphId)?.notes) {
      updateGraph(graphId, { notes: " " });
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <div
        ref={viewportLayerRef}
        style={{
          position: "absolute",
          transformOrigin: "0 0",
        }}
      >
        {visibleGraphs.map((graph) => (
          <GraphLayerContainer
            key={graph.id}
            graph={graph}
            isActive={graph.id === activeGraphId}
            viewportRef={viewportRef}
            onSelect={() => setActiveGraph(graph.id)}
            onOpenNote={() => handleOpenNote(graph.id)}
          />
        ))}

        {visibleGraphs
          .filter((g) => g.showMatrix)
          .map((graph) => (
            <GraphInlineMatrix key={`matrix-${graph.id}`} graph={graph} />
          ))}

        {visibleGraphs
          .filter((g) => (g.notes && g.notes.trim()) || g.id === editingNoteId)
          .map((graph) => (
            <GraphStickyNote
              key={`note-${graph.id}`}
              graph={graph}
              isEditing={graph.id === editingNoteId}
              onStartEdit={() => setEditingNoteId(graph.id)}
              onStopEdit={() => setEditingNoteId(null)}
            />
          ))}
      </div>
    </div>
  );
}
