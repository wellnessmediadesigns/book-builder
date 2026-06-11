import { cn } from "@/lib/utils";

/**
 * Quire mark — two folded leaves of a quire that together read as a "Q",
 * the inner stroke tapering like a quill nib. Drawn with currentColor so it
 * inherits brass/muse/ink as needed.
 */
export function QuireMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("h-7 w-7", className)}
      aria-hidden="true"
    >
      {/* outer folded leaf */}
      <path
        d="M16 3.5C9.1 3.5 3.5 9.1 3.5 16S9.1 28.5 16 28.5c2.2 0 4.27-.57 6.06-1.57"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* quill tail of the Q */}
      <path
        d="M19.5 19.5 27 27"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* inner page fold — the second leaf, suggesting an open quire */}
      <path
        d="M16 9.5c-3.6 0-6.5 2.9-6.5 6.5 0 1.9.8 3.6 2.1 4.8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.45"
      />
      <circle cx="16" cy="16" r="1.6" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

export function QuireLogo({
  className,
  showMark = true,
  size = "md",
}: {
  className?: string;
  showMark?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const text = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  }[size];
  const mark = {
    sm: "h-5 w-5",
    md: "h-7 w-7",
    lg: "h-9 w-9",
  }[size];
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {showMark && <QuireMark className={cn(mark, "text-brass")} />}
      <span
        className={cn(
          "font-display font-semibold tracking-tight text-ink",
          text,
        )}
      >
        Quire
      </span>
    </span>
  );
}
