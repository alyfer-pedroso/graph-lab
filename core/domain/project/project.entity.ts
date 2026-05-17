import type { Graph, GraphFolder } from "@/core/domain/graph/graph.entity";

export interface ProjectMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  graphCount: number;
  folderCount: number;
}

export interface ProjectPayload {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  graphs: Graph[];
  folders: GraphFolder[];
  activeGraphId: string | null;
  gridSnap: boolean;
}

export function generateProjectId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function createEmptyProject(name: string): ProjectPayload {
  const now = Date.now();
  return {
    id: generateProjectId(),
    name,
    createdAt: now,
    updatedAt: now,
    graphs: [],
    folders: [],
    activeGraphId: null,
    gridSnap: true,
  };
}

export function toProjectMeta(payload: ProjectPayload): ProjectMeta {
  return {
    id: payload.id,
    name: payload.name,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
    graphCount: payload.graphs.length,
    folderCount: payload.folders.length,
  };
}
