import type { NextConfig } from "next";

/**
 * `Cross-Origin-Embedder-Policy: require-corp` + `Cross-Origin-Opener-Policy: same-origin`
 * ustawia `proxy.ts` (Edge) dla `/project/*`.
 * Wymagane przez WebContainer (SharedArrayBuffer + crossOriginIsolated).
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
