import type { MetadataRoute } from "next";

// The home page is public. Project pages only make sense in the browser that built them.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/build/", "/portfolio/"] }] };
}
