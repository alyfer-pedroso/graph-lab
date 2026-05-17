"use client";

import { MoreVertical, Pencil, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectCardMenuProps {
  onRename: () => void;
  onExport: () => void;
  onDelete: () => void;
}

export function ProjectCardMenu({ onRename, onExport, onDelete }: ProjectCardMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={(e) => e.stopPropagation()}
          aria-label="Ações do projeto"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={onRename}>
          <Pencil className="h-4 w-4 mr-2" />
          Renomear projeto
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExport}>
          <Download className="h-4 w-4 mr-2" />
          Exportar projeto
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir projeto
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
