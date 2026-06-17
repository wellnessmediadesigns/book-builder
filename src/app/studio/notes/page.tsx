import { getAuthor } from "@/lib/db";
import { TopNav } from "@/components/studio/top-nav";
import { NotesWorkspace } from "@/components/studio/notes-workspace";
import { listTree } from "@/lib/actions/notebook";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const author = await getAuthor();
  const tree = await listTree();
  return (
    <>
      <TopNav author={author.name} email={author.email ?? ""} />
      <NotesWorkspace initial={tree} />
    </>
  );
}
