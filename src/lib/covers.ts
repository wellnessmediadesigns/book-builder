/** Shared cover-slot definitions used by the UI, upload route, and KDP bundle. */

export type CoverType = "front" | "back" | "wrap";

export const COVER_TYPES: CoverType[] = ["front", "back", "wrap"];

export const COVER_SLOTS: { type: CoverType; label: string; blurb: string }[] = [
  { type: "front", label: "Front cover", blurb: "The face of your book — used for the ebook and listings." },
  { type: "back", label: "Back cover", blurb: "Back-cover copy, reviews, and author bio." },
  { type: "wrap", label: "Full wrap", blurb: "Back · spine · front in one piece — the print cover for KDP." },
];

export function isCoverType(v: string): v is CoverType {
  return (COVER_TYPES as string[]).includes(v);
}

/** Accepted upload formats: common web images plus PDF (KDP print covers). */
export const COVER_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export const COVER_ACCEPT = ".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf";

/** ~40MB — generous for a 300 DPI print wrap while guarding against runaways. */
export const COVER_MAX_BYTES = 40 * 1024 * 1024;

export function extForType(contentType: string): string {
  return COVER_MIME[contentType] ?? "bin";
}
