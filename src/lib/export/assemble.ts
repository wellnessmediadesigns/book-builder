import { prisma, getAuthor } from "@/lib/db";
import { makePackage, type BookPackage, type MatterSectionOut } from "./manuscript";
import { matterOrder, sectionByMatterType, isPreTocFront, isListedInToc } from "@/lib/matter";

/** Builds the normalized BookPackage (front matter + chapters + back matter). */
export async function assembleBookPackage(projectId: string): Promise<{
  pkg: BookPackage;
  theme: string;
  title: string;
} | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { chapters: { orderBy: { order: "asc" } } },
  });
  if (!project) return null;
  const author = await getAuthor();

  const bodyChapters = project.chapters
    .filter((c) => c.matterType === null)
    .map((c) => ({ title: c.title, contentJson: c.contentJson }));

  const matterOut = (group: "front" | "back"): MatterSectionOut[] =>
    project.chapters
      .filter((c) => c.matterType?.startsWith(`${group}:`) && c.contentText.trim())
      .sort((a, b) => matterOrder(a.matterType!) - matterOrder(b.matterType!))
      .map((c) => {
        const key = sectionByMatterType(c.matterType!)?.key ?? c.matterType!;
        return {
          key,
          title: c.title,
          text: c.contentText,
          preToc: isPreTocFront(group, key),
          inToc: isListedInToc(group, key),
        };
      });

  const pkg = makePackage(
    {
      recommendedTitle: project.recommendedTitle,
      title: project.title,
      subtitle: project.subtitle,
      authorName: author.name,
      positioning: project.positioning,
    },
    matterOut("front"),
    bodyChapters,
    matterOut("back"),
  );

  return { pkg, theme: project.formatTheme, title: project.recommendedTitle || project.title };
}

/** A one-chapter package (no front/back matter) for per-chapter export. */
export async function singleChapterPackage(
  projectId: string,
  chapterId: string,
): Promise<{ pkg: BookPackage; theme: string; title: string } | null> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;
  const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } });
  if (!chapter || chapter.projectId !== projectId) return null;
  const author = await getAuthor();

  const pkg = makePackage(
    {
      recommendedTitle: project.recommendedTitle,
      title: project.title,
      subtitle: project.subtitle,
      authorName: author.name,
      positioning: project.positioning,
    },
    [],
    [{ title: chapter.title, contentJson: chapter.contentJson }],
    [],
  );
  return { pkg, theme: project.formatTheme, title: chapter.title || "chapter" };
}
