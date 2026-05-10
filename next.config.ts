import type { NextConfig } from "next";

/**
 * COEP/COOP headers sa wymagane przez WebContainers (StackBlitz) w celu
 * uzyskania Cross-Origin Isolation (potrzebne dla SharedArrayBuffer).
 *
 * UWAGA: te headery LAMIA niektore embedded 3rd-party iframes (Stripe Elements,
 * YouTube embed, etc.). Dlatego stosujemy je TYLKO na trasie /project/* —
 * gdzie potrzebny jest WC. Reszta aplikacji (landing, pricing, dashboard)
 * uzywa Stripe Checkout w nowej karcie wiec problemu nie ma.
 */
const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.localhost"],

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@codesandbox/sandpack-react",
    ],
  },

  async headers() {
    return [
      {
        source: "/project/:path*",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
