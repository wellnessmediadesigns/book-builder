-- Per-issue newsletter metadata on Chapter (unused for books).
ALTER TABLE "Chapter" ADD COLUMN "subjectLine" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Chapter" ADD COLUMN "publishDate" DATETIME;
