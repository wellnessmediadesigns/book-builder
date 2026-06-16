import { getAuthor } from "@/lib/db";
import { TopNav } from "@/components/studio/top-nav";
import { SectionHome, type SectionWork } from "@/components/studio/section-home";
import { listBrands } from "@/lib/actions/projects";
import { listSessions } from "@/lib/actions/brainstorm";
import { getWritingStats } from "@/lib/actions/stats";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const author = await getAuthor();
  const [brands, sessions, stats] = await Promise.all([
    listBrands(),
    listSessions("brand"),
    getWritingStats(),
  ]);

  const works: SectionWork[] = brands.map((b) => ({
    id: b.id,
    title: b.title,
    recommendedTitle: b.title,
    bookType: "Brand",
    kind: "",
    status: b.status,
    coverAccent: b.coverAccent,
    updatedAt: b.updatedAt,
    chapterCount: 0,
    words: 0,
    goalWords: 0,
    audience: b.audience,
    positioning: b.positioning,
    points: b.points,
  }));

  return (
    <>
      <TopNav author={author.name} email={author.email ?? ""} />
      <SectionHome
        workType="brand"
        authorName={author.name}
        works={works}
        sessions={sessions}
        stats={stats}
        resume={null}
      />
    </>
  );
}
