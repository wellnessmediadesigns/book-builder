/** Shared (non-server) types + helpers for brainstorm "direction". */

export type Bullet = { id: string; text: string };
export type Direction = { title: string; bullets: Bullet[] };

let seq = 0;
export function bulletId() {
  seq += 1;
  return `b${Date.now().toString(36)}${seq}`;
}

/** Parses a stored directionJson into a normalized Direction. */
export function parseDirection(json: string | null | undefined): Direction {
  if (!json) return { title: "", bullets: [] };
  try {
    const d = JSON.parse(json) as { title?: string; bullets?: unknown };
    const bullets = Array.isArray(d.bullets)
      ? d.bullets
          .map((b) =>
            typeof b === "string"
              ? { id: bulletId(), text: b }
              : { id: String((b as Bullet)?.id || bulletId()), text: String((b as Bullet)?.text ?? "") },
          )
          .filter((b) => b.text.trim())
      : [];
    return { title: String(d.title ?? ""), bullets };
  } catch {
    return { title: "", bullets: [] };
  }
}
