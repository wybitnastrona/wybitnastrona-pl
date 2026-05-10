import type { ProjectFiles } from "@/lib/types/project";

export const SVELTE_DEPS: Record<string, string> = {
  "@sveltejs/kit": "^2.0.0",
  svelte: "^5.0.0",
};

export const SVELTE_RUN = { cmd: "npm", args: ["run", "dev"] };

export function getSvelteTemplate(): ProjectFiles {
  return {
    "/package.json": {
      code: JSON.stringify(
        {
          name: "wybitna-svelte",
          private: true,
          scripts: { dev: "vite dev", build: "vite build" },
          dependencies: SVELTE_DEPS,
        },
        null,
        2,
      ),
      hidden: true,
    },
    "/src/routes/+page.svelte": {
      code: `<script>
  let count = 0;
</script>

<main class="flex min-h-screen items-center justify-center p-6">
  <div class="text-center space-y-4">
    <h1 class="text-4xl font-medium">wybitnastrona.pl + SvelteKit</h1>
    <button
      class="px-4 py-2 rounded-lg bg-amber-200 text-neutral-950"
      on:click={() => count++}
    >
      Klikniec: {count}
    </button>
  </div>
</main>
`,
      active: true,
    },
  };
}
