/**
 * Cover-file storage — Cloudflare R2 with a local-dev fallback.
 *
 * On Cloudflare (deployed Worker / `wrangler dev`) files live in the R2 bucket
 * bound as `COVERS`, accessed via `getCloudflareContext().env` exactly like the
 * D1 and AI bindings (see src/lib/db.ts, src/lib/ai/workersai.ts).
 *
 * In plain `next dev` (no binding) we fall back to the local filesystem under
 * `./.uploads/<key>` so uploads work while developing. That path is lazily
 * imported and never runs on Workers, where the binding is always present.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { R2Bucket } from "@cloudflare/workers-types";

export type StoredCover = { body: Uint8Array; contentType: string };

function getBucket(): R2Bucket | null {
  try {
    const env = getCloudflareContext().env as Record<string, unknown>;
    return (env.COVERS as R2Bucket) ?? null;
  } catch {
    return null;
  }
}

/** Whether durable R2 storage is available (false in plain local dev). */
export function coverStorageAvailable(): boolean {
  return getBucket() !== null;
}

// ————————————————————————————————————————————— local-dev filesystem fallback

const LOCAL_DIR = ".uploads";

async function localPath(key: string): Promise<string> {
  const path = await import("node:path");
  return path.join(process.cwd(), LOCAL_DIR, key);
}

async function localPut(key: string, body: Uint8Array, contentType: string): Promise<void> {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const file = await localPath(key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, body);
  await fs.writeFile(`${file}.type`, contentType, "utf8");
}

async function localGet(key: string): Promise<StoredCover | null> {
  try {
    const fs = await import("node:fs/promises");
    const file = await localPath(key);
    const body = await fs.readFile(file);
    let contentType = "application/octet-stream";
    try {
      contentType = (await fs.readFile(`${file}.type`, "utf8")).trim() || contentType;
    } catch {
      /* no sidecar type */
    }
    return { body: new Uint8Array(body), contentType };
  } catch {
    return null;
  }
}

async function localDelete(key: string): Promise<void> {
  try {
    const fs = await import("node:fs/promises");
    const file = await localPath(key);
    await fs.rm(file, { force: true });
    await fs.rm(`${file}.type`, { force: true });
  } catch {
    /* already gone */
  }
}

// ————————————————————————————————————————————— public API (R2 → fallback)

export async function putCover(key: string, body: Uint8Array, contentType: string): Promise<void> {
  const bucket = getBucket();
  if (bucket) {
    await bucket.put(key, body, { httpMetadata: { contentType } });
    return;
  }
  await localPut(key, body, contentType);
}

export async function getCover(key: string): Promise<StoredCover | null> {
  const bucket = getBucket();
  if (bucket) {
    const obj = await bucket.get(key);
    if (!obj) return null;
    const body = new Uint8Array(await obj.arrayBuffer());
    return { body, contentType: obj.httpMetadata?.contentType ?? "application/octet-stream" };
  }
  return localGet(key);
}

export async function deleteCover(key: string): Promise<void> {
  const bucket = getBucket();
  if (bucket) {
    await bucket.delete(key);
    return;
  }
  await localDelete(key);
}

/** Canonical object key for a project's cover slot. */
export function coverKey(projectId: string, type: string): string {
  return `covers/${projectId}/${type}`;
}
