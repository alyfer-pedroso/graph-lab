"use client";

import { useRef, useEffect, useState, type MutableRefObject } from "react";
import { useGraphStore } from "@/lib/graph-store";
import { GraphLayerContainer } from "./graph-layer-container";
import { GraphNotesModal } from "./graph-notes-modal";

interface GraphLayersOverlayProps {
  viewportRef: MutableRefObject<{ pan: { x: number; y: number }; zoom: number }>;
}

export function GraphLayersOverlay({ viewportRef }: GraphLayersOverlayProps) {
  const { graphs, activeGraphId, setActiveGraph } = useGraphStore();
  const viewportLayerRef = useRef<HTMLDivElement>(null);
  const [notesGraphId, setNotesGraphId] = useState<string | null>(null);

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
  const notesGraph = notesGraphId ? graphs.find((g) => g.id === notesGraphId) : null;

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
            onSelect={() => setActiveGraph(graph.id)}
            onOpenNotes={() => setNotesGraphId(graph.id)}
          />
        ))}
      </div>

      {notesGraph && (
        <GraphNotesModal
          graphId={notesGraph.id}
          graphName={notesGraph.name}
          initialNotes={notesGraph.notes ?? ""}
          open={true}
          onOpenChange={(open) => {
            if (!open) setNotesGraphId(null);
          }}
        />
      )}
    </div>
  );
}
