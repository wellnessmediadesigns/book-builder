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
}) {
  const author = await getAuthor();
  await prisma.settings.update({
    where: { authorId: author.id },
    data,
  });
  revalidatePath("/studio/settings");
  return { ok: true };
}

export async function updateAuthorName(name: string) {
  const author = await getAuthor();
  await prisma.author.update({ where: { id: author.id }, data: { name } });
  revalidatePath("/studio", "layout");
}
