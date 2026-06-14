"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Plus,
  BookMarked,
  Settings,
  Palette,
  Moon,
  Sun,
  BookOpen,
  CornerDownLeft,
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import { listProjectsBrief } from "@/lib/actions/projects";
import { searchChapters } from "@/lib/actions/chapters";
import { listSessions, type SessionBrief } from "@/lib/actions/brainstorm";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/primitives";
import { FileText } from "lucide-react";

type Item = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  group: "Actions" | "Books" | "Brainstorms" | "Chapters" | "Theme";
  run: () => void;
};

type Project = { id: string; title: string; status: string };
type ChapterHit = {
  id: string;
  projectId: string;
  bookTitle: string;
  title: string;
  snippet: string;
  href: string;
};

export function CommandPalette() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sessions, setSessions] = useState<SessionBrief[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [chapterHits, setChapterHits] = useState<ChapterHit[]>([]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  // Global ⌘K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lazy-load the library the first time it opens.
  useEffect(() => {
    if (open && !loaded) {
      setLoaded(true);
      listProjectsBrief()
        .then(setProjects)
        .catch(() => {});
      listSessions()
        .then(setSessions)
        .catch(() => {});
    }
  }, [open, loaded]);

  // Debounced full-text chapter search across the library.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setChapterHits([]);
      return;
    }
    const t = setTimeout(() => {
      searchChapters(q)
        .then(setChapterHits)
        .catch(() => setChapterHits([]));
    }, 220);
    return () => clearTimeout(t);
  }, [query, open]);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  const items = useMemo<Item[]>(() => {
    const isDark = resolvedTheme === "dark";
    const base: Item[] = [
      {
        id: "new",
        label: "New book",
        hint: "Start a project",
        icon: <Plus className="h-4 w-4" />,
        group: "Actions",
        run: () => go("/studio/new"),
      },
      {
        id: "library",
        label: "Go to library",
        icon: <BookMarked className="h-4 w-4" />,
        group: "Actions",
        run: () => go("/studio"),
      },
      {
        id: "brainstorm",
        label: "Brainstorm",
        hint: "Find a book idea",
        icon: <Lightbulb className="h-4 w-4" />,
        group: "Actions",
        run: () => go("/studio/brainstorm"),
      },
      {
        id: "settings",
        label: "Settings",
        hint: "AI provider, author",
        icon: <Settings className="h-4 w-4" />,
        group: "Actions",
        run: () => go("/studio/settings"),
      },
      {
        id: "style",
        label: "Style guide",
        icon: <Palette className="h-4 w-4" />,
        group: "Actions",
        run: () => go("/studio/style"),
      },
      {
        id: "theme",
        label: isDark ? "Switch to light" : "Switch to dark",
        icon: isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
        group: "Theme",
        run: () => {
          setTheme(isDark ? "light" : "dark");
          close();
        },
      },
    ];
    const books: Item[] = projects.map((p) => ({
      id: p.id,
      label: p.title,
      hint: p.status === "draft" ? "Blueprint" : "Open",
      icon: <BookOpen className="h-4 w-4" />,
      group: "Books",
      run: () =>
        go(`/studio/book/${p.id}/${p.status === "draft" ? "blueprint" : "write"}`),
    }));
    const brainstorms: Item[] = sessions.map((s) => ({
      id: `bs-${s.id}`,
      label: s.title,
      hint: s.status === "built" ? "Built" : `${s.directionCount} points`,
      icon: <Lightbulb className="h-4 w-4" />,
      group: "Brainstorms",
      run: () => go(`/studio/brainstorm/${s.id}`),
    }));
    return [...base, ...books, ...brainstorms];
  }, [projects, sessions, resolvedTheme, go, close, setTheme]);

  const chapterItems = useMemo<Item[]>(
    () =>
      chapterHits.map((h) => ({
        id: `ch-${h.id}`,
        label: h.title,
        hint: h.bookTitle,
        icon: <FileText className="h-4 w-4" />,
        group: "Chapters" as const,
        run: () => go(h.href),
      })),
    [chapterHits, go],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? items.filter((i) => i.label.toLowerCase().includes(q)) : items;
    // Chapter hits are already server-filtered; always include them.
    return [...base, ...chapterItems];
  }, [items, query, chapterItems]);

  useEffect(() => setActive(0), [query]);

  const groups = useMemo(() => {
    const order: Item["group"][] = ["Actions", "Books", "Brainstorms", "Chapters", "Theme"];
    return order
      .map((g) => ({ group: g, items: filtered.filter((i) => i.group === g) }))
      .filter((g) => g.items.length);
  }, [filtered]);

  function onListKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[active]?.run();
    }
  }

  let flatIndex = -1;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
            onClick={close}
          />
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-paper-raised shadow-float"
            onKeyDown={onListKey}
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="h-4 w-4 shrink-0 text-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search books and actions…"
                className="h-12 w-full bg-transparent text-sm text-ink placeholder:text-muted outline-none"
              />
              <Kbd>esc</Kbd>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted">No matches.</p>
              ) : (
                groups.map((g) => (
                  <div key={g.group} className="mb-1">
                    <p className="px-3 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
                      {g.group}
                    </p>
                    {g.items.map((item) => {
                      flatIndex++;
                      const isActive = flatIndex === active;
                      const idx = flatIndex;
                      return (
                        <button
                          key={item.id}
                          onMouseEnter={() => setActive(idx)}
                          onClick={item.run}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                            isActive ? "bg-muse-soft text-ink" : "text-ink-soft hover:bg-paper-sunken",
                          )}
                        >
                          <span className={cn(isActive ? "text-muse-deep" : "text-muted")}>
                            {item.icon}
                          </span>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.hint && (
                            <span className="text-xs text-muted">{item.hint}</span>
                          )}
                          {isActive && <CornerDownLeft className="h-3.5 w-3.5 text-muse" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center gap-3 border-t border-line px-4 py-2 text-[0.6875rem] text-muted">
              <span className="flex items-center gap-1">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> navigate
              </span>
              <span className="flex items-center gap-1">
                <Kbd>↵</Kbd> select
              </span>
              <span className="ml-auto flex items-center gap-1">
                Quick open <Kbd>⌘K</Kbd>
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
