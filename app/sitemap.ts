import type { MetadataRoute } from "next";
import { listPublicProjects } from "@/lib/projects";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://wybitnastrona.pl";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/pricing",
    "/legal/privacy",
    "/legal/terms",
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const publicProjects = await listPublicProjects(100);
  const projectRoutes: MetadataRoute.Sitemap = publicProjects
    .filter((p) => p.slug)
    .map((p) => ({
      url: `${baseUrl}/p/${p.slug}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));

  return [...staticRoutes, ...projectRoutes];
}
