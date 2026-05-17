"use client";

import { useState } from "react";
import {
  Plus,
  Copy,
  Trash2,
  Settings,
  GitBranch,
  Eye,
  EyeOff,
  Move,
  FolderPlus,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  FolderMinus,
  FolderInput,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { useGraphStore } from "@/lib/graph-store";
import { cn } from "@/lib/utils";
import type { Graph, GraphFolder } from "@/lib/graph-types";

const FOLDER_PREFIX = "folder:";
const GRAPH_PREFIX = "graph:";
const toDndId = (type: "folder" | "graph", id: string) => (type === "folder" ? `${FOLDER_PREFIX}${id}` : `${GRAPH_PREFIX}${id}`);
const fromDndId = (dndId: string): { type: "folder" | "graph"; id: string } | null => {
  if (dndId.startsWith(FOLDER_PREFIX)) return { type: "folder", id: dndId.slice(FOLDER_PREFIX.length) };
  if (dndId.startsWith(GRAPH_PREFIX)) return { type: "graph", id: dndId.slice(GRAPH_PREFIX.length) };
  return null;
};

function GraphGhost({ graph }: { graph: Graph }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-card border border-primary shadow-lg opacity-90 text-sm font-medium pointer-events-none">
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <GitBranch className="h-4 w-4 shrink-0" />
      <span className="truncate">{graph.name}</span>
    </div>
  );
}

function FolderGhost({ folder }: { folder: GraphFolder }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-card border border-primary shadow-lg opacity-90 text-sm font-medium pointer-events-none">
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <Folder className="h-4 w-4 shrink-0" />
      <span className="truncate">{folder.name}</span>
    </div>
  );
}

