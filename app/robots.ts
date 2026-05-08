import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://wybitnastrona.pl";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/p/", "/pricing", "/legal/"],
        disallow: ["/api/", "/dashboard", "/project/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
