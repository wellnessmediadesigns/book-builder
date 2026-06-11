"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { assembleBookPackage } from "@/lib/export/assemble";
import { buildHtml } from "@/lib/export/manuscript";

/** Renders the formatted book to HTML for the in-app preview (optionally with a
 *  theme override so the picker updates live before saving). */
export async function previewHtml(projectId: string, themeId?: string): Promise<string> {
  const assembled = await assembleBookPackage(projectId);
  if (!assembled) return "<p>Project not found.</p>";
  return buildHtml(assembled.pkg, themeId ?? assembled.theme);
}

export async function setBookTheme(projectId: string, themeId: string) {
  await prisma.project.update({ where: { id: projectId }, data: { formatTheme: themeId } });
  revalidatePath(`/studio/book/${projectId}/export`);
  return { ok: true };
}
