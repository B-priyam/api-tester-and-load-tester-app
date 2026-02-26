import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen,
  FolderPlus,
  FilePlus,
  ChevronRight,
  ChevronDown,
  Trash2,
  Copy,
  Play,
  Edit3,
  MoreHorizontal,
  Save,
  X,
  Search,
  FileJson,
  Upload,
  Download,
  GripVertical,
} from "lucide-react";
import type { HttpMethod, KeyValuePair } from "./RequestBuilder";

export interface SavedRequest {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  bodyContent: string;
  bodyType: string;
  authType: string;
  authToken: string;
  createdAt: number;
  updatedAt: number;
}

export interface CollectionFolder {
  id: string;
  name: string;
  requests: SavedRequest[];
  isOpen: boolean;
  createdAt: number;
}

interface CollectionsProps {
  onLoadRequest?: (request: SavedRequest) => void;
}

const METHOD_COLORS: Record<string, string> = {
  GET: "text-[hsl(var(--method-get))]",
  POST: "text-[hsl(var(--method-post))]",
  PUT: "text-[hsl(var(--method-put))]",
  PATCH: "text-[hsl(var(--method-patch))]",
  DELETE: "text-[hsl(var(--method-delete))]",
  OPTIONS: "text-muted-foreground",
  HEAD: "text-muted-foreground",
};

const STORAGE_KEY = "voltapi-collections";

