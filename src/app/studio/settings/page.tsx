import { getAuthor } from "@/lib/db";
import { TopNav } from "@/components/studio/top-nav";
import { SettingsView } from "@/components/studio/settings-view";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const author = await getAuthor();
  const s = author.settings!;
  return (
    <>
      <TopNav author={author.name} />
      <SettingsView
        authorName={author.name}
        initial={{
          provider: s.provider,
          model: s.model,
          apiKey: s.apiKey,
          baseUrl: s.baseUrl,
          temperature: s.temperature,
          maxContext: s.maxContext,
        }}
      />
    </>
  );
}
