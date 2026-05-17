import type { ProjectMeta, ProjectPayload } from "@/core/domain/project/project.entity";
import { toProjectMeta } from "@/core/domain/project/project.entity";
import { PROJECT_INDEX_KEY, PROJECT_INDEX_VERSION, isBrowser, projectPayloadKey } from "./storage-keys";

interface ProjectIndex {
  version: number;
  projects: ProjectMeta[];
}

function readIndex(): ProjectIndex {
  if (!isBrowser()) return { version: PROJECT_INDEX_VERSION, projects: [] };
  try {
    const raw = window.localStorage.getItem(PROJECT_INDEX_KEY);
    if (!raw) return { version: PROJECT_INDEX_VERSION, projects: [] };
    const parsed = JSON.parse(raw) as Partial<ProjectIndex>;
    if (!Array.isArray(parsed.projects)) return { version: PROJECT_INDEX_VERSION, projects: [] };
    return { version: PROJECT_INDEX_VERSION, projects: parsed.projects };
  } catch {
    return { version: PROJECT_INDEX_VERSION, projects: [] };
  }
}

function writeIndex(index: ProjectIndex): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(PROJECT_INDEX_KEY, JSON.stringify(index));
}

function upsertMeta(meta: ProjectMeta): void {
  const index = readIndex();
  const existing = index.projects.findIndex((p) => p.id === meta.id);
  if (existing === -1) index.projects.push(meta);
  else index.projects[existing] = meta;
  writeIndex(index);
}

export const projectRepository = {
  listMeta(): ProjectMeta[] {
    return readIndex().projects.slice().sort((a, b) => b.updatedAt - a.updatedAt);
  },

  hasProjects(): boolean {
    return readIndex().projects.length > 0;
  },

  loadPayload(id: string): ProjectPayload | null {
    if (!isBrowser()) return null;
    try {
      const raw = window.localStorage.getItem(projectPayloadKey(id));
      if (!raw) return null;
      return JSON.parse(raw) as ProjectPayload;
    } catch {
      return null;
    }
  },

  savePayload(payload: ProjectPayload): void {
    if (!isBrowser()) return;
    const stamped: ProjectPayload = { ...payload, updatedAt: Date.now() };
    window.localStorage.setItem(projectPayloadKey(stamped.id), JSON.stringify(stamped));
    upsertMeta(toProjectMeta(stamped));
  },

  renameProject(id: string, name: string): void {
    const payload = this.loadPayload(id);
    if (!payload) return;
    this.savePayload({ ...payload, name });
  },

  removeProject(id: string): void {
    if (!isBrowser()) return;
    window.localStorage.removeItem(projectPayloadKey(id));
    const index = readIndex();
    index.projects = index.projects.filter((p) => p.id !== id);
    writeIndex(index);
  },
};
