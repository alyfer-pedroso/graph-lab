export type ToolbarSide = "left" | "right";

export type ToolbarBand = "top" | "middle" | "bottom";

export type ToolbarAnchor =
  | "top-left"
  | "middle-left"
  | "bottom-left"
  | "top-right"
  | "middle-right"
  | "bottom-right";

export const TOOLBAR_ANCHORS: ToolbarAnchor[] = [
  "top-left",
  "middle-left",
  "bottom-left",
  "top-right",
  "middle-right",
  "bottom-right",
];

export const DEFAULT_TOOLBAR_ANCHOR: ToolbarAnchor = "top-left";

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export function getAnchorSide(anchor: ToolbarAnchor): ToolbarSide {
  return anchor.endsWith("left") ? "left" : "right";
}

export function getAnchorBand(anchor: ToolbarAnchor): ToolbarBand {
  if (anchor.startsWith("top")) return "top";
  if (anchor.startsWith("bottom")) return "bottom";
  return "middle";
}

function composeAnchor(band: ToolbarBand, side: ToolbarSide): ToolbarAnchor {
  return `${band}-${side}` as ToolbarAnchor;
}

export function resolveNearestAnchor(point: Point, size: Size): ToolbarAnchor {
  const side: ToolbarSide = point.x < size.width / 2 ? "left" : "right";

  const band: ToolbarBand =
    point.y < size.height / 3 ? "top" : point.y < (size.height * 2) / 3 ? "middle" : "bottom";

  return composeAnchor(band, side);
}
