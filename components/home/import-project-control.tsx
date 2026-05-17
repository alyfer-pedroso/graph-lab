"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/core/application/project/project-store";

interface ImportProjectControlProps {
  onImported: (projectId: string) => void;
  onError: (message: string) => void;
  label?: string;
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

export function ImportProjectControl({
  onImported,
  onError,
  label = "Importar projeto",
  variant = "outline",
  className,
}: ImportProjectControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const importProjectFromFile = useProjectStore((s) => s.importProjectFromFile);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const id = await importProjectFromFile(file);
      onImported(id);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Erro ao importar o projeto.");
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".json,.graphlab.json" className="hidden" onChange={handleChange} />
      <Button variant={variant} className={className} onClick={() => inputRef.current?.click()}>
        <Upload className="h-4 w-4 mr-2" />
        {label}
      </Button>
    </>
  );
}
