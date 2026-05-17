import { getAnchorSide, type ToolbarAnchor } from "@/core/domain/toolbar/toolbar-anchor";

const ANCHOR_POSITION: Record<ToolbarAnchor, string> = {
  "top-left": "top-3 left-3",
  "middle-left": "top-1/2 left-3 -translate-y-1/2",
  "bottom-left": "bottom-3 left-3",
  "top-right": "top-3 right-3",
  "middle-right": "top-1/2 right-3 -translate-y-1/2",
  "bottom-right": "bottom-3 right-3",
};

export function anchorPositionClass(anchor: ToolbarAnchor): string {
  return ANCHOR_POSITION[anchor];
}

export function tooltipSideFor(anchor: ToolbarAnchor): "left" | "right" {
  return getAnchorSide(anchor) === "left" ? "right" : "left";
}
