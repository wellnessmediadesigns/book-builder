"use server";

import { prisma, getAuthor } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { countWords, docToText, textToDoc } from "@/lib/utils";
import { buildBookContext, completeWithFallback, aiChainReady } from "@/lib/ai/context";
import { AiError } from "@/lib/ai/providers";
import { matterMessages } from "@/lib/ai/prompts";
import { MATTER_SECTIONS, matterTypeOf, sectionByMatterType } from "@/lib/matter";

function revalidateBook(projectId: string) {
  for (const tab of ["write", "outline", "matter", "blueprint", "export"]) {
    revalidatePath(`/studio/book/${projectId}/${tab}`);
  }
}

/** Converts a body chapter into a front/back-matter section (e.g. Introduction). */
export async function convertChapterToMatter(chapterId: string, matterType: string) {
  const ch = await prisma.chapter.findUniqueOrThrow({ where: { id: chapterId } });
  if (ch.matterType !== null) return { ok: false as const };
  const section = sectionByMatterType(matterType);
  if (!section) return { ok: false as const };

  // If a (usually empty) row for this section already exists, move content into it
  // so we never end up with two of the same section.
  const existing = await prisma.chapter.findFirst({
    where: { projectId: ch.projectId, matterType, id: { not: ch.id } },
  });
  if (existing) {
    await prisma.chapter.update({
      where: { id: existing.id },
      data: {
        contentText: ch.contentText || existing.contentText,
        contentJson: ch.contentJson ?? existing.contentJson,
        wordCount: ch.wordCount || existing.wordCount,
        status: ch.wordCount > 0 ? "drafted" : existing.status,
      },
    });
    await prisma.chapter.delete({ where: { id: ch.id } });
  } else {
    await prisma.chapter.update({
      where: { id: ch.id },
      data: { matterType, title: section.title, order: 10_000 },
    });
  }

  // Close the gap in the body-chapter ordering.
  const body = await prisma.chapter.findMany({
    where: { projectId: ch.projectId, matterType: null },
    orderBy: { order: "asc" },
  });
  for (let i = 0; i < body.length; i++) {
    if (body[i].order !== i)
      await prisma.chapter.update({ where: { id: body[i].id }, data: { order: i } });
  }

  revalidateBook(ch.projectId);
  return { ok: true as const, group: section.group };
}

/** Converts a matter section back into a regular body chapter at the end. */
export async function convertMatterToChapter(sectionId: string) {
  const s = await prisma.chapter.findUniqueOrThrow({ where: { id: sectionId } });
  if (!s.matterType) return { ok: false as const };

  const max = await prisma.chapter.aggregate({
    where: { projectId: s.projectId, matterType: null },
    _max: { order: true },
  });
  const json =
    s.contentJson ?? (s.contentText ? JSON.stringify(textToDoc(s.contentText)) : null);
  await prisma.chapter.update({
    where: { id: sectionId },
    data: {
      matterType: null,
      order: (max._max.order ?? -1) + 1,
      contentJson: json,
      contentText: s.contentText || (json ? docToText(JSON.parse(json)) : ""),
      status: s.wordCount > 0 ? "drafted" : "planned",
    },
  });
  revalidateBook(s.projectId);
  return { ok: true as const };
}

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

function buildCopyrightContent(holder: string, kind: string): string {
  const year = new Date().getFullYear();
  const fiction = kind === "fiction";
  const disclaimer = fiction
    ? "This is a work of fiction. Names, characters, places, and incidents are products of the author's imagination or are used fictitiously. Any resemblance to actual events, locales, or persons, living or dead, is entirely coincidental."
    : "The information in this book is provided for general informational and educational purposes only and is not intended as professional advice. Readers should seek qualified professional guidance for their specific situations.";
  return `© ${year} ${holder}. All rights reserved.

No part of this publication may be reproduced, stored in a retrieval system, or transmitted in any form or by any means — electronic, mechanical, photocopying, recording, or otherwise — without prior written permission from the author, except for brief quotations in critical reviews or scholarly publications.

${disclaimer}`;
}

export async function generateMatter(
  sectionId: string,
): Promise<{ ok: true; content: string } | { ok: false; error: string }> {
  if (!(await aiChainReady())) return { ok: false, error: "no_key" };

  const row = await prisma.chapter.findUniqueOrThrow({ where: { id: sectionId } });
  const section = row.matterType ? sectionByMatterType(row.matterType) : undefined;
  if (!section) return { ok: false, error: "Unknown section." };

  const author = await getAuthor();
  const project = await prisma.project.findUnique({
    where: { id: row.projectId },
    select: { authorName: true, copyrightHolder: true, kind: true },
  });
  const byline = project?.authorName.trim() || author.name;

  // Copyright is purely formulaic — generate from a template instead of AI.
  if (section.key === "copyright") {
    // Rights holder resolves: per-book override → global publishing name → byline.
    const holder =
      project?.copyrightHolder.trim() ||
      author.settings?.publisherName.trim() ||
      byline;
    const content = buildCopyrightContent(holder, project?.kind ?? "nonfiction");
    await prisma.chapter.update({
      where: { id: sectionId },
      data: { contentText: content, wordCount: countWords(content), status: "drafted" },
    });
    revalidatePath(`/studio/book/${row.projectId}/matter`);
    return { ok: true, content };
  }

  const ctx = await buildBookContext(row.projectId);

  try {
    const { text: content, config } = await completeWithFallback(
      matterMessages(ctx, byline, section.title, section.directive),
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
