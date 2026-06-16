import { getAuthor } from "@/lib/db";
import { TopNav } from "@/components/studio/top-nav";
import { SocialComposer } from "@/components/studio/social-composer";
import { listBrandOptions } from "@/lib/actions/social";
import { aiStatus } from "@/lib/actions/ai";

export const dynamic = "force-dynamic";

export default async function NewSocialPostPage() {
  const author = await getAuthor();
  const [{ ready }, brands] = await Promise.all([aiStatus(), listBrandOptions()]);
  return (
    <>
      <TopNav author={author.name} email={author.email ?? ""} />
      <SocialComposer aiReady={ready} brands={brands} />
    </>
  );
}
