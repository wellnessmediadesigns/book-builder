-- Per-book byline / pen name. Blank = use the account author name.
ALTER TABLE "Project" ADD COLUMN "authorName" TEXT NOT NULL DEFAULT '';
