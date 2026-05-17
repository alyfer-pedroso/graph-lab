import type { GraphBounds } from "@/core/domain/graph/graph-bounds";

export interface FitViewport {
  width: number;
  height: number;
}

export interface FitOptions {
  padding: number;
  minZoom: number;
  maxZoom: number;
}

export interface FitTransform {
  zoom: number;
  pan: { x: number; y: number };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeFitTransform(
  bounds: GraphBounds,
  viewport: FitViewport,
  options: FitOptions,
): FitTransform {
  const boundsWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const boundsHeight = Math.max(bounds.maxY - bounds.minY, 1);

  const availableWidth = Math.max(viewport.width - options.padding * 2, 1);
  const availableHeight = Math.max(viewport.height - options.padding * 2, 1);

  const zoom = clamp(
    Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight),
    options.minZoom,
    options.maxZoom,
  );

  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  return {
    zoom,
    pan: {
      x: viewport.width / 2 - centerX * zoom,
      y: viewport.height / 2 - centerY * zoom,
    },
  };
}
