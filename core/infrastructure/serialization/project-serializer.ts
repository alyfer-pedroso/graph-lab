import { z } from "zod";
import type { ProjectPayload } from "@/core/domain/project/project.entity";
import { generateProjectId } from "@/core/domain/project/project.entity";
import { normalizeGraph } from "@/core/domain/graph/graph-normalize";
import { PROJECT_FILE_TYPE, PROJECT_FILE_VERSION } from "@/core/domain/project/project.constants";

const projectFileSchema = z.object({
  version: z.literal(PROJECT_FILE_VERSION),
  type: z.literal(PROJECT_FILE_TYPE),
  exportedAt: z.string().optional(),
  project: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
    graphs: z.array(z.any()).optional(),
    folders: z.array(z.any()).optional(),
    activeGraphId: z.string().nullable().optional(),
    gridSnap: z.boolean().optional(),
  }),
});

export function serializeProject(payload: ProjectPayload): string {
  return JSON.stringify(
    {
      version: PROJECT_FILE_VERSION,
      type: PROJECT_FILE_TYPE,
      exportedAt: new Date().toISOString(),
      project: payload,
    },
    null,
    2,
  );
}

export function isProjectFile(raw: unknown): boolean {
  return projectFileSchema.safeParse(raw).success;
}

export function deserializeProject(raw: unknown): ProjectPayload {
  const parsed = projectFileSchema.parse(raw);
  const source = parsed.project;
  const now = Date.now();
  const graphs = (source.graphs ?? []).map((g, i) => normalizeGraph(g as Record<string, unknown>, i));
  const folders = (source.folders ?? []) as ProjectPayload["folders"];
  const graphIds = new Set(graphs.map((g) => g.id));
  const activeGraphId =
    source.activeGraphId && graphIds.has(source.activeGraphId)
      ? source.activeGraphId
      : graphs[0]?.id ?? null;

  return {
    id: generateProjectId(),
    name: source.name || "Projeto importado",
    createdAt: source.createdAt ?? now,
    updatedAt: now,
    graphs,
    folders: folders.map((f) => ({
      id: f.id,
      name: f.name,
      graphIds: (f.graphIds ?? []).filter((gid) => graphIds.has(gid)),
      collapsed: f.collapsed ?? false,
    })),
    activeGraphId,
    gridSnap: source.gridSnap ?? true,
  };
}
