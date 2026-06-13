-- Studio-level brainstorming: chat sessions, messages, and saved idea cards.
CREATE TABLE "BrainstormSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New brainstorm',
    "status" TEXT NOT NULL DEFAULT 'active',
    "builtProjectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrainstormSession_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "BrainstormMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrainstormMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BrainstormSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "IdeaCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL DEFAULT 'concept',
    "tagsJson" TEXT,
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IdeaCard_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BrainstormSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "BrainstormSession_authorId_updatedAt_idx" ON "BrainstormSession"("authorId", "updatedAt");
CREATE INDEX "BrainstormMessage_sessionId_createdAt_idx" ON "BrainstormMessage"("sessionId", "createdAt");
CREATE INDEX "IdeaCard_sessionId_order_idx" ON "IdeaCard"("sessionId", "order");
