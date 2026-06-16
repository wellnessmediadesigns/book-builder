import { notFound } from "next/navigation";
import { prisma, getAuthor } from "@/lib/db";
import { TopNav } from "@/components/studio/top-nav";
import { SocialPostDetail } from "@/components/studio/social-post-detail";
import { PLATFORM_MAP } from "@/lib/social";

export const dynamic = "force-dynamic";

export default async function SocialPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const author = await getAuthor();
  const post = await prisma.socialPost.findUnique({
    where: { id },
    include: { variants: true },
  });
  if (!post || post.authorId !== author.id || post.deletedAt) notFound();

  let brandName: string | null = null;
  if (post.brandId) {
    const brand = await prisma.project.findUnique({ where: { id: post.brandId }, select: { title: true, recommendedTitle: true } });
    brandName = brand ? brand.recommendedTitle || brand.title : null;
  }

  // Order variants by the platform list order.
  const order = Object.keys(PLATFORM_MAP);
  const variants = [...post.variants]
    .sort((a, b) => order.indexOf(a.platform) - order.indexOf(b.platform))
    .map((v) => ({ id: v.id, platform: v.platform, content: v.content }));

  return (
    <>
      <TopNav author={author.name} email={author.email ?? ""} />
      <SocialPostDetail
        post={{ id: post.id, title: post.title || post.topic, idea: post.idea, brandName }}
        variants={variants}
      />
    </>
  );
}
