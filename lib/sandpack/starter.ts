import type { ProjectFiles } from "@/lib/types/project";
import { ELEMENT_PICKER_SCRIPT } from "./element-picker-script";
import { ERROR_LISTENER_SCRIPT } from "./error-listener-script";

const APP_TSX = `import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
      <div className="max-w-xl w-full text-center space-y-6">
        <span className="inline-block px-3 py-1 rounded-full text-xs uppercase tracking-wider border border-amber-200/30 text-amber-200">
          wybitnastrona.pl
        </span>
        <h1 className="text-4xl md:text-5xl font-medium tracking-tight">
          Twoja wybitna strona
        </h1>
        <p className="text-neutral-400">
          Zacznij od opisania pomyslu w czacie po lewej. AI wygeneruje pliki,
          ktore zobaczysz tutaj na zywo.
        </p>
        <button
          type="button"
          onClick={() => setCount((c) => c + 1)}
          className="px-4 py-2 rounded-lg bg-amber-200 text-neutral-950 font-medium hover:bg-amber-100 transition"
        >
          Klikniec: {count}
        </button>
      </div>
    </div>
  );
}
`;

const INDEX_HTML = `<!doctype html>
<html lang="pl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>wybitnastrona.pl - preview</title>
    <style>
      /* Fallback CSS: jeśli CDN Tailwind nie załaduje się (np. Opera, timeout) */
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html { font-size: 16px; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0a0a0a; color: #e7e3da; line-height: 1.5; }
      .min-h-screen { min-height: 100vh; }
      .bg-neutral-950 { background: #0a0a0a; }
      .text-neutral-100 { color: #f5f5f5; }
      .text-neutral-400 { color: #a3a3a3; }
      .flex { display: flex; }
      .items-center { align-items: center; }
      .justify-center { justify-content: center; }
      .p-6 { padding: 24px; }
      .max-w-xl { max-width: 36rem; }
      .w-full { width: 100%; }
      .text-center { text-align: center; }
      .space-y-6 > * + * { margin-top: 24px; }
      .inline-block { display: inline-block; }
      .px-3, .px-4 { padding-left: 12px; padding-right: 12px; }
      .py-1, .py-2 { padding-top: 4px; padding-bottom: 4px; }
      .py-2 { padding-top: 8px; padding-bottom: 8px; }
      .rounded-full { border-radius: 9999px; }
      .rounded-lg { border-radius: 8px; }
      .text-xs { font-size: 12px; }
      .text-4xl { font-size: 36px; }
      .text-5xl { font-size: 48px; }
      .uppercase { text-transform: uppercase; }
      .tracking-wider { letter-spacing: 0.05em; }
      .border { border: 1px solid; }
      .border-amber-200 { border-color: #fcd34d; opacity: 0.3; }
      .text-amber-200 { color: #fcd34d; }
      .font-medium { font-weight: 500; }
      .md\\:text-5xl { font-size: 48px; }
      .bg-amber-200 { background: #fcd34d; }
      .text-neutral-950 { color: #0a0a0a; }
      .hover\\:bg-amber-100:hover { background: #fde047; }
      .transition { transition: background-color 150ms; }
      .cursor-pointer { cursor: pointer; }
    </style>
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
    <script type="module" src="/index.tsx"></script>
  </body>
</html>
`;

const INDEX_TSX = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
`;

export function getStarterFiles(): ProjectFiles {
  return {
    "/index.html": { code: INDEX_HTML, hidden: true },
    "/index.tsx": { code: INDEX_TSX, hidden: true },
    "/App.tsx": { code: APP_TSX, active: true },
  };
}

export const STARTER_DEPENDENCIES: Record<string, string> = {
  react: "^19.0.0",
  "react-dom": "^19.0.0",
};
