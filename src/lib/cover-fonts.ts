/** Curated, commercially-licensable (OFL/Apache) fonts for the cover editor.
 *  Loaded from Google Fonts on the editor route; referenced by stable family
 *  name so the <canvas> export renders them faithfully. */

export type CoverFont = {
  family: string;
  label: string;
  category: "serif" | "sans" | "script";
  weights: number[];
  italic?: boolean;
};

export const COVER_FONTS: CoverFont[] = [
  // Serif / display — the backbone of premium book covers
  { family: "Playfair Display", label: "Playfair Display", category: "serif", weights: [400, 700, 900], italic: true },
  { family: "Cormorant Garamond", label: "Cormorant Garamond", category: "serif", weights: [400, 600, 700], italic: true },
  { family: "EB Garamond", label: "EB Garamond", category: "serif", weights: [400, 600, 800], italic: true },
  { family: "Cinzel", label: "Cinzel", category: "serif", weights: [400, 700, 900] },
  { family: "DM Serif Display", label: "DM Serif Display", category: "serif", weights: [400], italic: true },
  { family: "Marcellus", label: "Marcellus", category: "serif", weights: [400] },
  { family: "Libre Baskerville", label: "Libre Baskerville", category: "serif", weights: [400, 700], italic: true },
  { family: "Spectral", label: "Spectral", category: "serif", weights: [400, 600, 800], italic: true },
  { family: "Cardo", label: "Cardo", category: "serif", weights: [400, 700], italic: true },
  { family: "Crimson Pro", label: "Crimson Pro", category: "serif", weights: [400, 600, 800], italic: true },
  { family: "Fraunces", label: "Fraunces", category: "serif", weights: [400, 600, 900], italic: true },
  // Sans — modern, clean
  { family: "Montserrat", label: "Montserrat", category: "sans", weights: [400, 600, 800], italic: true },
  { family: "Jost", label: "Jost", category: "sans", weights: [400, 600, 700], italic: true },
  { family: "Archivo", label: "Archivo", category: "sans", weights: [400, 600, 800], italic: true },
  { family: "Oswald", label: "Oswald", category: "sans", weights: [400, 600, 700] },
  { family: "Bebas Neue", label: "Bebas Neue", category: "sans", weights: [400] },
  { family: "Josefin Sans", label: "Josefin Sans", category: "sans", weights: [400, 600, 700], italic: true },
  // Script / flourish — for accents
  { family: "Great Vibes", label: "Great Vibes", category: "script", weights: [400] },
  { family: "Tangerine", label: "Tangerine", category: "script", weights: [400, 700] },
  { family: "Pinyon Script", label: "Pinyon Script", category: "script", weights: [400] },
];

export const COVER_FONT_FAMILIES = COVER_FONTS.map((f) => f.family);

export function coverFont(family: string): CoverFont | undefined {
  return COVER_FONTS.find((f) => f.family === family);
}

/** A Google Fonts CSS2 URL covering every curated family + its weights/italics. */
export function googleFontsHref(): string {
  const specs = COVER_FONTS.map((f) => {
    const name = f.family.replace(/ /g, "+");
    if (f.italic) {
      const axes = f.weights.flatMap((w) => [`0,${w}`, `1,${w}`]).sort().join(";");
      return `family=${name}:ital,wght@${axes}`;
    }
    return `family=${name}:wght@${f.weights.join(";")}`;
  });
  return `https://fonts.googleapis.com/css2?${specs.join("&")}&display=swap`;
}
