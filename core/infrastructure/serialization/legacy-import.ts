import type { ProjectPayload } from "@/core/domain/project/project.entity";
import { createEmptyProject, generateProjectId } from "@/core/domain/project/project.entity";
import { normalizeGraph } from "@/core/domain/graph/graph-normalize";

type AnyRecord = Record<string, unknown>;

function buildProject(name: string, rawGraphs: unknown[], withFolderName?: string): ProjectPayload {
  const project = createEmptyProject(name);
  project.graphs = rawGraphs.map((g, i) => normalizeGraph(g as AnyRecord, i));
  if (withFolderName && project.graphs.length > 0) {
    project.folders = [
      {
        id: generateProjectId(),
        name: withFolderName,
        graphIds: project.graphs.map((g) => g.id),
        collapsed: false,
      },
    ];
  }
  project.activeGraphId = project.graphs[0]?.id ?? null;
  return project;
}

export function isLegacyFile(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as AnyRecord;
  if (r.graph && typeof r.graph === "object") return true;
  if (Array.isArray(r.graphs)) return true;
  if (Array.isArray(r.vertices)) return true;
  return false;
}

export function importLegacyFile(raw: unknown, fallbackName: string): ProjectPayload {
  if (!raw || typeof raw !== "object") throw new Error("Formato inválido.");
  const r = raw as AnyRecord;

  if (typeof r.folderName === "string" && Array.isArray(r.graphs)) {
    return buildProject(r.folderName || fallbackName, r.graphs, r.folderName);
  }

  if (Array.isArray(r.graphs)) {
    return buildProject(fallbackName, r.graphs);
  }

  if (r.graph && typeof r.graph === "object") {
    return buildProject(fallbackName, [r.graph]);
  }

  if (Array.isArray(r.vertices)) {
    return buildProject(fallbackName, [r]);
  }

  throw new Error("Formato inválido.");
}
