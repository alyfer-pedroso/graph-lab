"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RenameProjectDialogProps {
  open: boolean;
  initialName: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string) => void;
}

export function RenameProjectDialog({ open, initialName, onOpenChange, onConfirm }: RenameProjectDialogProps) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (open) setName(initialName);
  }, [open, initialName]);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renomear projeto</DialogTitle>
          <DialogDescription>Escolha um novo nome para o projeto.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-4">
          <Label htmlFor="rename-project">Nome do projeto</Label>
          <Input
            id="rename-project"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
