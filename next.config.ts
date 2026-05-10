import type { NextConfig } from "next";

/**
 * COEP/COOP dla `/project/*` ustawiane w `proxy.ts` (Edge), nie przez `headers()`
 * — jedna warstwa nagłówków na odpowiedzi HTML (Vercel + dev).
 *
 * `Cross-Origin-Embedder-Policy: credentialless` + `COOP: same-origin` dają
 * szansę na crossOriginIsolation dla WebContainer, bez wymogu CORP na
 * bundlerze Sandpack (codesandbox.io nie wysyła `Cross-Origin-Resource-Policy`).
 */
const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.localhost"],

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@codesandbox/sandpack-react",
    ],
  },
};

export default nextConfig;
