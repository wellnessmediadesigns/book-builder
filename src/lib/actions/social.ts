"use server";

import { prisma, getAuthor } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { completeWithFallback, aiChainReady, buildBookContext } from "@/lib/ai/context";
import { AiError } from "@/lib/ai/providers";
import { socialPostMessages } from "@/lib/ai/prompts";
import { PLATFORM_MAP, DEFAULT_PLATFORMS, type PlatformKey } from "@/lib/social";
import { parseDirection } from "@/lib/brainstorm";

function parsePlatforms(json: string): string[] {
  try {
    const a = JSON.parse(json);
    return Array.isArray(a) ? a.map((x) => String(x)).filter((k) => PLATFORM_MAP[k]) : [];
  } catch {
    return [];
  }
}

/** Brand voice context (or null) for on-brand generation. */
async function brandContext(brandId: string | null | undefined) {
  if (!brandId) return null;
  try {
    const ctx = await buildBookContext(brandId);
    return ctx.workType === "brand" ? ctx : null;
  } catch {
    return null;
  }
}

async function writeVariant(
  brandCtx: Awaited<ReturnType<typeof brandContext>>,
  platform: string,
  post: { topic: string; keywords: string; idea: string },
): Promise<string> {
  const spec = PLATFORM_MAP[platform];
  const { text } = await completeWithFallback(
    socialPostMessages(brandCtx, {
      platformLabel: spec.label,
      guidance: spec.guidance,
      charLimit: spec.charLimit,
      hashtags: spec.hashtags,
      topic: post.topic,
      keywords: post.keywords,
      idea: post.idea,
    }),
  );
  return text.trim();
}

export type SocialPostBrief = {
  id: string;
  title: string;
  idea: string;
  topic: string;
  platforms: string[];
  brandName: string | null;
  status: string;
  updatedAt: string;
};

