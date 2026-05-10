import type { NextConfig } from "next";

/**
 * `Cross-Origin-Embedder-Policy: credentialless` + `COOP: same-origin` ustawia
 * `middleware.ts` (Edge) dla `/project/*`.
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
