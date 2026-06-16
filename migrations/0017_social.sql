-- Social posts: one idea generated into a platform-tailored variant.
CREATE TABLE "SocialPost" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "authorId" TEXT NOT NULL,
  "brandId" TEXT,
  "sourceSessionId" TEXT,
  "title" TEXT NOT NULL DEFAULT '',
  "topic" TEXT NOT NULL DEFAULT '',
  "keywords" TEXT NOT NULL DEFAULT '',
  "idea" TEXT NOT NULL DEFAULT '',
  "platformsJson" TEXT NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "deletedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "SocialPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SocialPost_authorId_updatedAt_idx" ON "SocialPost" ("authorId", "updatedAt");

CREATE TABLE "SocialVariant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "postId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "content" TEXT NOT NULL DEFAULT '',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "SocialVariant_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SocialVariant_postId_idx" ON "SocialVariant" ("postId");
