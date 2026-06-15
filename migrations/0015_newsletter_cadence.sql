-- Newsletter publishing cadence (weekly | biweekly | monthly | …). Empty for books.
ALTER TABLE "Project" ADD COLUMN "cadence" TEXT NOT NULL DEFAULT '';
