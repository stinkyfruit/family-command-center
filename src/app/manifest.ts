import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Family Command Center",
    short_name: "Family Home",
    description: "A bright, shared family command center.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f7ff",
    theme_color: "#7c3aed",
    icons: [
      { src: "/icon.svg?v=2", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon?v=2", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
