import { getAuthor } from "@/lib/db";
import { TopNav } from "@/components/studio/top-nav";
import { NewsletterSetup } from "@/components/studio/newsletter-setup";
import { aiStatus } from "@/lib/actions/ai";

export const dynamic = "force-dynamic";

export default async function NewNewsletterPage() {
  const author = await getAuthor();
  const { ready } = await aiStatus();
  return (
    <>
      <TopNav author={author.name} email={author.email ?? ""} />
      <NewsletterSetup aiReady={ready} />
    </>
  );
}
