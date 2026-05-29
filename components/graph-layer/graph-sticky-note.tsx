"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Graph, NoteColor } from "@/lib/graph-types";
import { computeSingleGraphBounds, VERTEX_RADIUS } from "@/core/domain/graph/graph-bounds";
import { useGraphStore } from "@/lib/graph-store";

const TITLE_HEIGHT = 24;
const CONTAINER_PADDING = VERTEX_RADIUS + 8;
const NOTE_WIDTH = 180;
const NOTE_GAP = 12;

const NOTE_COLORS: { value: NoteColor; bg: string; border: string }[] = [
  { value: "yellow", bg: "#fef08a", border: "#facc15" },
  { value: "green", bg: "#bbf7d0", border: "#4ade80" },
  { value: "blue", bg: "#bfdbfe", border: "#60a5fa" },
  { value: "pink", bg: "#fbcfe8", border: "#f472b6" },
  { value: "white", bg: "#f8fafc", border: "#cbd5e1" },
];

function getColors(noteColor?: NoteColor) {
  return NOTE_COLORS.find((c) => c.value === (noteColor ?? "yellow")) ?? NOTE_COLORS[0];
}

interface GraphStickyNoteProps {
  graph: Graph;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
}

export function GraphStickyNote({ graph, isEditing, onStartEdit, onStopEdit }: GraphStickyNoteProps) {
  const { updateGraph } = useGraphStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localText, setLocalText] = useState(graph.notes?.trim() ?? "");

  useEffect(() => {
    setLocalText(graph.notes?.trim() ?? "");
  }, [graph.notes]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const bounds = computeSingleGraphBounds(graph, CONTAINER_PADDING, CONTAINER_PADDING, CONTAINER_PADDING);
  if (!bounds) return null;

  const left = graph.offsetX + bounds.minX - NOTE_WIDTH - NOTE_GAP;
  const top = graph.offsetY + bounds.minY - TITLE_HEIGHT;

  const colors = getColors(graph.noteColor);

  function saveNote() {
    const trimmed = localText.trim();
    updateGraph(graph.id, { notes: trimmed });
    if (!trimmed) {
      onStopEdit();
    } else {
      onStopEdit();
    }
  }

  function handleColorChange(color: NoteColor) {
    updateGraph(graph.id, { noteColor: color });
  }

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: NOTE_WIDTH,
        pointerEvents: "auto",
      }}
    >
      <div
        className="rounded-lg shadow-lg overflow-hidden"
        style={{ backgroundColor: colors.bg, border: `1.5px solid ${colors.border}` }}
      >
        <div className="flex items-center gap-1 px-2 py-1.5" style={{ backgroundColor: colors.border + "55" }}>
          {NOTE_COLORS.map((c) => (
            <button
              key={c.value}
              className={cn(
                "w-4 h-4 rounded-full border-2 transition-transform hover:scale-110",
                graph.noteColor === c.value || (!graph.noteColor && c.value === "yellow")
                  ? "border-gray-700/50 scale-110"
                  : "border-transparent",
              )}
              style={{ backgroundColor: c.bg }}
              onClick={() => handleColorChange(c.value)}
            />
          ))}
        </div>

        {isEditing ? (
          <textarea
            ref={textareaRef}
            className="w-full p-2 text-xs text-gray-800 bg-transparent border-none outline-none resize-none min-h-[80px]"
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={saveNote}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setLocalText(graph.notes?.trim() ?? "");
                onStopEdit();
              }
            }}
            placeholder="Escreva sua anotação…"
          />
        ) : (
          <div
            className="p-2 text-xs text-gray-800 cursor-text min-h-[60px] whitespace-pre-wrap"
            onClick={onStartEdit}
          >
            {localText || <span className="text-gray-400 italic">Clique para editar…</span>}
          </div>
        )}
      </div>
    </div>
  );
}
