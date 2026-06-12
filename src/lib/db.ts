import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";

/**
 * Dual-mode persistence:
 *  - On Cloudflare (deployed Worker, `wrangler dev`, or `next dev` with the
 *    OpenNext dev bridge) queries go to the D1 binding `DB` via the Prisma D1
 *    adapter. Clients are cached per binding so a request always talks to one
 *    client (keeps `$transaction([...])` batches coherent).
 *  - In plain Node (local `next dev`/`next start` without wrangler) we fall
 *    back to the classic SQLite client using DATABASE_URL.
 */

const globalForPrisma = globalThis as unknown as {
  prismaNode: PrismaClient | undefined;
};

const d1Clients = new WeakMap<D1Database, PrismaClient>();

function getD1(): D1Database | null {
  try {
    const env = getCloudflareContext().env as Record<string, unknown>;
    return (env.DB as D1Database) ?? null;
  } catch {
    return null;
  }
}

function getDb(): PrismaClient {
  const d1 = getD1();
  if (d1) {
    let client = d1Clients.get(d1);
    if (!client) {
      client = new PrismaClient({ adapter: new PrismaD1(d1) });
      d1Clients.set(d1, client);
    }
    return client;
  }
  if (!globalForPrisma.prismaNode) {
    globalForPrisma.prismaNode = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }
  return globalForPrisma.prismaNode;
}

/**
 * Request-aware facade: resolves the correct client at call time, so module-level
 * `prisma.x` usage works in both runtimes without per-call plumbing.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb() as unknown as Record<string | symbol, unknown>;
    const value = client[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
});

// New accounts default to Cloudflare primary (free, no key) + Cerebras fallback
// (free, generous). Set explicitly so it doesn't depend on the DB column default.
const SETTINGS_DEFAULTS = {
  fallbackProvider: "cerebras",
  fallbackModel: "gpt-oss-120b",
};

/** Returns the single local author (single-profile app behind the password gate). */
export async function getAuthor() {
  let author = await prisma.author.findFirst({ include: { settings: true } });
  if (!author) {
    author = await prisma.author.create({
      data: {
        name: "Author",
        settings: { create: { ...SETTINGS_DEFAULTS } },
      },
      include: { settings: true },
    });
  }
  if (!author.settings) {
    await prisma.settings.create({ data: { authorId: author.id, ...SETTINGS_DEFAULTS } });
    author = await prisma.author.findFirstOrThrow({ include: { settings: true } });
  }
  return author;
}
