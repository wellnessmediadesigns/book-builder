"use server";

import { prisma, getAuthor } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { countWords } from "@/lib/utils";
import { resolveAiConfig, buildBookContext } from "@/lib/ai/context";
import { complete, configIsReady, AiError } from "@/lib/ai/providers";
import { matterMessages } from "@/lib/ai/prompts";
import { MATTER_SECTIONS, matterTypeOf, sectionByMatterType } from "@/lib/matter";

export type MatterRow = {
  id: string;
  matterType: string;
  group: string;
  key: string;
  title: string;
  content: string;
  updatedAt: string;
};

/** Lists matter sections for a project, creating missing rows on first visit. */
export async function listMatter(projectId: string): Promise<MatterRow[]> {
  const existing = await prisma.chapter.findMany({
    where: { projectId, matterType: { not: null } },
  });
  const have = new Set(existing.map((c) => c.matterType));
  const missing = MATTER_SECTIONS.filter((s) => !have.has(matterTypeOf(s)));
  if (missing.length) {
    await prisma.chapter.createMany({
      data: missing.map((s, i) => ({
        projectId,
        matterType: matterTypeOf(s),
        title: s.title,
        order: 10_000 + i, // far outside body-chapter ordering
      })),
    });
  }
  const rows = await prisma.chapter.findMany({
    where: { projectId, matterType: { not: null } },
  });
  return rows
    .map((r) => {
      const [group, key] = (r.matterType ?? "").split(":");
      return {
        id: r.id,
        matterType: r.matterType ?? "",
        group,
        key,
        title: r.title,
        content: r.contentText,
        updatedAt: r.updatedAt.toISOString(),
      };
    })
    .sort(
      (a, b) =>
        MATTER_SECTIONS.findIndex((s) => matterTypeOf(s) === a.matterType) -
        MATTER_SECTIONS.findIndex((s) => matterTypeOf(s) === b.matterType),
    );
}

export async function saveMatter(sectionId: string, content: string) {
  const row = await prisma.chapter.update({
    where: { id: sectionId },
    data: {
      contentText: content,
      wordCount: countWords(content),
      status: content.trim() ? "drafted" : "planned",
    },
  });
  revalidatePath(`/studio/book/${row.projectId}/matter`);
}

export async function generateMatter(
  sectionId: string,
): Promise<{ ok: true; content: string } | { ok: false; error: string }> {
  const config = await resolveAiConfig();
  if (!configIsReady(config)) return { ok: false, error: "no_key" };

  const row = await prisma.chapter.findUniqueOrThrow({ where: { id: sectionId } });
  const section = row.matterType ? sectionByMatterType(row.matterType) : undefined;
  if (!section) return { ok: false, error: "Unknown section." };

  const ctx = await buildBookContext(row.projectId);
  const author = await getAuthor();

  try {
    const content = await complete(
      config,
      matterMessages(ctx, author.name, section.title, section.directive),
    );
    await prisma.chapter.update({
      where: { id: sectionId },
      data: { contentText: content, wordCount: countWords(content), status: "drafted" },
    });
    await prisma.generationLog
      .create({
        data: {
          projectId: row.projectId,
          scope: "matter",
          provider: config.provider,
          model: config.model,
          command: section.key,
          outputChars: content.length,
        },
      })
      .catch(() => {});
    revalidatePath(`/studio/book/${row.projectId}/matter`);
    return { ok: true, content };
  } catch (e) {
    return { ok: false, error: e instanceof AiError ? e.message : "Generation failed." };
  }
}
