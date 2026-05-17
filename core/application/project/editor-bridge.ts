import { useGraphStore } from "@/lib/graph-store";
import { useDijkstraStore } from "@/lib/dijkstra-store";
import { useTreeStore } from "@/lib/tree-store";
import { projectRepository } from "@/core/infrastructure/persistence/project-repository";

let activeProjectId: string | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribe: (() => void) | null = null;

function persistNow(): void {
  if (!activeProjectId) return;
  const existing = projectRepository.loadPayload(activeProjectId);
  if (!existing) return;
  const state = useGraphStore.getState();
  projectRepository.savePayload({
    ...existing,
    graphs: state.graphs,
    folders: state.folders,
    activeGraphId: state.activeGraphId,
    gridSnap: state.gridSnap,
  });
}

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(persistNow, 300);
}

export function loadProjectIntoEditor(id: string): boolean {
  const payload = projectRepository.loadPayload(id);
  if (!payload) return false;

  activeProjectId = id;
  useGraphStore.getState().loadFromProject(payload);
  useDijkstraStore.getState().setDijkstraHighlight(null);
  useTreeStore.getState().setTreeHighlight(null);
  return true;
}

export function startEditorAutosave(): () => void {
  if (unsubscribe) unsubscribe();
  unsubscribe = useGraphStore.subscribe(scheduleSave);

  const handleBeforeUnload = () => persistNow();
  window.addEventListener("beforeunload", handleBeforeUnload);

  return () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    persistNow();
    window.removeEventListener("beforeunload", handleBeforeUnload);
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    activeProjectId = null;
  };
}

export function getActiveProjectId(): string | null {
  return activeProjectId;
}
