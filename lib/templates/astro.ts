import type { ProjectFiles } from "@/lib/types/project";

export const ASTRO_DEPS: Record<string, string> = {
  astro: "^5.0.0",
};

export const ASTRO_RUN = { cmd: "npm", args: ["run", "dev"] };

export function getAstroTemplate(): ProjectFiles {
  return {
    "/package.json": {
      code: JSON.stringify(
        {
          name: "wybitna-astro",
          private: true,
          scripts: { dev: "astro dev", build: "astro build" },
          dependencies: ASTRO_DEPS,
        },
        null,
        2,
      ),
      hidden: true,
    },
    "/astro.config.mjs": {
      code: 'import { defineConfig } from "astro/config";\nexport default defineConfig({});\n',
      hidden: true,
    },
    "/src/pages/index.astro": {
      code: `---
const title = "wybitnastrona.pl + Astro";
---
<html lang="pl">
  <head>
    <title>{title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-neutral-950 text-neutral-100">
    <main class="flex min-h-screen items-center justify-center p-6">
      <div class="text-center space-y-4">
        <h1 class="text-4xl font-medium">{title}</h1>
        <p class="text-neutral-400">Opisz pomysł — AI dobuduje strony.</p>
      </div>
    </main>
  </body>
</html>
`,
      active: true,
    },
  };
}
