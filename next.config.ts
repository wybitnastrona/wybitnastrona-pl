import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Akceptuj zadania z subdomen *.localhost dla developmentu (preview *.localhost:3000).
  allowedDevOrigins: ["*.localhost"],
  // Sandpack i edytor kodu sa duze - przekierowujemy je przez transpilation.
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@codesandbox/sandpack-react",
    ],
  },
};

export default nextConfig;
