"use client";

import { create } from "zustand";
import { AnimatePresence, motion } from "framer-motion";
import { Check, AlertCircle, Info, X } from "lucide-react";

type ToastAction = { label: string; onClick: () => void };
type Toast = {
  id: string;
  title: string;
  description?: string;
  tone: "success" | "error" | "info";
  action?: ToastAction;
  duration?: number;
};

type ToastStore = {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
};

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    setTimeout(
      () => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
      t.duration ?? 4200,
    );
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export const toast = {
  success: (title: string, description?: string) =>
    useToast.getState().push({ title, description, tone: "success" }),
  error: (title: string, description?: string) =>
    useToast.getState().push({ title, description, tone: "error" }),
  info: (title: string, description?: string) =>
    useToast.getState().push({ title, description, tone: "info" }),
  /** A toast with an action button (e.g. Undo), shown longer. */
  action: (title: string, action: ToastAction, opts?: { description?: string; tone?: Toast["tone"]; duration?: number }) =>
    useToast.getState().push({
      title,
      action,
      description: opts?.description,
      tone: opts?.tone ?? "info",
      duration: opts?.duration ?? 8000,
    }),
};

export function Toaster() {
  const { toasts, dismiss } = useToast();
  const icon = {
    success: <Check className="h-4 w-4 text-sage" />,
    error: <AlertCircle className="h-4 w-4 text-clay" />,
    info: <Info className="h-4 w-4 text-muse" />,
  };
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-full max-w-sm flex-col gap-2.5"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-line bg-paper-raised p-3.5 shadow-float"
          >
            <div className="mt-0.5 shrink-0">{icon[t.tone]}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-xs text-ink-soft">{t.description}</p>
              )}
            </div>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.onClick();
                  dismiss(t.id);
                }}
                className="shrink-0 self-center rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium text-paper transition-opacity hover:opacity-90"
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="shrink-0 rounded-md p-0.5 text-muted transition-colors hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
