import { getAuthor } from "@/lib/db";
import { TopNav } from "@/components/studio/top-nav";
import { BrandSetup } from "@/components/studio/brand-setup";
import { aiStatus } from "@/lib/actions/ai";

export const dynamic = "force-dynamic";

export default async function NewBrandPage() {
  const author = await getAuthor();
  const { ready } = await aiStatus();
  return (
    <>
      <TopNav author={author.name} email={author.email ?? ""} />
      <BrandSetup aiReady={ready} />
    </>
  );
}
