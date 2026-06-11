-- Adds the per-book formatting style (export/preview theme).
ALTER TABLE "Project" ADD COLUMN "formatTheme" TEXT NOT NULL DEFAULT 'classic';
