import { Fraunces, Newsreader, Inter, JetBrains_Mono } from "next/font/google";

export const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

export const reading = Newsreader({
  subsets: ["latin"],
  variable: "--font-reading",
  display: "swap",
  style: ["normal", "italic"],
});

export const ui = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

export const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const fontVars = `${display.variable} ${reading.variable} ${ui.variable} ${mono.variable}`;
