import { Palette } from "lucide-react";
import { getAuthor } from "@/lib/db";
import { TopNav } from "@/components/studio/top-nav";
import { CoverStudio } from "@/components/studio/cover-studio";
import { Badge } from "@/components/ui/primitives";
import { listTemplates, listDesigns } from "@/lib/actions/cover-studio";

export const dynamic = "force-dynamic";

export default async function CoverStudioPage() {
  const author = await getAuthor();
  const [templates, designs] = await Promise.all([listTemplates(), listDesigns()]);

  return (
    <>
      <TopNav author={author.name} email={author.email ?? ""} />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <Badge tone="brass">
            <Palette className="h-3 w-3" /> Cover Studio
          </Badge>
          <h1 className="mt-3 font-display text-display-md font-semibold text-ink">Design your covers</h1>
          <p className="mt-2 max-w-xl text-ink-soft">
            Keep a library of reusable cover templates, add stylized title, author, spine, and
            back-cover text with premium fonts, then assign the result to any book.
          </p>
        </div>
        <CoverStudio templates={templates} designs={designs} />
      </main>
    </>
  );
}
