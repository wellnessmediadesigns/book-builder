/**
 * Minimal single-user session auth, edge-safe (Web Crypto only).
 *
 * When the APP_PASSWORD secret is set, every route is gated by middleware.
 * The session cookie holds an HMAC of a fixed payload keyed by the password —
 * unforgeable without the password, stateless, survives deploys.
 * When APP_PASSWORD is unset (local dev), the gate is open.
 */

export const SESSION_COOKIE = "quire_session";
const SESSION_PAYLOAD = "quire-session-v1";

export function getAppPassword(): string {
  return process.env.APP_PASSWORD ?? "";
}

export async function sessionToken(password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(SESSION_PAYLOAD));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function isValidSession(token: string | undefined): Promise<boolean> {
  const password = getAppPassword();
  if (!password) return true; // gate disabled
  if (!token) return false;
  const expected = await sessionToken(password);
  if (token.length !== expected.length) return false;
  // constant-time compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
