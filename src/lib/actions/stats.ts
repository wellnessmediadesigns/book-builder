"use server";

import { prisma, getAuthor } from "@/lib/db";
import { revalidatePath } from "next/cache";

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Records net words written for a day. Called from autosave/generation. */
export async function recordWriting(delta: number, day?: string) {
  if (!Number.isFinite(delta) || delta === 0) return;
  const author = await getAuthor();
  const d = day || todayUTC();
  const existing = await prisma.dailyStat.findUnique({
    where: { authorId_day: { authorId: author.id, day: d } },
  });
  if (existing) {
    await prisma.dailyStat.update({
      where: { id: existing.id },
      data: { words: Math.max(0, existing.words + delta), saves: existing.saves + 1 },
    });
  } else {
    await prisma.dailyStat.create({
      data: { authorId: author.id, day: d, words: Math.max(0, delta), saves: 1 },
    });
  }
}

export type WritingStats = {
  today: number;
  goal: number;
  streak: number;
  bestStreak: number;
  totalWords: number;
  days: { day: string; words: number }[]; // last 28 days, oldest→newest
};

export async function getWritingStats(): Promise<WritingStats> {
  const author = await getAuthor();
  const goal = author.settings?.dailyGoal ?? 500;

  const rows = await prisma.dailyStat.findMany({
    where: { authorId: author.id },
    orderBy: { day: "desc" },
    take: 400,
  });
  const byDay = new Map(rows.map((r) => [r.day, r.words]));
  const today = todayUTC();
  const todayWords = byDay.get(today) ?? 0;

  // Current streak: consecutive days with words > 0, ending today or yesterday.
  const wrote = (d: string) => (byDay.get(d) ?? 0) > 0;
  let streak = 0;
  const cursor = new Date(today + "T00:00:00Z");
  if (!wrote(today)) cursor.setUTCDate(cursor.getUTCDate() - 1); // grace: streak alive until end of today
  while (wrote(dayString(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  // Best streak across history.
  const writtenDays = rows
    .filter((r) => r.words > 0)
    .map((r) => r.day)
    .sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const ds of writtenDays) {
    const d = new Date(ds + "T00:00:00Z");
    if (prev && (d.getTime() - prev.getTime()) / 86400000 === 1) run++;
    else run = 1;
    best = Math.max(best, run);
    prev = d;
  }

  // Last 28 days for the heatmap.
  const days: { day: string; words: number }[] = [];
  const start = new Date(today + "T00:00:00Z");
  start.setUTCDate(start.getUTCDate() - 27);
  for (let i = 0; i < 28; i++) {
    const ds = dayString(start);
    days.push({ day: ds, words: byDay.get(ds) ?? 0 });
    start.setUTCDate(start.getUTCDate() + 1);
  }

  const totalWords = rows.reduce((s, r) => s + r.words, 0);
  return { today: todayWords, goal, streak, bestStreak: best, totalWords, days };
}

export async function setDailyGoal(goal: number) {
  const author = await getAuthor();
  await prisma.settings.update({
    where: { authorId: author.id },
    data: { dailyGoal: Math.max(50, Math.min(20000, Math.round(goal))) },
  });
  revalidatePath("/studio");
}
