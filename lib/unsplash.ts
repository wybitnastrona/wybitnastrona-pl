/**
 * Unsplash API helpers.
 * Requires UNSPLASH_ACCESS_KEY environment variable.
 * Free tier: 50 requests/hour for demo apps.
 */

type UnsplashPhoto = {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string | null;
  description: string | null;
  user: {
    name: string;
    links: { html: string };
  };
  width: number;
  height: number;
};

export type FetchImageResult = {
  url: string;
  alt: string;
  credit: string;
  creditUrl: string;
};

/**
 * Fetch a random photo matching the query from Unsplash.
 * Falls back to a Picsum placeholder if the API key is missing or the request fails.
 */
export async function fetchUnsplashImage(
  query: string,
  orientation: "landscape" | "portrait" | "squarish" = "landscape",
): Promise<FetchImageResult> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    return buildPicsumFallback(query);
  }

  try {
    const params = new URLSearchParams({
      query,
      orientation,
      content_filter: "high",
    });
    const res = await fetch(
      `https://api.unsplash.com/photos/random?${params.toString()}`,
      {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
          "Accept-Version": "v1",
        },
        // Cache for 60 s on the edge
        next: { revalidate: 60 },
      } as RequestInit,
    );

    if (!res.ok) {
      return buildPicsumFallback(query);
    }

    const photo = (await res.json()) as UnsplashPhoto;
    return {
      url: `${photo.urls.regular}&w=1200&q=80`,
      alt: photo.alt_description ?? photo.description ?? query,
      credit: photo.user.name,
      creditUrl: `${photo.user.links.html}?utm_source=wybitnastrona&utm_medium=referral`,
    };
  } catch {
    return buildPicsumFallback(query);
  }
}

function buildPicsumFallback(query: string): FetchImageResult {
  // Deterministic seed from query string for stable images
  const seed = Math.abs(
    Array.from(query).reduce((acc, c) => acc + c.charCodeAt(0), 0),
  );
  return {
    url: `https://picsum.photos/seed/${seed}/1200/800`,
    alt: query,
    credit: "Lorem Picsum",
    creditUrl: "https://picsum.photos",
  };
}
