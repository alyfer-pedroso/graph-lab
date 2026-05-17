export const GRAPH_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#a855f7",
  "#14b8a6",
  "#ef4444",
  "#3b82f6",
];

export function getGraphDefaultColor(graphIndex: number): string {
  return GRAPH_COLORS[graphIndex % GRAPH_COLORS.length];
}
