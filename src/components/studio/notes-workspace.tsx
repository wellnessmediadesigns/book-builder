"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Folder,
  FolderOpen,
  FileText,
  Plus,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Trash2,
  FolderPlus,
  StickyNote,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  type FolderNode,
  type NoteNode,
  createFolder,
  createNote,
  renameFolder,
  renameNote,
  saveNote,
  moveNote,
  moveFolder,
  deleteNote,
  deleteFolder,
} from "@/lib/actions/notebook";

type Drag = { type: "note" | "folder"; id: string } | null;

export function NotesWorkspace({ initial }: { initial: { folders: FolderNode[]; notes: NoteNode[] } }) {
  const [folders, setFolders] = useState<FolderNode[]>(initial.folders);
  const [notes, setNotes] = useState<NoteNode[]>(initial.notes);
  const [selectedId, setSelectedId] = useState<string | null>(initial.notes[0]?.id ?? null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag>(null);
  const [dropFolder, setDropFolder] = useState<string | "root" | null>(null);

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  const childFolders = (pid: string | null) =>
    folders.filter((f) => f.parentId === pid).sort((a, b) => a.order - b.order);
  const folderNotes = (fid: string | null) =>
    notes.filter((n) => n.folderId === fid).sort((a, b) => a.order - b.order);

  function toggle(id: string) {
    setExpanded((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function addFolder(parentId: string | null) {
    const { id } = await createFolder(parentId);
    setFolders((f) => [...f, { id, name: "Untitled folder", parentId, order: 999 }]);
    if (parentId) setExpanded((s) => new Set(s).add(parentId));
    setRenamingFolder(id);
  }

  async function addNote(folderId: string | null) {
    const { id } = await createNote(folderId);
    setNotes((n) => [...n, { id, folderId, title: "Untitled note", order: 999, contentJson: null }]);
    if (folderId) setExpanded((s) => new Set(s).add(folderId));
    setSelectedId(id);
  }

  async function removeNote(id: string) {
    setNotes((n) => n.filter((x) => x.id !== id));
    if (selectedId === id) setSelectedId(null);
    await deleteNote(id);
  }

  async function removeFolder(id: string) {
    if (!confirm("Delete this folder and everything inside it?")) return;
    // collect descendants for optimistic removal
    const ids = new Set<string>([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const f of folders) if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) { ids.add(f.id); grew = true; }
    }
    setFolders((f) => f.filter((x) => !ids.has(x.id)));
    setNotes((n) => n.filter((x) => !(x.folderId && ids.has(x.folderId))));
    await deleteFolder(id);
  }

  function isDescendant(folderId: string, maybeAncestor: string): boolean {
    let cur: string | null = folderId;
    const byId = new Map(folders.map((f) => [f.id, f.parentId]));
    while (cur) {
      if (cur === maybeAncestor) return true;
      cur = byId.get(cur) ?? null;
    }
    return false;
  }

  async function dropInto(target: string | null) {
    if (!drag) return;
    const targetFolder = target; // null = root
    if (drag.type === "note") {
      const order = folderNotes(targetFolder).length;
      setNotes((ns) => ns.map((n) => (n.id === drag.id ? { ...n, folderId: targetFolder, order } : n)));
      await moveNote(drag.id, targetFolder, order);
    } else {
      // prevent nesting a folder into itself or a descendant
      if (target && (target === drag.id || isDescendant(target, drag.id))) {
        setDrag(null);
        setDropFolder(null);
        return;
      }
      const order = childFolders(targetFolder).length;
      setFolders((fs) => fs.map((f) => (f.id === drag.id ? { ...f, parentId: targetFolder, order } : f)));
      await moveFolder(drag.id, targetFolder, order);
    }
    setDrag(null);
    setDropFolder(null);
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] max-w-6xl gap-0 lg:gap-5 lg:px-6 lg:py-6">
      {/* ——— Tree sidebar (full screen on mobile, fixed rail on desktop) ——— */}
      <aside
        className={cn(
          "min-h-0 w-full flex-col bg-paper-sunken/30 lg:flex lg:w-[19rem] lg:shrink-0 lg:rounded-2xl lg:border lg:border-line",
          selected ? "hidden lg:flex" : "flex",
        )}
      >
        <div className="flex items-center justify-between gap-1 border-b border-line px-3 py-2.5">
          <span className="flex items-center gap-1.5 font-display text-sm font-semibold text-ink">
            <StickyNote className="h-4 w-4 text-brass" /> Notes
          </span>
          <div className="flex items-center gap-0.5">
            <button onClick={() => addFolder(null)} title="New folder" className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-paper-sunken hover:text-ink">
              <FolderPlus className="h-4 w-4" />
            </button>
            <button onClick={() => addNote(null)} title="New note" className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-paper-sunken hover:text-ink">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          className={cn("min-h-0 flex-1 overflow-y-auto p-2", dropFolder === "root" && "bg-muse-soft/40")}
          onDragOver={(e) => { e.preventDefault(); setDropFolder("root"); }}
          onDrop={() => dropInto(null)}
        >
          <Branch
            parentId={null}
            depth={0}
            childFolders={childFolders}
            folderNotes={folderNotes}
            expanded={expanded}
            toggle={toggle}
            selectedId={selectedId}
            onSelectNote={setSelectedId}
            renamingFolder={renamingFolder}
            setRenamingFolder={setRenamingFolder}
            onRenameFolder={(id, name) => {
              setFolders((f) => f.map((x) => (x.id === id ? { ...x, name } : x)));
              renameFolder(id, name);
            }}
            onAddFolder={addFolder}
            onAddNote={addNote}
            onDeleteFolder={removeFolder}
            onDeleteNote={removeNote}
            drag={drag}
            setDrag={setDrag}
            dropFolder={dropFolder}
            setDropFolder={setDropFolder}
            dropInto={dropInto}
          />
          {folders.length === 0 && notes.length === 0 && (
            <div className="flex flex-col items-center px-4 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-paper-raised text-brass shadow-soft">
                <StickyNote className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-ink">No notes yet</p>
              <p className="mt-1 max-w-[16rem] text-xs text-ink-soft">Create your first note, or a folder to organize them.</p>
              <div className="mt-4 flex flex-col gap-2">
                <Button variant="brass" size="sm" onClick={() => addNote(null)}><Plus className="h-4 w-4" /> New note</Button>
                <Button variant="museSoft" size="sm" onClick={() => addFolder(null)}><FolderPlus className="h-4 w-4" /> New folder</Button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ——— Editor (full screen on mobile when a note is open) ——— */}
      <section
        className={cn(
          "min-w-0 flex-1 flex-col overflow-hidden lg:flex lg:rounded-2xl lg:border lg:border-line lg:bg-paper-raised",
          selected ? "flex w-full" : "hidden lg:flex",
        )}
      >
        {selected ? (
          <NoteEditor
            key={selected.id}
            note={selected}
            onBack={() => setSelectedId(null)}
            onTitleChange={(t) => setNotes((ns) => ns.map((n) => (n.id === selected.id ? { ...n, title: t } : n)))}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-paper-sunken text-brass">
              <StickyNote className="h-7 w-7" />
            </div>
            <h2 className="font-display text-lg font-semibold text-ink">Your notes, organized</h2>
            <p className="mt-1.5 max-w-sm text-sm text-ink-soft">
              Create a note or a folder, then drag notes into folders to organize them. Everything
              autosaves.
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="museSoft" onClick={() => addFolder(null)}><FolderPlus className="h-4 w-4" /> New folder</Button>
              <Button variant="brass" onClick={() => addNote(null)}><Plus className="h-4 w-4" /> New note</Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ——————————————————————————————————————————————— Tree branch

function Branch(props: {
  parentId: string | null;
  depth: number;
  childFolders: (pid: string | null) => FolderNode[];
  folderNotes: (fid: string | null) => NoteNode[];
  expanded: Set<string>;
  toggle: (id: string) => void;
  selectedId: string | null;
  onSelectNote: (id: string) => void;
  renamingFolder: string | null;
  setRenamingFolder: (id: string | null) => void;
  onRenameFolder: (id: string, name: string) => void;
  onAddFolder: (parentId: string | null) => void;
  onAddNote: (folderId: string | null) => void;
  onDeleteFolder: (id: string) => void;
  onDeleteNote: (id: string) => void;
  drag: Drag;
  setDrag: (d: Drag) => void;
  dropFolder: string | "root" | null;
  setDropFolder: (id: string | "root" | null) => void;
  dropInto: (target: string | null) => void;
}) {
  const { parentId, depth } = props;
  const pad = { paddingLeft: `${depth * 14 + 8}px` };

  return (
    <div>
      {props.childFolders(parentId).map((f) => {
        const open = props.expanded.has(f.id);
        const isDrop = props.dropFolder === f.id;
        return (
          <div key={f.id}>
            <div
              draggable
              onDragStart={(e) => { e.stopPropagation(); props.setDrag({ type: "folder", id: f.id }); }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); props.setDropFolder(f.id); }}
              onDrop={(e) => { e.stopPropagation(); props.dropInto(f.id); }}
              style={pad}
              className={cn(
                "group flex items-center gap-1 rounded-lg py-1.5 pr-1.5 transition-colors",
                isDrop ? "bg-muse-soft" : "hover:bg-paper-raised/70",
              )}
            >
              <button onClick={() => props.toggle(f.id)} className="flex h-5 w-5 shrink-0 items-center justify-center text-muted">
                {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
              {open ? <FolderOpen className="h-4 w-4 shrink-0 text-brass" /> : <Folder className="h-4 w-4 shrink-0 text-brass" />}
              {props.renamingFolder === f.id ? (
                <input
                  autoFocus
                  defaultValue={f.name}
                  onBlur={(e) => { props.onRenameFolder(f.id, e.target.value); props.setRenamingFolder(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  className="min-w-0 flex-1 rounded border border-muse/40 bg-paper px-1 text-sm text-ink outline-none"
                />
              ) : (
                <button
                  onClick={() => props.toggle(f.id)}
                  onDoubleClick={() => props.setRenamingFolder(f.id)}
                  className="min-w-0 flex-1 truncate text-left text-sm text-ink"
                >
                  {f.name}
                </button>
              )}
              <div className="flex shrink-0 items-center opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                <button onClick={() => props.onAddNote(f.id)} title="New note here" className="flex h-6 w-6 items-center justify-center rounded text-muted hover:text-ink"><Plus className="h-3.5 w-3.5" /></button>
                <button onClick={() => props.onAddFolder(f.id)} title="New subfolder" className="flex h-6 w-6 items-center justify-center rounded text-muted hover:text-ink"><FolderPlus className="h-3.5 w-3.5" /></button>
                <button onClick={() => props.onDeleteFolder(f.id)} title="Delete folder" className="flex h-6 w-6 items-center justify-center rounded text-muted hover:text-clay"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            {open && (
              <Branch {...props} parentId={f.id} depth={depth + 1} />
            )}
          </div>
        );
      })}

      {props.folderNotes(parentId).map((n) => {
        const active = props.selectedId === n.id;
        return (
          <div
            key={n.id}
            draggable
            onDragStart={(e) => { e.stopPropagation(); props.setDrag({ type: "note", id: n.id }); }}
            style={{ paddingLeft: `${depth * 14 + 28}px` }}
            className={cn(
              "group flex items-center gap-1.5 rounded-lg py-1.5 pr-1.5 transition-colors",
              active ? "bg-paper-raised shadow-soft" : "hover:bg-paper-raised/70",
            )}
          >
            <FileText className={cn("h-4 w-4 shrink-0", active ? "text-muse" : "text-muted")} />
            <button onClick={() => props.onSelectNote(n.id)} className={cn("min-w-0 flex-1 truncate text-left text-sm", active ? "font-medium text-ink" : "text-ink-soft")}>
              {n.title || "Untitled note"}
            </button>
            <button onClick={() => props.onDeleteNote(n.id)} title="Delete note" className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted opacity-100 transition-opacity hover:text-clay lg:opacity-0 lg:group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        );
      })}
    </div>
  );
}

// ——————————————————————————————————————————————— Editor

function NoteEditor({ note, onTitleChange, onBack }: { note: NoteNode; onTitleChange: (t: string) => void; onBack: () => void }) {
  const [title, setTitle] = useState(note.title);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<{ json: string; text: string }>({ json: note.contentJson ?? "", text: "" });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Typography,
      Placeholder.configure({ placeholder: "Start writing…" }),
    ],
    content: note.contentJson ? safeParse(note.contentJson) : "",
    editorProps: { attributes: { class: "manuscript focus:outline-none" } },
    onUpdate: ({ editor }) => {
      latest.current = { json: JSON.stringify(editor.getJSON()), text: editor.getText() };
      scheduleSave();
    },
  });

  function scheduleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveNote(note.id, { title, contentJson: latest.current.json, contentText: latest.current.text }).catch(() => {});
    }, 900);
  }

  // Save on unmount / note switch.
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveNote(note.id, { title, contentJson: latest.current.json, contentText: latest.current.text }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function commitTitle() {
    onTitleChange(title);
    renameNote(note.id, title).catch(() => {});
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-5 py-3 sm:px-8">
        <button onClick={onBack} className="mb-1.5 inline-flex items-center gap-1 text-sm text-ink-soft transition-colors hover:text-ink lg:hidden">
          <ChevronLeft className="h-4 w-4" /> Notes
        </button>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          placeholder="Untitled note"
          className="w-full bg-transparent font-display text-2xl font-semibold text-ink outline-none placeholder:text-ink-soft/40"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
        <EditorContent editor={editor} className="manuscript" />
      </div>
    </div>
  );
}

function safeParse(json: string) {
  try {
    return JSON.parse(json);
  } catch {
    return "";
  }
}
