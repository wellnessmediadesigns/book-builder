import Link from "next/link";
import { ChevronLeft, Trash2 } from "lucide-react";
import { getAuthor } from "@/lib/db";
import { TopNav } from "@/components/studio/top-nav";
import { TrashList } from "@/components/studio/trash-list";
import { Badge } from "@/components/ui/primitives";
import { listTrashed } from "@/lib/actions/projects";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const author = await getAuthor();
  const items = await listTrashed();

  return (
    <>
      <TopNav author={author.name} email={author.email ?? ""} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/studio"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" /> Library
        </Link>
        <div className="mb-6">
          <Badge tone="neutral">
            <Trash2 className="h-3 w-3" /> Trash
          </Badge>
          <h1 className="mt-3 font-display text-display-md font-semibold text-ink">Trash</h1>
          <p className="mt-2 text-ink-soft">
            Deleted books are kept here so you can bring them back. Delete forever to remove them
            permanently.
          </p>
        </div>
        <TrashList items={items} />
      </main>
    </>
  );
}