function SortableGraphItem({
  graph,
  indented,
  folders,
  activeGraphId,
  onSetActive,
  onSetVisible,
  onDuplicate,
  onRename,
  onResetOffset,
  onDelete,
  onSetOpacity,
  onMoveToFolder,
  onRemoveFromFolder,
  isInFolder,
}: {
  graph: Graph;
  indented: boolean;
  folders: GraphFolder[];
  activeGraphId: string | null;
  onSetActive: () => void;
  onSetVisible: () => void;
  onDuplicate: () => void;
  onRename: () => void;
  onResetOffset: () => void;
  onDelete: () => void;
  onSetOpacity: (v: number) => void;
  onMoveToFolder: (folderId: string) => void;
  onRemoveFromFolder: () => void;
  isInFolder: boolean;
}) {
  const dndId = toDndId("graph", graph.id);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dndId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const isActive = activeGraphId === graph.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex flex-col gap-1 p-2 rounded-md cursor-pointer transition-colors border",
        indented && "ml-4 border-l-2 border-l-border rounded-l-none",
        isActive ? "bg-primary/10 text-primary border-primary/30" : "hover:bg-muted border-transparent",
      )}
      onClick={onSetActive}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 min-w-0">
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none p-0.5 rounded hover:bg-muted/60 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
          <GitBranch className="h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{graph.name}</p>
            <p className="text-xs text-muted-foreground">
              {graph.vertices.length}V, {graph.edges.length}A{graph.directed && " · Dígrafo"}
              {graph.weighted && " · Pond."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onSetVisible();
            }}
            title={graph.visible ? "Ocultar" : "Mostrar"}
          >
            {graph.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRename}>
                <Settings className="h-4 w-4 mr-2" />
                Renomear
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onResetOffset}>
                <Move className="h-4 w-4 mr-2" />
                Resetar posição
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {folders.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FolderInput className="h-4 w-4 mr-2" />
                    Mover para pasta
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {folders.map((f) => (
                      <DropdownMenuItem key={f.id} onClick={() => onMoveToFolder(f.id)}>
                        <Folder className="h-4 w-4 mr-2" />
                        {f.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              {isInFolder && (
                <DropdownMenuItem onClick={onRemoveFromFolder}>
                  <FolderMinus className="h-4 w-4 mr-2" />
                  Remover da pasta
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className={cn("px-1 space-y-1", isActive ? "block" : "hidden group-hover:block")} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Opacidade</span>
          <span className="text-xs text-muted-foreground">{Math.round(graph.opacity * 100)}%</span>
        </div>
        <Slider value={[graph.opacity * 100]} min={0} max={100} step={5} onValueChange={([val]) => onSetOpacity(val / 100)} className="w-full" />
        {(graph.offsetX !== 0 || graph.offsetY !== 0) && (
          <p className="text-xs text-muted-foreground">
            Offset: ({Math.round(graph.offsetX)}, {Math.round(graph.offsetY)})
          </p>
        )}
      </div>
    </div>
  );
}

function SortableFolderItem({
  folder,
  graphs,
  folders,
  activeGraphId,
  isDragTarget,
  onToggleCollapse,
  onRename,
  onDeleteRequest,
  graphCallbacks,
}: {
  folder: GraphFolder;
  graphs: Graph[];
  folders: GraphFolder[];
  activeGraphId: string | null;
  isDragTarget: boolean;
  onToggleCollapse: () => void;
  onRename: () => void;
  onDeleteRequest: () => void;
  graphCallbacks: GraphCallbacks;
}) {
  const dndId = toDndId("folder", folder.id);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dndId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const folderGraphs = folder.graphIds.map((id) => graphs.find((g) => g.id === id)).filter(Boolean) as Graph[];
  const innerIds = folderGraphs.map((g) => toDndId("graph", g.id));

  return (
    <div ref={setNodeRef} style={style} className="space-y-0.5">
      <div
        className={cn(
          "flex items-center gap-1 px-1 py-1.5 rounded-md transition-colors group",
          isDragTarget ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-muted",
        )}
      >
        <span {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-0.5 rounded hover:bg-muted/60 shrink-0">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </span>

        <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={onToggleCollapse}>
          {folder.collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>

        {folder.collapsed ? (
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}

        <span className="text-sm font-medium flex-1 truncate">{folder.name}</span>
        <span className="text-xs text-muted-foreground shrink-0">{folderGraphs.length}</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRename}>
              <Settings className="h-4 w-4 mr-2" />
              Renomear pasta
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onDeleteRequest}>
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir pasta
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!folder.collapsed && (
        <SortableContext items={innerIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-0.5">
            {folderGraphs.map((graph) => (
              <SortableGraphItem
                key={graph.id}
                graph={graph}
                indented
                folders={folders}
                activeGraphId={activeGraphId}
                isInFolder
                onSetActive={() => graphCallbacks.setActive(graph.id)}
                onSetVisible={() => graphCallbacks.setVisible(graph.id, !graph.visible)}
                onDuplicate={() => graphCallbacks.duplicate(graph.id)}
                onRename={() => graphCallbacks.rename(graph.id, graph.name)}
                onResetOffset={() => graphCallbacks.resetOffset(graph.id)}
                onDelete={() => graphCallbacks.delete(graph.id)}
                onSetOpacity={(v) => graphCallbacks.setOpacity(graph.id, v)}
                onMoveToFolder={(fid) => graphCallbacks.moveToFolder(graph.id, fid)}
                onRemoveFromFolder={() => graphCallbacks.removeFromFolder(graph.id)}
              />
            ))}
            {folderGraphs.length === 0 && <p className="text-xs text-muted-foreground ml-8 py-1 italic">Arraste grafos aqui</p>}
          </div>
        </SortableContext>
      )}
    </div>
  );
}

interface GraphCallbacks {
  setActive: (id: string) => void;
  setVisible: (id: string, v: boolean) => void;
  duplicate: (id: string) => void;
  rename: (id: string, current: string) => void;
  resetOffset: (id: string) => void;
  delete: (id: string) => void;
  setOpacity: (id: string, v: number) => void;
  moveToFolder: (graphId: string, folderId: string) => void;
  removeFromFolder: (graphId: string) => void;
}

export function GraphManager() {
  const {
    graphs,
    folders,
    activeGraphId,
    createGraph,
    deleteGraph,
    setActiveGraph,
    updateGraph,
    duplicateGraph,
    setGraphOpacity,
    setGraphVisible,
    setGraphOffset,
    createFolder,
    deleteFolder,
    renameFolder,
    addGraphToFolder,
    removeGraphFromFolder,
    toggleFolderCollapsed,
    reorderFolders,
    reorderGraphsInFolder,
    reorderStandaloneGraphs,
    moveGraphToFolder,
    moveGraphToRoot,
  } = useGraphStore();

  const [newGraphName, setNewGraphName] = useState("");
  const [newGraphDirected, setNewGraphDirected] = useState(false);
  const [newGraphWeighted, setNewGraphWeighted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [deleteFolderState, setDeleteFolderState] = useState<{ id: string; name: string } | null>(null);

  const [activeItem, setActiveItem] = useState<{ type: "folder" | "graph"; id: string } | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const graphsInFolders = new Set(folders.flatMap((f) => f.graphIds));
  const standaloneGraphs = graphs.filter((g) => !graphsInFolders.has(g.id));

  const getGraphById = (id: string) => graphs.find((g) => g.id === id);
  const getFolderOfGraph = (graphId: string) => folders.find((f) => f.graphIds.includes(graphId)) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart(event: DragStartEvent) {
    const parsed = fromDndId(String(event.active.id));
    if (parsed) setActiveItem(parsed);
    setDragOverFolderId(null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    if (!over) {
      setDragOverFolderId(null);
      return;
    }
    const overParsed = fromDndId(String(over.id));
    if (overParsed?.type === "folder") {
      setDragOverFolderId(overParsed.id);
    } else if (overParsed?.type === "graph") {
      const folder = getFolderOfGraph(overParsed.id);
      setDragOverFolderId(folder?.id ?? null);
    } else {
      setDragOverFolderId(null);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveItem(null);
    setDragOverFolderId(null);

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeParsed = fromDndId(String(active.id));
    const overParsed = fromDndId(String(over.id));
    if (!activeParsed || !overParsed) return;

    if (activeParsed.type === "folder" && overParsed.type === "folder") {
      reorderFolders(activeParsed.id, overParsed.id);
      return;
    }

    if (activeParsed.type === "graph") {
      const graphId = activeParsed.id;
      const fromFolder = getFolderOfGraph(graphId);

      if (overParsed.type === "folder") {
        moveGraphToFolder(graphId, overParsed.id, null);
        return;
      }

      if (overParsed.type === "graph") {
        const toFolder = getFolderOfGraph(overParsed.id);

        if (fromFolder && toFolder && fromFolder.id === toFolder.id) {
          reorderGraphsInFolder(fromFolder.id, graphId, overParsed.id);
          return;
        }

        if (toFolder) {
          moveGraphToFolder(graphId, toFolder.id, overParsed.id);
          return;
        }

        if (!toFolder) {
          if (fromFolder) {
            moveGraphToRoot(graphId);
            reorderStandaloneGraphs(graphId, overParsed.id);
          } else {
            reorderStandaloneGraphs(graphId, overParsed.id);
          }
          return;
        }
      }
    }
  }

  const graphCallbacks: GraphCallbacks = {
    setActive: setActiveGraph,
    setVisible: (id, v) => setGraphVisible(id, v),
    duplicate: duplicateGraph,
    rename: (id, current) => {
      const n = prompt("Novo nome:", current);
      if (n) updateGraph(id, { name: n });
    },
    resetOffset: (id) => setGraphOffset(id, 0, 0),
    delete: deleteGraph,
    setOpacity: (id, v) => setGraphOpacity(id, v),
    moveToFolder: (graphId, folderId) => addGraphToFolder(graphId, folderId),
    removeFromFolder: (graphId) => removeGraphFromFolder(graphId),
  };

  function handleCreateGraph() {
    if (!newGraphName.trim()) return;
    createGraph(newGraphName.trim(), newGraphDirected, newGraphWeighted);
    setNewGraphName("");
    setNewGraphDirected(false);
    setNewGraphWeighted(false);
    setDialogOpen(false);
  }

  function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    createFolder(newFolderName.trim());
    setNewFolderName("");
    setFolderDialogOpen(false);
  }

  const folderDndIds = folders.map((f) => toDndId("folder", f.id));
  const standaloneDndIds = standaloneGraphs.map((g) => toDndId("graph", g.id));

  const activeGraph = activeItem?.type === "graph" ? getGraphById(activeItem.id) : null;
  const activeFolder = activeItem?.type === "folder" ? folders.find((f) => f.id === activeItem.id) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-semibold text-sm">Grafos</h3>
          <div className="flex items-center gap-1 pr-8 md:pr-0">
            <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Nova pasta">
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Pasta</DialogTitle>
                  <DialogDescription>Organize seus grafos em pastas.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="folder-name">Nome da pasta</Label>
                    <Input
                      id="folder-name"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                      placeholder="Minha Pasta"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateFolder}>Criar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Grafo</DialogTitle>
                  <DialogDescription>Configure as propriedades do novo grafo.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={newGraphName}
                      onChange={(e) => setNewGraphName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateGraph()}
                      placeholder="Meu Grafo"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="directed">Dígrafo (Direcionado)</Label>
                    <Switch id="directed" checked={newGraphDirected} onCheckedChange={setNewGraphDirected} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="weighted">Ponderado</Label>
                    <Switch id="weighted" checked={newGraphWeighted} onCheckedChange={setNewGraphWeighted} />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateGraph}>Criar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            <SortableContext items={folderDndIds} strategy={verticalListSortingStrategy}>
              {folders.map((folder) => (
                <SortableFolderItem
                  key={folder.id}
                  folder={folder}
                  graphs={graphs}
                  folders={folders}
                  activeGraphId={activeGraphId}
                  isDragTarget={dragOverFolderId === folder.id}
                  onToggleCollapse={() => toggleFolderCollapsed(folder.id)}
                  onRename={() => {
                    const n = prompt("Novo nome:", folder.name);
                    if (n) renameFolder(folder.id, n);
                  }}
                  onDeleteRequest={() => setDeleteFolderState({ id: folder.id, name: folder.name })}
                  graphCallbacks={graphCallbacks}
                />
              ))}
            </SortableContext>

            {standaloneGraphs.length > 0 && folders.length > 0 && (
              <div className="pt-1">
                <p className="text-xs text-muted-foreground px-2 pb-1 font-medium">Sem pasta</p>
              </div>
            )}

            <SortableContext items={standaloneDndIds} strategy={verticalListSortingStrategy}>
              {standaloneGraphs.map((graph) => (
                <SortableGraphItem
                  key={graph.id}
                  graph={graph}
                  indented={false}
                  folders={folders}
                  activeGraphId={activeGraphId}
                  isInFolder={false}
                  onSetActive={() => graphCallbacks.setActive(graph.id)}
                  onSetVisible={() => graphCallbacks.setVisible(graph.id, !graph.visible)}
                  onDuplicate={() => graphCallbacks.duplicate(graph.id)}
                  onRename={() => graphCallbacks.rename(graph.id, graph.name)}
                  onResetOffset={() => graphCallbacks.resetOffset(graph.id)}
                  onDelete={() => graphCallbacks.delete(graph.id)}
                  onSetOpacity={(v) => graphCallbacks.setOpacity(graph.id, v)}
                  onMoveToFolder={(fid) => graphCallbacks.moveToFolder(graph.id, fid)}
                  onRemoveFromFolder={() => graphCallbacks.removeFromFolder(graph.id)}
                />
              ))}
            </SortableContext>

            {graphs.length === 0 && folders.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8 px-2">
                Nenhum grafo neste projeto. Crie seu primeiro grafo para começar.
              </p>
            )}
          </div>
        </ScrollArea>

        <div className="px-3 py-2 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            {graphs.length} grafo{graphs.length !== 1 ? "s" : ""}
            {folders.length > 0 && ` · ${folders.length} pasta${folders.length !== 1 ? "s" : ""}`}
            {" · "}Auto-salvo
          </p>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeGraph && <GraphGhost graph={activeGraph} />}
        {activeFolder && <FolderGhost folder={activeFolder} />}
      </DragOverlay>

      <Dialog open={!!deleteFolderState} onOpenChange={(o) => !o && setDeleteFolderState(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir pasta &quot;{deleteFolderState?.name}&quot;</DialogTitle>
            <DialogDescription>O que deseja fazer com os grafos dentro desta pasta?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDeleteFolderState(null)}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (deleteFolderState) {
                  deleteFolder(deleteFolderState.id, false);
                  setDeleteFolderState(null);
                }
              }}
            >
              Manter grafos
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteFolderState) {
                  deleteFolder(deleteFolderState.id, true);
                  setDeleteFolderState(null);
                }
              }}
            >
              Excluir tudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
