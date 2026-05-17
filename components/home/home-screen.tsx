"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Network, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/core/application/project/project-store";
import { ProjectCard } from "@/components/home/project-card";
import { CreateProjectDialog } from "@/components/home/create-project-dialog";
import { RenameProjectDialog } from "@/components/home/rename-project-dialog";
import { DeleteProjectDialog } from "@/components/home/delete-project-dialog";
import { ImportProjectControl } from "@/components/home/import-project-control";
import { EmptyProjectsState } from "@/components/home/empty-projects-state";

export function HomeScreen() {
  const router = useRouter();
  const projects = useProjectStore((s) => s.projects);
  const loaded = useProjectStore((s) => s.loaded);
  const initialize = useProjectStore((s) => s.initialize);
  const createProject = useProjectStore((s) => s.createProject);
  const renameProject = useProjectStore((s) => s.renameProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const exportProject = useProjectStore((s) => s.exportProject);

  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  function openProject(id: string) {
    router.push(`/project/${id}`);
  }

  function handleCreate(name: string) {
    const id = createProject(name);
    openProject(id);
  }

  if (!loaded) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
              <Network className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-lg leading-tight truncate">GraphLab</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Seus projetos de grafos</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ImportProjectControl
              onImported={openProject}
              onError={setImportError}
              className="hidden sm:inline-flex"
            />
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo projeto</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {importError && (
          <div className="mb-4 flex items-start justify-between gap-3 p-3 rounded-md bg-destructive/10 border border-destructive/30">
            <p className="text-sm text-destructive">{importError}</p>
            <button
              onClick={() => setImportError(null)}
              className="text-destructive shrink-0"
              aria-label="Fechar aviso"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {projects.length === 0 ? (
          <EmptyProjectsState onCreate={() => setCreateOpen(true)}>
            <ImportProjectControl onImported={openProject} onError={setImportError} />
          </EmptyProjectsState>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => openProject(project.id)}
                onRename={() => setRenameTarget({ id: project.id, name: project.name })}
                onExport={() => exportProject(project.id)}
                onDelete={() => setDeleteTarget({ id: project.id, name: project.name })}
              />
            ))}
          </div>
        )}
      </main>

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} onConfirm={handleCreate} />

      <RenameProjectDialog
        open={!!renameTarget}
        initialName={renameTarget?.name ?? ""}
        onOpenChange={(o) => !o && setRenameTarget(null)}
        onConfirm={(name) => {
          if (renameTarget) renameProject(renameTarget.id, name);
          setRenameTarget(null);
        }}
      />

      <DeleteProjectDialog
        open={!!deleteTarget}
        projectName={deleteTarget?.name ?? ""}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteProject(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
