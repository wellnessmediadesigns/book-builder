-- Newsletters: a Project can be a book or a newsletter brand/publication, and a
-- brainstorm session can target either.
ALTER TABLE "Project" ADD COLUMN "workType" TEXT NOT NULL DEFAULT 'book';
ALTER TABLE "BrainstormSession" ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'book';