function loadCollections(): CollectionFolder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCollections(folders: CollectionFolder[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
}

export function Collections({ onLoadRequest }: CollectionsProps) {
  const [folders, setFolders] = useState<CollectionFolder[]>(loadCollections);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editingRequest, setEditingRequest] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [contextMenu, setContextMenu] = useState<string | null>(null);
  const [showNewRequest, setShowNewRequest] = useState<string | null>(null);
  const [newRequestName, setNewRequestName] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const persist = useCallback((updated: CollectionFolder[]) => {
    setFolders(updated);
    saveCollections(updated);
  }, []);

  const addFolder = () => {
    const folder: CollectionFolder = {
      id: `folder-${Date.now()}`,
      name: "New Collection",
      requests: [],
      isOpen: true,
      createdAt: Date.now(),
    };
    persist([folder, ...folders]);
    setEditingFolder(folder.id);
    setEditName(folder.name);
  };

  const deleteFolder = (id: string) => {
    persist(folders.filter((f) => f.id !== id));
    setContextMenu(null);
  };

  const toggleFolder = (id: string) => {
    persist(
      folders.map((f) => (f.id === id ? { ...f, isOpen: !f.isOpen } : f)),
    );
  };

  const renameFolder = (id: string) => {
    persist(
      folders.map((f) =>
        f.id === id ? { ...f, name: editName || f.name } : f,
      ),
    );
    setEditingFolder(null);
  };

  const addRequest = (folderId: string) => {
    const req: SavedRequest = {
      id: `req-${Date.now()}`,
      name: newRequestName || "New Request",
      method: "GET",
      url: "",
      headers: [{ key: "", value: "", enabled: true, id: "h1" }],
      params: [{ key: "", value: "", enabled: true, id: "p1" }],
      bodyContent: "",
      bodyType: "json",
      authType: "none",
      authToken: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    persist(
      folders.map((f) =>
        f.id === folderId
          ? { ...f, requests: [...f.requests, req], isOpen: true }
          : f,
      ),
    );
    setShowNewRequest(null);
    setNewRequestName("");
  };

  const deleteRequest = (folderId: string, reqId: string) => {
    persist(
      folders.map((f) =>
        f.id === folderId
          ? { ...f, requests: f.requests.filter((r) => r.id !== reqId) }
          : f,
      ),
    );
    setContextMenu(null);
  };

  const duplicateRequest = (folderId: string, reqId: string) => {
    persist(
      folders.map((f) => {
        if (f.id !== folderId) return f;
        const orig = f.requests.find((r) => r.id === reqId);
        if (!orig) return f;
        const dup: SavedRequest = {
          ...orig,
          id: `req-${Date.now()}`,
          name: `${orig.name} (copy)`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        return { ...f, requests: [...f.requests, dup] };
      }),
    );
    setContextMenu(null);
  };

  const renameRequest = (folderId: string, reqId: string) => {
    persist(
      folders.map((f) =>
        f.id === folderId
          ? {
              ...f,
              requests: f.requests.map((r) =>
                r.id === reqId
                  ? { ...r, name: editName || r.name, updatedAt: Date.now() }
                  : r,
              ),
            }
          : f,
      ),
    );
    setEditingRequest(null);
  };

  const exportCollections = () => {
    const blob = new Blob([JSON.stringify(folders, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "voltapi-collections.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCollections = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (Array.isArray(data)) {
          persist([...data, ...folders]);
          setImportError(null);
        } else {
          setImportError("Invalid format");
        }
      } catch {
        setImportError("Failed to parse JSON");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Filter
  const filtered = searchQuery
    ? folders
        .map((f) => ({
          ...f,
          requests: f.requests.filter(
            (r) =>
              r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              r.url.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
        }))
        .filter(
          (f) =>
            f.requests.length > 0 ||
            f.name.toLowerCase().includes(searchQuery.toLowerCase()),
        )
    : folders;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Collections</h1>
          <span className="text-xs text-muted-foreground ml-1">
            {folders.length}{" "}
            {folders.length === 1 ? "collection" : "collections"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground surface-2 hover:bg-primary/10 transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            Import
            <input
              type="file"
              accept=".json"
              onChange={importCollections}
              className="hidden"
            />
          </label>
          <button
            onClick={exportCollections}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground surface-2 hover:bg-primary/10 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={addFolder}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            New Collection
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b border-border">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg surface-2 border border-border">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search requests..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {importError && (
        <div className="mx-6 mt-3 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center justify-between">
          {importError}
          <button onClick={() => setImportError(null)}>
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Collections List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-1">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-16 h-16 rounded-2xl surface-2 flex items-center justify-center mb-4">
                <FolderOpen className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground text-sm">
                {searchQuery
                  ? "No matching requests found"
                  : "No collections yet"}
              </p>
              {!searchQuery && (
                <button
                  onClick={addFolder}
                  className="mt-3 text-xs text-primary hover:underline"
                >
                  Create your first collection
                </button>
              )}
            </motion.div>
          )}

          {filtered.map((folder) => (
            <motion.div
              key={folder.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-xl overflow-hidden"
            >
              {/* Folder Header */}
              <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-primary/5 transition-colors group">
                <button
                  onClick={() => toggleFolder(folder.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {folder.isOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                <FolderOpen className="w-4 h-4 text-primary/70 shrink-0" />

                {editingFolder === folder.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      renameFolder(folder.id);
                    }}
                    className="flex-1 flex gap-1.5"
                  >
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => renameFolder(folder.id)}
                      className="flex-1 bg-transparent text-sm text-foreground font-medium focus:outline-none border-b border-primary/40"
                    />
                  </form>
                ) : (
                  <span
                    className="flex-1 text-sm font-medium text-foreground truncate cursor-pointer"
                    onDoubleClick={() => {
                      setEditingFolder(folder.id);
                      setEditName(folder.name);
                    }}
                  >
                    {folder.name}
                  </span>
                )}

                <span className="text-[10px] text-muted-foreground">
                  {folder.requests.length} req
                </span>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setShowNewRequest(folder.id);
                      setNewRequestName("");
                    }}
                    className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Add request"
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingFolder(folder.id);
                      setEditName(folder.name);
                    }}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
                    title="Rename"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteFolder(folder.id)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Add request inline */}
              <AnimatePresence>
                {showNewRequest === folder.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        addRequest(folder.id);
                      }}
                      className="flex items-center gap-2 px-10 py-2 border-t border-border/50"
                    >
                      <FilePlus className="w-3.5 h-3.5 text-primary/50 shrink-0" />
                      <input
                        autoFocus
                        value={newRequestName}
                        onChange={(e) => setNewRequestName(e.target.value)}
                        placeholder="Request name..."
                        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="text-xs text-primary hover:underline"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewRequest(null)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Requests */}
              <AnimatePresence>
                {folder.isOpen &&
                  folder.requests.map((req) => (
                    <motion.div
                      key={req.id}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-2 px-4 pl-10 py-2 border-t border-border/30 hover:bg-primary/5 transition-colors group/req">
                        <span
                          className={`text-[10px] font-bold font-mono w-12 shrink-0 ${METHOD_COLORS[req.method] || "text-muted-foreground"}`}
                        >
                          {req.method}
                        </span>

                        {editingRequest === req.id ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              renameRequest(folder.id, req.id);
                            }}
                            className="flex-1"
                          >
                            <input
                              autoFocus
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onBlur={() => renameRequest(folder.id, req.id)}
                              className="w-full bg-transparent text-sm text-foreground focus:outline-none border-b border-primary/40"
                            />
                          </form>
                        ) : (
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">
                              {req.name}
                            </p>
                            {req.url && (
                              <p className="text-[10px] text-muted-foreground font-mono truncate">
                                {req.url}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-0.5 opacity-0 group-hover/req:opacity-100 transition-opacity">
                          <button
                            onClick={() => onLoadRequest?.(req)}
                            className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Open in builder"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => duplicateRequest(folder.id, req.id)}
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
                            title="Duplicate"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingRequest(req.id);
                              setEditName(req.name);
                            }}
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
                            title="Rename"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteRequest(folder.id, req.id)}
                            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
