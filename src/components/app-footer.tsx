import { APP_VERSION } from "@/lib/version";

/**
 * A quiet, corner-anchored build tag — not app chrome. Low z-index and
 * pointer-events-none so it never competes with real UI: on pages with their
 * own fixed bottom bar (Writer, Brainstorm, Notes) it simply sits underneath.
 */
export function AppFooter() {
  return (
    <div className="pointer-events-none fixed bottom-1 right-2 z-0 select-none text-[10px] text-muted/50">
      © {new Date().getFullYear()} Wellness Media Designs · v{APP_VERSION}
    </div>
  );
}
