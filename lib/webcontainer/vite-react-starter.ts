/**
 * Vite + React + TypeScript starter dla WebContainer.
 *
 * To jest „prawdziwy” projekt Vite (z `package.json`, `vite.config.ts`,
 * `src/main.tsx`), montowany w wirtualnym FS WebContainera. `wcManager`
 * wykonuje `npm install` + `npm run dev`, a Vite emituje `server-ready`
 * na stronie hosta `localhost:5173`.
 *
 * Skrypty `element-picker` i `error-listener` są wstrzyknięte do `index.html`,
 * żeby parent dostawał `postMessage` z błędami i kliknięciami w trybie picker.
 */

import type { ProjectFiles } from "@/lib/types/project";
import { ELEMENT_PICKER_SCRIPT } from "@/lib/sandpack/element-picker-script";
import { ERROR_LISTENER_SCRIPT } from "@/lib/sandpack/error-listener-script";

const PACKAGE_JSON = `{
  "name": "wybitna-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 5173 --strictPort",
    "build": "vite build",
    "preview": "vite preview --host 0.0.0.0 --port 4173"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.469.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.5.3",
    "vite": "^5.4.10"
  }
}
`;

const VITE_CONFIG = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    hmr: { clientPort: 443 },
  },
});
`;

const TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "allowImportingTsExtensions": false
  },
  "include": ["src"]
}
`;

const INDEX_HTML = `<!doctype html>
<html lang="pl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>wybitnastrona.pl - preview</title>
    <link rel="canonical" href="https://wybitnastrona.pl" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
${ELEMENT_PICKER_SCRIPT}
    </script>
    <script>
${ERROR_LISTENER_SCRIPT}
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

const MAIN_TSX = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
`;

const APP_TSX = `export default function App() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="inline-block h-8 w-8 rounded-full border-2 border-amber-200/30 border-t-amber-200 animate-spin" />
        <h1 className="text-2xl font-medium">Buduję Twoją stronę…</h1>
        <p className="text-sm text-neutral-400">
          AI generuje sekcje biznesowe. Za chwilę zobaczysz wynik tutaj na żywo.
        </p>
      </div>
    </div>
  );
}
`;

export function getViteReactStarterFiles(): ProjectFiles {
  return {
    "/package.json": { code: PACKAGE_JSON, hidden: true },
    "/vite.config.ts": { code: VITE_CONFIG, hidden: true },
    "/tsconfig.json": { code: TSCONFIG, hidden: true },
    "/index.html": { code: INDEX_HTML, hidden: true },
    "/src/main.tsx": { code: MAIN_TSX, hidden: true },
    "/src/App.tsx": { code: APP_TSX, active: true },
  };
}

export const VITE_REACT_RUN = { cmd: "npm", args: ["run", "dev"] };
