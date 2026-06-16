import { getAuthor } from "@/lib/db";
import { TopNav } from "@/components/studio/top-nav";
import { BrainstormHome } from "@/components/studio/brainstorm-home";

export const dynamic = "force-dynamic";

export default async function SocialBrainstormPage() {
  const author = await getAuthor();
  return (
    <>
      <TopNav author={author.name} email={author.email ?? ""} />
      <BrainstormHome mode="social" />
    </>
  );
}