export async function listPosts(): Promise<SocialPostBrief[]> {
  const author = await getAuthor();
  const rows = await prisma.socialPost.findMany({
    where: { authorId: author.id, deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });
  // Resolve brand names in one query.
  const brandIds = Array.from(new Set(rows.map((r) => r.brandId).filter(Boolean))) as string[];
  const brands = brandIds.length
    ? await prisma.project.findMany({ where: { id: { in: brandIds } }, select: { id: true, title: true, recommendedTitle: true } })
    : [];
  const brandName = new Map(brands.map((b) => [b.id, b.recommendedTitle || b.title]));
  return rows.map((r) => ({
    id: r.id,
    title: r.title || r.topic || r.idea.slice(0, 60) || "Untitled post",
    idea: r.idea,
    topic: r.topic,
    platforms: parsePlatforms(r.platformsJson),
    brandName: r.brandId ? brandName.get(r.brandId) ?? null : null,
    status: r.status,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

/** Brand options for the composer's brand picker. */
export async function listBrandOptions(): Promise<{ id: string; name: string }[]> {
  const author = await getAuthor();
  const rows = await prisma.project.findMany({
    where: { authorId: author.id, deletedAt: null, workType: "brand" },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, recommendedTitle: true },
  });
  return rows.map((b) => ({ id: b.id, name: b.recommendedTitle || b.title }));
}

export async function createSocialPost(input: {
  topic: string;
  keywords: string;
  idea: string;
  brandId?: string | null;
  platforms: string[];
}): Promise<void> {
  const author = await getAuthor();
  const platforms = input.platforms.filter((k) => PLATFORM_MAP[k]);
  const post = await prisma.socialPost.create({
    data: {
      authorId: author.id,
      brandId: input.brandId || null,
      title: input.topic.trim().slice(0, 120),
      topic: input.topic.trim(),
      keywords: input.keywords.trim(),
      idea: input.idea.trim(),
      platformsJson: JSON.stringify(platforms.length ? platforms : DEFAULT_PLATFORMS),
      variants: {
        create: (platforms.length ? platforms : DEFAULT_PLATFORMS).map((p) => ({ platform: p })),
      },
    },
  });
  await generateVariants(post.id).catch(() => {});
  revalidatePath("/studio/social");
  redirect(`/studio/social/${post.id}`);
}

/** Fills any empty variants for a post (keeps already-written ones). */
export async function generateVariants(postId: string): Promise<{ ok: boolean; error?: string }> {
  const author = await getAuthor();
  const post = await prisma.socialPost.findUnique({ where: { id: postId }, include: { variants: true } });
  if (!post || post.authorId !== author.id) return { ok: false, error: "Post not found." };
  if (!(await aiChainReady())) return { ok: false, error: "no_key" };
  const brandCtx = await brandContext(post.brandId);
  const empties = post.variants.filter((v) => !v.content.trim());
  for (const v of empties) {
    try {
      const text = await writeVariant(brandCtx, v.platform, post);
      if (text) await prisma.socialVariant.update({ where: { id: v.id }, data: { content: text } });
    } catch (e) {
      if (e instanceof AiError && e.message === "no_key") return { ok: false, error: "no_key" };
      /* skip this platform, keep going */
    }
  }
  await prisma.socialPost.update({ where: { id: postId }, data: { status: "generated" } });
  revalidatePath(`/studio/social/${postId}`);
  return { ok: true };
}

export async function regenerateVariant(variantId: string): Promise<{ ok: boolean; error?: string }> {
  const author = await getAuthor();
  const variant = await prisma.socialVariant.findUnique({ where: { id: variantId }, include: { post: true } });
  if (!variant || variant.post.authorId !== author.id) return { ok: false, error: "Not found." };
  if (!(await aiChainReady())) return { ok: false, error: "no_key" };
  try {
    const brandCtx = await brandContext(variant.post.brandId);
    const text = await writeVariant(brandCtx, variant.platform, variant.post);
    if (text) await prisma.socialVariant.update({ where: { id: variantId }, data: { content: text } });
    revalidatePath(`/studio/social/${variant.postId}`);
    return { ok: true };
  } catch (e) {
    const err = e instanceof AiError ? e.message : "Generation failed.";
    return { ok: false, error: err === "no_key" ? "no_key" : err };
  }
}

export async function updateVariant(variantId: string, content: string): Promise<void> {
  const author = await getAuthor();
  const variant = await prisma.socialVariant.findUnique({ where: { id: variantId }, include: { post: { select: { authorId: true, id: true } } } });
  if (!variant || variant.post.authorId !== author.id) return;
  await prisma.socialVariant.update({ where: { id: variantId }, data: { content } });
  revalidatePath(`/studio/social/${variant.post.id}`);
}

export async function deletePost(id: string): Promise<void> {
  const author = await getAuthor();
  const post = await prisma.socialPost.findUnique({ where: { id }, select: { authorId: true } });
  if (!post || post.authorId !== author.id) return;
  await prisma.socialPost.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/studio/social");
}

export async function restorePost(id: string): Promise<void> {
  await prisma.socialPost.update({ where: { id }, data: { deletedAt: null } });
  revalidatePath("/studio/social");
  revalidatePath("/studio/social/trash");
}

export async function purgePost(id: string): Promise<void> {
  await prisma.socialPost.delete({ where: { id } });
  revalidatePath("/studio/social/trash");
}

export async function listTrashedPosts() {
  const author = await getAuthor();
  const rows = await prisma.socialPost.findMany({
    where: { authorId: author.id, deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title || r.topic || "Untitled post",
    platforms: parsePlatforms(r.platformsJson),
    deletedAt: (r.deletedAt ?? new Date()).toISOString(),
  }));
}

/** Social brainstorm build → a post from the agreed direction, default platforms, generated. */
export async function buildSocialFromBrainstorm(
  sessionId: string,
): Promise<{ ok: false; error: string } | void> {
  const author = await getAuthor();
  const session = await prisma.brainstormSession.findUnique({ where: { id: sessionId } });
  if (!session || session.authorId !== author.id) return { ok: false, error: "Session not found." };
  const direction = parseDirection(session.directionJson);
  const idea = [direction.title, ...direction.bullets.map((b) => b.text)].filter(Boolean).join(". ");

  const live = session.builtProjectId
    ? await prisma.socialPost.findFirst({ where: { id: session.builtProjectId, authorId: author.id, deletedAt: null }, select: { id: true } })
    : null;

  let postId: string;
  if (live) {
    await prisma.socialPost.update({
      where: { id: live.id },
      data: { title: (direction.title || "Untitled post").slice(0, 120), idea, topic: direction.title || "" },
    });
    postId = live.id;
  } else {
    const post = await prisma.socialPost.create({
      data: {
        authorId: author.id,
        sourceSessionId: sessionId,
        title: (direction.title || "Untitled post").slice(0, 120),
        topic: direction.title || "",
        idea,
        platformsJson: JSON.stringify(DEFAULT_PLATFORMS),
        variants: { create: DEFAULT_PLATFORMS.map((p) => ({ platform: p as PlatformKey })) },
      },
    });
    postId = post.id;
  }
  await generateVariants(postId).catch(() => {});
  await prisma.brainstormSession.update({ where: { id: sessionId }, data: { status: "built", builtProjectId: postId } });
  revalidatePath("/studio/social");
  redirect(`/studio/social/${postId}`);
}
