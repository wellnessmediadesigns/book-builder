"use client";

import { useEffect, useRef } from "react";

/**
 * Pins a full-screen app surface (like the brainstorm board) to the visual
 * viewport so the page never scrolls — the header/composer stay put and only
 * inner regions scroll. Tracks `visualViewport` so it also shrinks/realigns
 * when the mobile keyboard opens (keeping the composer above it).
 */
export function MobileChatShell({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const vv = typeof window !== "undefined" ? window.visualViewport : null;

    const apply = () => {
      const h = vv ? vv.height : window.innerHeight;
      const top = vv ? vv.offsetTop : 0;
      el.style.height = `${h}px`;
      el.style.transform = top ? `translateY(${top}px)` : "";
    };
    apply();

    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);

    // Belt-and-suspenders: stop the page behind from scrolling at all.
    const html = document.documentElement;
    const prevHtml = html.style.overflow;
    const prevBody = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      html.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  return (
    <div ref={ref} className="fixed inset-x-0 top-0 z-20 flex flex-col overflow-hidden bg-paper">
      {children}
    </div>
  );
}
