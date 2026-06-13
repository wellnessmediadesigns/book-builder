/** Tasteful, brand-colored celebration burst. Client-only; respects reduced motion. */
export async function celebrate(kind: "goal" | "book" = "goal") {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const { default: confetti } = await import("canvas-confetti");
  const colors = ["#B5894F", "#6B5CC4", "#5E8B72", "#FBF9F4"];

  if (kind === "book") {
    const end = Date.now() + 1400;
    (function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
    return;
  }
  confetti({ particleCount: 90, spread: 75, startVelocity: 38, origin: { y: 0.7 }, colors, scalar: 0.9 });
}

/** Fires a celebration at most once per local day, keyed by `tag`. */
export function celebrateOncePerDay(tag: string, kind: "goal" | "book" = "goal") {
  if (typeof window === "undefined") return;
  const today = new Date().toISOString().slice(0, 10);
  const key = `quire-celebrated-${tag}-${today}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
  } catch {
    /* private mode — celebrate anyway */
  }
  celebrate(kind);
}
