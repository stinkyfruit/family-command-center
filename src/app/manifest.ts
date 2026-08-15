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
  };
}
