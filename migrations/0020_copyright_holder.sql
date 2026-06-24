-- Copyright holder controls. A book's copyright page resolves as:
--   per-book copyrightHolder → global publisherName (imprint/media brand) → byline.
ALTER TABLE "Project" ADD COLUMN "copyrightHolder" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Settings" ADD COLUMN "publisherName" TEXT NOT NULL DEFAULT '';
