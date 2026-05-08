import type { ProjectFiles } from "@/lib/types/project";

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
    <script src="https://cdn.tailwindcss.com"></script>
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
