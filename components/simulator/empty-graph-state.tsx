"use client";

import { Network, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyGraphState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center text-center gap-4 max-w-sm">
        <div className="p-4 rounded-full bg-primary/10">
          <Network className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Projeto vazio</h2>
          <p className="text-sm text-muted-foreground">
            Este projeto ainda não possui grafos. Crie seu primeiro grafo para começar a trabalhar.
          </p>
        </div>
        <Button onClick={onCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Criar primeiro grafo
        </Button>
      </div>
    </div>
  );
}
