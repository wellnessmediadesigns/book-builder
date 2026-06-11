import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quire — The AI Writing Studio",
    short_name: "Quire",
    description: "From a spark to a finished book.",
    start_url: "/studio",
    display: "standalone",
    background_color: "#FBF9F4",
    theme_color: "#1B1E2B",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
