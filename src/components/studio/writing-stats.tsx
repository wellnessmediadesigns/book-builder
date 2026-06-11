"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Flame, Target, Check, Pencil } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { setDailyGoal, type WritingStats } from "@/lib/actions/stats";

export function WritingStatsCard({ stats }: { stats: WritingStats }) {
  const [goal, setGoal] = useState(stats.goal);
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();

  const pct = goal > 0 ? Math.min(100, Math.round((stats.today / goal) * 100)) : 0;
  const hitGoal = stats.today >= goal && goal > 0;
  const R = 30;
  const C = 2 * Math.PI * R;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-line bg-paper-raised p-5 shadow-soft"
    >
      <div className="flex flex-wrap items-center gap-5">
        {/* daily goal ring */}
        <div className="relative h-[76px] w-[76px] shrink-0">
          <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
            <circle cx="38" cy="38" r={R} fill="none" stroke="hsl(var(--line))" strokeWidth="7" />
            <motion.circle
              cx="38"
              cy="38"
              r={R}
              fill="none"
              stroke={hitGoal ? "hsl(var(--sage))" : "hsl(var(--brass))"}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: C - (C * pct) / 100 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {hitGoal ? (
              <Check className="h-5 w-5 text-sage" />
            ) : (
              <span className="font-display text-lg font-semibold text-ink">{pct}%</span>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-brass" />
            <span className="text-sm font-medium text-ink">Today&apos;s writing</span>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted transition-colors hover:bg-paper-sunken hover:text-ink"
              >
                <Pencil className="h-3 w-3" /> Goal
              </button>
            )}
          </div>
          {editing ? (
            <form
              className="mt-2 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  await setDailyGoal(goal);
                  setEditing(false);
                });
              }}
            >
              <input
                type="number"
                min={50}
                step={50}
                value={goal}
                autoFocus
                onChange={(e) => setGoal(Number(e.target.value))}
                className="h-8 w-24 rounded-lg border border-line bg-paper px-2 text-sm text-ink outline-none focus:border-muse/40 focus:ring-2 focus:ring-muse/20"
              />
              <span className="text-xs text-muted">words/day</span>
              <button
                type="submit"
                disabled={pending}
                className="ml-auto rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper hover:opacity-90"
              >
                Save
              </button>
            </form>
          ) : (
            <p className="mt-0.5 font-display text-2xl font-semibold text-ink">
              {formatNumber(stats.today)}
              <span className="text-sm font-normal text-muted"> / {formatNumber(goal)} words</span>
            </p>
          )}
        </div>

        {/* streak */}
        <div className="shrink-0 rounded-xl bg-paper-sunken/50 px-4 py-2.5 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Flame className={cn("h-5 w-5", stats.streak > 0 ? "text-brass" : "text-muted")} />
            <span className="font-display text-2xl font-semibold text-ink">{stats.streak}</span>
          </div>
          <p className="text-[0.6875rem] text-muted">day streak</p>
        </div>
      </div>

      {/* 28-day heatmap */}
      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs text-muted">Last 4 weeks</span>
          <span className="text-xs text-muted">
            best streak {stats.bestStreak} · {formatNumber(stats.totalWords)} words tracked
          </span>
        </div>
        <div className="flex gap-1">
          {stats.days.map((d) => (
            <Cell key={d.day} day={d.day} words={d.words} goal={goal} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Cell({ day, words, goal }: { day: string; words: number; goal: number }) {
  const ratio = goal > 0 ? words / goal : 0;
  const level = words === 0 ? 0 : ratio < 0.34 ? 1 : ratio < 0.67 ? 2 : ratio < 1 ? 3 : 4;
  const bg = [
    "bg-paper-sunken",
    "bg-brass/25",
    "bg-brass/45",
    "bg-brass/70",
    "bg-brass",
  ][level];
  const label = new Date(day + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return (
    <div
      title={`${label}: ${formatNumber(words)} words`}
      className={cn("h-6 flex-1 rounded-[4px] transition-colors", bg)}
    />
  );
}
