import { create } from "zustand";
import type { ProjectMeta } from "@/core/domain/project/project.entity";
import { createEmptyProject } from "@/core/domain/project/project.entity";
import { DEFAULT_IMPORTED_PROJECT_NAME } from "@/core/domain/project/project.constants";
import { projectRepository } from "@/core/infrastructure/persistence/project-repository";
import { runLegacyMigrationOnce } from "@/core/infrastructure/persistence/legacy-migration";
import { downloadTextFile, projectFileName } from "@/core/infrastructure/file/file-download";
import { readFileAsText } from "@/core/infrastructure/file/file-read";
import {
  deserializeProject,
  isProjectFile,
  serializeProject,
} from "@/core/infrastructure/serialization/project-serializer";
import { importLegacyFile, isLegacyFile } from "@/core/infrastructure/serialization/legacy-import";

interface ProjectStore {
  projects: ProjectMeta[];
  loaded: boolean;
  initialize: () => void;
  refresh: () => void;
  createProject: (name: string) => string;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  exportProject: (id: string) => void;
  importProjectFromFile: (file: File) => Promise<string>;
}

export const useProjectStore = create<ProjectStore>()((set) => ({
  projects: [],
  loaded: false,

  initialize: () => {
    runLegacyMigrationOnce();
    set({ projects: projectRepository.listMeta(), loaded: true });
  },

  refresh: () => {
    set({ projects: projectRepository.listMeta() });
  },

  createProject: (name) => {
    const project = createEmptyProject(name.trim() || "Projeto");
    projectRepository.savePayload(project);
    set({ projects: projectRepository.listMeta() });
    return project.id;
  },

  renameProject: (id, name) => {
    projectRepository.renameProject(id, name.trim() || "Projeto");
    set({ projects: projectRepository.listMeta() });
  },

  deleteProject: (id) => {
    projectRepository.removeProject(id);
    set({ projects: projectRepository.listMeta() });
  },

  exportProject: (id) => {
    const payload = projectRepository.loadPayload(id);
    if (!payload) return;
    downloadTextFile(serializeProject(payload), projectFileName(payload.name));
  },

  importProjectFromFile: async (file) => {
    const text = await readFileAsText(file);
    const raw = JSON.parse(text);
    const fallbackName = file.name.replace(/\.(graphlab\.)?json$/i, "") || DEFAULT_IMPORTED_PROJECT_NAME;

    let payload;
    if (isProjectFile(raw)) {
      payload = deserializeProject(raw);
      if (!payload.name) payload.name = fallbackName;
    } else if (isLegacyFile(raw)) {
      payload = importLegacyFile(raw, fallbackName);
    } else {
      throw new Error("Formato inválido.");
    }

    projectRepository.savePayload(payload);
    set({ projects: projectRepository.listMeta() });
    return payload.id;
  },
}));
