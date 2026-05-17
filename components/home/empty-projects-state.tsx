"use client";

import type { ReactNode } from "react";
import { Network, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyProjectsStateProps {
  onCreate: () => void;
  children?: ReactNode;
}

export function EmptyProjectsState({ onCreate, children }: EmptyProjectsStateProps) {
  return (
    <div className="flex flex-col items-center text-center gap-5 py-16 px-6">
      <div className="p-4 rounded-full bg-primary/10">
        <Network className="h-9 w-9 text-primary" />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Nenhum projeto ainda</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Crie um novo projeto para começar a modelar grafos, ou importe um projeto existente.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={onCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Criar projeto
        </Button>
        {children}
      </div>
    </div>
  );
}
