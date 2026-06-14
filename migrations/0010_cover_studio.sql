-- Cover Studio: reusable cover templates + saved text-layer designs.
CREATE TABLE "CoverTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Template',
    "r2Key" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'image/png',
    "width" INTEGER NOT NULL DEFAULT 0,
    "height" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoverTemplate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "CoverDesign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Untitled cover',
    "templateId" TEXT,
    "baseR2Key" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'image/png',
    "width" INTEGER NOT NULL DEFAULT 0,
    "height" INTEGER NOT NULL DEFAULT 0,
    "layersJson" TEXT NOT NULL DEFAULT '[]',
    "exportR2Key" TEXT,
    "thumbR2Key" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoverDesign_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "CoverTemplate_authorId_idx" ON "CoverTemplate"("authorId");
CREATE INDEX "CoverDesign_authorId_updatedAt_idx" ON "CoverDesign"("authorId", "updatedAt");
