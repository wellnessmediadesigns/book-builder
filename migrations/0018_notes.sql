-- Notes: rich-text notes organized in nestable folders.
CREATE TABLE "NoteFolder" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "authorId" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'Untitled folder',
  "parentId" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "NoteFolder_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "NoteFolder_authorId_idx" ON "NoteFolder" ("authorId");

CREATE TABLE "Note" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "authorId" TEXT NOT NULL,
  "folderId" TEXT,
  "title" TEXT NOT NULL DEFAULT 'Untitled note',
  "contentJson" TEXT,
  "contentText" TEXT NOT NULL DEFAULT '',
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Note_authorId_folderId_idx" ON "Note" ("authorId", "folderId");
