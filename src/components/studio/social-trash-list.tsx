"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Trash2, Share2 } from "lucide-react";
import { Card, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { relativeTime } from "@/lib/utils";
import { platformLabel } from "@/lib/social";
import { restorePost, purgePost } from "@/lib/actions/social";

type Trashed = { id: string; title: string; platforms: string[]; deletedAt: string };

export function SocialTrashList({ items }: { items: Trashed[] }) {
  const [rows, setRows] = useState(items);
  const [pending, start] = useTransition();

  function restore(id: string) {
    setRows((r) => r.filter((x) => x.id !== id));
    start(async () => {
      await restorePost(id);
      toast.success("Post restored");
    });
  }

  function purge(id: string, title: string) {
    if (!window.confirm(`Permanently delete “${title}”? This cannot be undone.`)) return;
    setRows((r) => r.filter((x) => x.id !== id));
    start(async () => {
      await purgePost(id);
      toast.success("Deleted permanently");
    });
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line bg-paper-raised/50 px-6 py-16 text-center text-sm text-muted">
        Trash is empty. Deleted posts land here and can be restored.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((p, i) => (
        <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.03 }}>
          <Card className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-display font-semibold text-ink">{p.title}</h3>
              <p className="mt-1 flex items-center gap-3 text-xs text-muted">
                <span className="inline-flex items-center gap-1">
                  <Share2 className="h-3.5 w-3.5" /> {p.platforms.map(platformLabel).join(", ") || "no platforms"}
                </span>
                <span>deleted {relativeTime(p.deletedAt)}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="soft" size="sm" disabled={pending} onClick={() => restore(p.id)}>
                <RotateCcw className="h-3.5 w-3.5" /> Restore
              </Button>
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => purge(p.id, p.title)} className="text-clay hover:bg-clay/10">
                <Trash2 className="h-3.5 w-3.5" /> Delete forever
              </Button>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
