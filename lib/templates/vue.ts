import type { ProjectFiles } from "@/lib/types/project";

export const VITE_VUE_DEPS: Record<string, string> = {
  vue: "^3.4.0",
};

export const VITE_VUE_RUN = { cmd: "npm", args: ["run", "dev"] };

export function getViteVueTemplate(): ProjectFiles {
  return {
    "/index.html": {
      code: `<!doctype html>
<html lang="pl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>wybitnastrona.pl + Vue</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-neutral-950 text-neutral-100">
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`,
      hidden: true,
    },
    "/src/main.ts": {
      code: `import { createApp } from "vue";
import App from "./App.vue";
createApp(App).mount("#app");
`,
      hidden: true,
    },
    "/src/App.vue": {
      code: `<template>
  <main class="flex min-h-screen items-center justify-center p-6">
    <div class="text-center space-y-4">
      <h1 class="text-4xl font-medium">wybitnastrona.pl + Vue 3</h1>
      <button
        @click="count++"
        class="px-4 py-2 rounded-lg bg-amber-200 text-neutral-950"
      >
        Klikniec: {{ count }}
      </button>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref } from "vue";
const count = ref(0);
</script>
`,
      active: true,
    },
  };
}
