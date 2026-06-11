-- Optional fallback AI provider (used when the primary is rate-limited/unavailable).
ALTER TABLE "Settings" ADD COLUMN "fallbackProvider" TEXT NOT NULL DEFAULT 'groq';
ALTER TABLE "Settings" ADD COLUMN "fallbackModel" TEXT NOT NULL DEFAULT 'llama-3.1-8b-instant';
ALTER TABLE "Settings" ADD COLUMN "fallbackApiKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Settings" ADD COLUMN "fallbackBaseUrl" TEXT NOT NULL DEFAULT '';
