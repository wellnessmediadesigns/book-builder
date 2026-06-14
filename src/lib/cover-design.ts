/** Shared types + helpers for cover designs (text layers over a base image). */

export type LayerKind = "title" | "subtitle" | "author" | "backcopy" | "spine" | "custom";

export type TextLayer = {
  id: string;
  kind: LayerKind;
  text: string;
  x: number; // top-left, in native base-image pixels
  y: number;
  width: number; // wrap width in native px
  fontFamily: string;
  fontSize: number; // native px
  color: string; // hex
  weight: number; // 400 | 600 | 700 | 800 | 900
  italic: boolean;
  align: "left" | "center" | "right";
  lineHeight: number; // multiplier
  letterSpacing: number; // native px
  rotation: number; // degrees
  opacity: number; // 0..1
  shadow?: { color: string; blur: number; dx: number; dy: number } | null;
  stroke?: { color: string; width: number } | null;
};

export const COVER_PALETTE = [
  "#FBF9F4", "#FFFFFF", "#1B1E2B", "#000000",
  "#B5894F", "#8C6536", "#C9A227", "#E8D8A6",
  "#6B5CC4", "#5E8B72", "#C0584B", "#7C2D2D",
  "#1F3A5F", "#0E3B43", "#2E2A26", "#9AA0A6",
];

export const PRESET_LABEL: Record<LayerKind, string> = {
  title: "Title",
  subtitle: "Subtitle",
  author: "Author",
  backcopy: "Back copy",
  spine: "Spine",
  custom: "Text",
};

let counter = 0;
function lid() {
  counter += 1;
  return `l${Date.now().toString(36)}${counter}`;
}

/** A sensibly-styled new layer for a preset, sized relative to the canvas. */
export function presetLayer(kind: LayerKind, w: number, h: number): TextLayer {
  const base: TextLayer = {
    id: lid(),
    kind,
    text: PRESET_LABEL[kind],
    x: Math.round(w * 0.1),
    y: Math.round(h * 0.12),
    width: Math.round(w * 0.8),
    fontFamily: "Playfair Display",
    fontSize: Math.round(h * 0.07),
    color: "#FBF9F4",
    weight: 700,
    italic: false,
    align: "center",
    lineHeight: 1.15,
    letterSpacing: 0,
    rotation: 0,
    opacity: 1,
    shadow: { color: "#000000", blur: Math.round(h * 0.01), dx: 0, dy: Math.round(h * 0.003) },
    stroke: null,
  };
  switch (kind) {
    case "title":
      return { ...base, text: "Your Title", fontSize: Math.round(h * 0.085), y: Math.round(h * 0.14) };
    case "subtitle":
      return { ...base, text: "A compelling subtitle", fontFamily: "Cormorant Garamond", italic: true, weight: 600, fontSize: Math.round(h * 0.04), y: Math.round(h * 0.3) };
    case "author":
      return { ...base, text: "AUTHOR NAME", fontFamily: "Montserrat", weight: 600, fontSize: Math.round(h * 0.035), letterSpacing: Math.round(h * 0.004), y: Math.round(h * 0.86) };
    case "backcopy":
      return { ...base, text: "Back-cover copy goes here. Describe the book in a few enticing sentences.", fontFamily: "EB Garamond", weight: 400, fontSize: Math.round(h * 0.028), align: "left", lineHeight: 1.4, color: "#1B1E2B", shadow: null, x: Math.round(w * 0.06), y: Math.round(h * 0.2), width: Math.round(w * 0.3) };
    case "spine":
      return { ...base, text: "TITLE · AUTHOR", fontFamily: "Cinzel", weight: 700, fontSize: Math.round(h * 0.03), rotation: 90, align: "center", x: Math.round(w * 0.47), y: Math.round(h * 0.4), width: Math.round(h * 0.6), shadow: null };
    default:
      return { ...base, text: "Text" };
  }
}

export function parseLayers(json: string | null | undefined): TextLayer[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? (arr as TextLayer[]) : [];
  } catch {
    return [];
  }
}
