"use server";

import { prisma, getAuthor } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateSettings(data: {
  provider?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxContext?: number;
  readingFont?: string;
  fallbackProvider?: string;
  fallbackModel?: string;
  fallbackApiKey?: string;
  fallbackBaseUrl?: string;
}) {
  // Trim text fields so stray paste whitespace can't break auth or model lookup.
  const clean = { ...data };
  for (const k of ["apiKey", "model", "baseUrl", "fallbackApiKey", "fallbackModel", "fallbackBaseUrl"] as const) {
    if (typeof clean[k] === "string") clean[k] = (clean[k] as string).trim();
  }
  const author = await getAuthor();
  await prisma.settings.update({
    where: { authorId: author.id },
    data: clean,
  });
  revalidatePath("/studio/settings");
  return { ok: true };
}

/** Swaps the primary and fallback providers (incl. their models, keys, URLs). */
export async function swapProviders() {
  const author = await getAuthor();
  const s = author.settings;
  if (!s) return { ok: false };
  await prisma.settings.update({
    where: { authorId: author.id },
    data: {
      provider: s.fallbackProvider || "workersai",
      model: s.fallbackModel,
      apiKey: s.fallbackApiKey,
      baseUrl: s.fallbackBaseUrl,
      fallbackProvider: s.provider,
      fallbackModel: s.model,
      fallbackApiKey: s.apiKey,
      fallbackBaseUrl: s.baseUrl,
    },
  });
  revalidatePath("/studio/settings");
  return { ok: true };
}

export async function updateAuthorName(name: string) {
  const author = await getAuthor();
  await prisma.author.update({ where: { id: author.id }, data: { name } });
  revalidatePath("/studio", "layout");
}

/** Updates the author profile (name + email) shown in the account menu. */
export async function updateProfile(input: { name: string; email: string }) {
  const author = await getAuthor();
  await prisma.author.update({
    where: { id: author.id },
    data: { name: input.name.trim() || "Author", email: input.email.trim() || null },
  });
  revalidatePath("/studio", "layout");
  return { ok: true };
}
