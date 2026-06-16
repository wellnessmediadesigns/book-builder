import { getAuthor } from "@/lib/db";
import { TopNav } from "@/components/studio/top-nav";
import { SocialHome } from "@/components/studio/social-home";
import { listPosts } from "@/lib/actions/social";
import { listSessions } from "@/lib/actions/brainstorm";

export const dynamic = "force-dynamic";

export default async function SocialPage() {
  const author = await getAuthor();
  const [posts, sessions] = await Promise.all([listPosts(), listSessions("social")]);
  return (
    <>
      <TopNav author={author.name} email={author.email ?? ""} />
      <SocialHome authorName={author.name} posts={posts} sessions={sessions} />
    </>
  );
}
