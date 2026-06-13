-- Soft-delete (Trash) for projects: restorable instead of gone forever.
ALTER TABLE "Project" ADD COLUMN "deletedAt" DATETIME;
