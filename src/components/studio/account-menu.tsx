"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import {
  BookMarked,
  Lightbulb,
  Mail,
  Plus,
  Palette,
  Image as ImageIcon,
  Settings,
  Trash2,
  Download,
  LogOut,
  Pencil,
  Check,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { updateProfile } from "@/lib/actions/settings";
import { logout } from "@/lib/actions/auth";

const NAV = [
  { href: "/studio", label: "Library", icon: BookMarked },
  { href: "/studio/newsletters", label: "Newsletters", icon: Mail },
  { href: "/studio/brainstorm", label: "Brainstorm", icon: Lightbulb },
  { href: "/studio/covers", label: "Cover Studio", icon: ImageIcon },
  { href: "/studio/new", label: "New book", icon: Plus },
  { href: "/studio/style", label: "Style guide", icon: Palette },
  { href: "/studio/settings", label: "Settings", icon: Settings },
  { href: "/studio/trash", label: "Trash", icon: Trash2 },
];

export function AccountMenu({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [n, setN] = useState(name);
  const [e, setE] = useState(email);
  const [pending, start] = useTransition();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const initial = (name || "A").slice(0, 1).toUpperCase();

  function save() {
    start(async () => {
      await updateProfile({ name: n, email: e });
      setEditing(false);
      toast.success("Profile saved");
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        className="ml-1 flex h-9 w-9 items-center justify-center rounded-xl bg-brass/15 font-display text-sm font-semibold text-brass-deep transition-transform hover:scale-105"
      >
        {initial}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-2xl border border-line bg-paper-raised p-1.5 shadow-float"
            >
              {/* profile */}
              <div className="rounded-xl bg-paper-sunken/50 p-3">
                {editing ? (
                  <div className="space-y-2">
                    <Input value={n} onChange={(ev) => setN(ev.target.value)} placeholder="Your name" className="h-9" />
                    <Input value={e} onChange={(ev) => setE(ev.target.value)} placeholder="Email (optional)" type="email" className="h-9" />
                    <div className="flex justify-end gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                      <Button variant="primary" size="sm" onClick={save} disabled={pending}>
                        <Check className="h-3.5 w-3.5" /> Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brass/15 font-display text-base font-semibold text-brass-deep">
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{name || "Author"}</p>
                      <p className="truncate text-xs text-muted">{email || "Add your email"}</p>
                    </div>
                    <button
                      onClick={() => setEditing(true)}
                      aria-label="Edit profile"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-paper-raised hover:text-ink"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* nav */}
              <div className="my-1.5 space-y-0.5">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink"
                  >
                    <item.icon className="h-4 w-4" /> {item.label}
                  </Link>
                ))}
                <a
                  href="/api/backup"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink"
                >
                  <Download className="h-4 w-4" /> Download backup
                </a>
                <button
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink"
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {isDark ? "Light mode" : "Dark mode"}
                </button>
              </div>

              <div className="border-t border-line pt-1.5">
                <button
                  onClick={() => start(() => logout())}
                  disabled={pending}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-clay transition-colors hover:bg-clay/10"
                >
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
