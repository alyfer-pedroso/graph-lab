"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GraphSimulator } from "@/components/simulator/graph-simulator";
import { useProjectStore } from "@/core/application/project/project-store";
import { loadProjectIntoEditor, startEditorAutosave } from "@/core/application/project/editor-bridge";
import { runLegacyMigrationOnce } from "@/core/infrastructure/persistence/legacy-migration";
import { projectRepository } from "@/core/infrastructure/persistence/project-repository";

export default function ProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [ready, setReady] = useState(false);
  const [projectName, setProjectName] = useState("");
  const renameProject = useProjectStore((s) => s.renameProject);

  useEffect(() => {
    if (!projectId) {
      router.replace("/");
      return;
    }

    runLegacyMigrationOnce();
    const loaded = loadProjectIntoEditor(projectId);
    if (!loaded) {
      router.replace("/");
      return;
    }

    const payload = projectRepository.loadPayload(projectId);
    setProjectName(payload?.name ?? "");
    setReady(true);

    const stopAutosave = startEditorAutosave();
    return () => stopAutosave();
  }, [projectId, router]);

  if (!ready || !projectId) return null;

  return (
    <GraphSimulator
      projectName={projectName}
      onRenameProject={(name) => {
        renameProject(projectId, name);
        setProjectName(name);
      }}
    />
  );
}
