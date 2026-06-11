-- Series support: books sharing a series keep a consistent voice.
ALTER TABLE "Project" ADD COLUMN "seriesName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Project" ADD COLUMN "styleNotes" TEXT NOT NULL DEFAULT '';
