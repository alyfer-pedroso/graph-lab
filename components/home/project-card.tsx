"use client";

import { GitBranch, Folder, Clock } from "lucide-react";
import type { ProjectMeta } from "@/core/domain/project/project.entity";
import { Card } from "@/components/ui/card";
import { ProjectCardMenu } from "@/components/home/project-card-menu";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

interface ProjectCardProps {
  project: ProjectMeta;
  onOpen: () => void;
  onRename: () => void;
  onExport: () => void;
  onDelete: () => void;
}

export function ProjectCard({ project, onOpen, onRename, onExport, onDelete }: ProjectCardProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}
      className="p-4 cursor-pointer transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-base truncate min-w-0">{project.name}</h3>
        <ProjectCardMenu onRename={onRename} onExport={onExport} onDelete={onDelete} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <GitBranch className="h-3.5 w-3.5" />
          {project.graphCount} grafo{project.graphCount !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1">
          <Folder className="h-3.5 w-3.5" />
          {project.folderCount} pasta{project.folderCount !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {dateFormatter.format(project.updatedAt)}
        </span>
      </div>
    </Card>
  );
}
