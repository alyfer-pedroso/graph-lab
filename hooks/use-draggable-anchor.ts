import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { resolveNearestAnchor } from "@/core/domain/toolbar/toolbar-anchor";
import { useToolbarStore } from "@/lib/toolbar-store";

interface DragPosition {
  x: number;
  y: number;
}

interface UseDraggableAnchorArgs {
  containerRef: RefObject<HTMLDivElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
}

interface UseDraggableAnchorResult {
  dragging: boolean;
  dragPos: DragPosition | null;
  handleProps: {
    onPointerDown: (event: ReactPointerEvent) => void;
    style: { touchAction: "none" };
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function useDraggableAnchor({ containerRef, panelRef }: UseDraggableAnchorArgs): UseDraggableAnchorResult {
  const setAnchor = useToolbarStore((state) => state.setAnchor);

  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState<DragPosition | null>(null);

  const grabOffsetRef = useRef<DragPosition>({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const latestPosRef = useRef<DragPosition | null>(null);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      const container = containerRef.current;
      const panel = panelRef.current;
      if (!container || !panel) return;

      event.preventDefault();
      const containerRect = container.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();

      grabOffsetRef.current = {
        x: event.clientX - panelRect.left,
        y: event.clientY - panelRect.top,
      };

      const startPos = {
        x: panelRect.left - containerRect.left,
        y: panelRect.top - containerRect.top,
      };

      latestPosRef.current = startPos;
      draggingRef.current = true;
      setDragging(true);
      setDragPos(startPos);
    },
    [containerRef, panelRef],
  );

  useEffect(() => {
    if (!dragging) return;

    function handleMove(event: PointerEvent) {
      const container = containerRef.current;
      const panel = panelRef.current;
      if (!container || !panel) return;

      const containerRect = container.getBoundingClientRect();
      const maxX = Math.max(containerRect.width - panel.offsetWidth, 0);
      const maxY = Math.max(containerRect.height - panel.offsetHeight, 0);

      const next = {
        x: clamp(event.clientX - containerRect.left - grabOffsetRef.current.x, 0, maxX),
        y: clamp(event.clientY - containerRect.top - grabOffsetRef.current.y, 0, maxY),
      };

      latestPosRef.current = next;
      setDragPos(next);
    }

    function handleUp() {
      const container = containerRef.current;
      const panel = panelRef.current;
      const pos = latestPosRef.current;

      draggingRef.current = false;
      setDragging(false);
      setDragPos(null);

      if (!container || !panel || !pos) return;

      const center = {
        x: pos.x + panel.offsetWidth / 2,
        y: pos.y + panel.offsetHeight / 2,
      };

      setAnchor(resolveNearestAnchor(center, { width: container.clientWidth, height: container.clientHeight }));
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [dragging, containerRef, panelRef, setAnchor]);

  return {
    dragging,
    dragPos,
    handleProps: {
      onPointerDown,
      style: { touchAction: "none" },
    },
  };
}
