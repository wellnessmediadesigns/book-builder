-- Topics the author removed from a brainstorm Direction: never re-add them and
-- exclude them from the built book/newsletter.
ALTER TABLE "BrainstormSession" ADD COLUMN "dismissedJson" TEXT NOT NULL DEFAULT '[]';
