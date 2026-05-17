import type { ProjectPayload } from "@/core/domain/project/project.entity";
import { createEmptyProject } from "@/core/domain/project/project.entity";
import { DEFAULT_MIGRATED_PROJECT_NAME } from "@/core/domain/project/project.constants";
import { projectRepository } from "./project-repository";
import { LEGACY_STORAGE_KEY, MIGRATION_SENTINEL_KEY, isBrowser } from "./storage-keys";

interface LegacyState {
  graphs?: ProjectPayload["graphs"];
  folders?: ProjectPayload["folders"];
  activeGraphId?: string | null;
  gridSnap?: boolean;
}

function readLegacyState(): LegacyState | null {
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: LegacyState } | LegacyState;
    const state = (parsed as { state?: LegacyState }).state ?? (parsed as LegacyState);
    if (!state || !Array.isArray(state.graphs)) return null;
    return state;
  } catch {
    return null;
  }
}

export function runLegacyMigrationOnce(): void {
  if (!isBrowser()) return;
  if (window.localStorage.getItem(MIGRATION_SENTINEL_KEY) === "1") return;
  if (projectRepository.hasProjects()) {
    window.localStorage.setItem(MIGRATION_SENTINEL_KEY, "1");
    return;
  }

  const legacy = readLegacyState();
  if (legacy && legacy.graphs && legacy.graphs.length > 0) {
    const project = createEmptyProject(DEFAULT_MIGRATED_PROJECT_NAME);
    project.graphs = legacy.graphs;
    project.folders = legacy.folders ?? [];
    project.activeGraphId = legacy.activeGraphId ?? legacy.graphs[0]?.id ?? null;
    project.gridSnap = legacy.gridSnap ?? true;
    projectRepository.savePayload(project);
  }

  window.localStorage.setItem(MIGRATION_SENTINEL_KEY, "1");
}
