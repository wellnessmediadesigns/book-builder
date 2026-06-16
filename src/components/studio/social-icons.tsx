import { Twitter, Facebook, Instagram, Linkedin, Youtube, Share2, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  x: Twitter,
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
  // no dedicated lucide marks — use a neutral share glyph
  threads: Share2,
  tiktok: Share2,
  lemon8: Share2,
  bluesky: Share2,
  pinterest: Share2,
  reddit: Share2,
};

export function platformIcon(platform: string): LucideIcon {
  return ICONS[platform] ?? Share2;
}
