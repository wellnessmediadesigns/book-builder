/** Shared (non-server) social platform definitions — drive the composer + prompt. */

export type PlatformKey =
  | "x"
  | "facebook"
  | "threads"
  | "instagram"
  | "tiktok"
  | "linkedin"
  | "lemon8"
  | "bluesky"
  | "pinterest"
  | "youtube"
  | "reddit";

export type Platform = {
  key: PlatformKey;
  label: string;
  /** soft character target the model should respect; also shown in the UI */
  charLimit: number;
  /** suggested hashtag count */
  hashtags: number;
  /** style guidance injected into the generation prompt */
  guidance: string;
};

export const PLATFORMS: Platform[] = [
  { key: "x", label: "X", charLimit: 280, hashtags: 1, guidance: "Punchy and conversational. A scroll-stopping first line, then 1–3 short lines. Stay under ~280 characters. At most one or two hashtags." },
  { key: "facebook", label: "Facebook", charLimit: 2000, hashtags: 0, guidance: "Friendly and a little longer — a short story or build-up is fine. 1–3 short paragraphs, end with a question or clear CTA. Minimal or no hashtags." },
  { key: "threads", label: "Threads", charLimit: 500, hashtags: 0, guidance: "Casual and authentic, like a relaxed X post but a touch longer. Conversational voice, few or no hashtags." },
  { key: "instagram", label: "Instagram", charLimit: 2200, hashtags: 6, guidance: "Warm caption. Hook on the first line, then the value with line breaks for skimmability, then a clear CTA. End with 4–8 relevant hashtags." },
  { key: "tiktok", label: "TikTok", charLimit: 2200, hashtags: 4, guidance: "Hook-driven caption with a short, energetic, trend-aware voice. 2–4 relevant hashtags." },
  { key: "linkedin", label: "LinkedIn", charLimit: 3000, hashtags: 3, guidance: "Professional but human. A strong first line, short paragraphs, one concrete takeaway. No fluff or buzzwords. 0–3 hashtags." },
  { key: "lemon8", label: "Lemon8", charLimit: 1000, hashtags: 5, guidance: "Aesthetic, lifestyle, tips-forward. Friendly tone, a clear structure (e.g. numbered tips), and a few relevant hashtags." },
  { key: "bluesky", label: "Bluesky", charLimit: 300, hashtags: 0, guidance: "Casual and conversational, like early Twitter. Concise, genuine, minimal hashtags. Under ~300 characters." },
  { key: "pinterest", label: "Pinterest", charLimit: 500, hashtags: 3, guidance: "Keyword-rich and helpful. Lead with the benefit, be descriptive and searchable, and end with a CTA to save or click." },
  { key: "youtube", label: "YouTube", charLimit: 1500, hashtags: 3, guidance: "Community-post style — friendly and engaging, invites interaction (a question or poll-like prompt). Concise." },
  { key: "reddit", label: "Reddit", charLimit: 4000, hashtags: 0, guidance: "Authentic and conversational with zero marketing-speak. Genuinely helpful, matches the norms of a niche community. No hashtags." },
];

export const PLATFORM_MAP: Record<string, Platform> = Object.fromEntries(
  PLATFORMS.map((p) => [p.key, p]),
);

/** Default platforms for a brainstorm-built post. */
export const DEFAULT_PLATFORMS: PlatformKey[] = ["x", "instagram", "linkedin"];

export function platformLabel(key: string): string {
  return PLATFORM_MAP[key]?.label ?? key;
}
