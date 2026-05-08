import JSZip from "jszip";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects";

type Params = Promise<{ id: string }>;

const VITE_PACKAGE_JSON = `{
  "name": "wybitna-strona-export",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.6.0",
    "vite": "^6.0.0"
  }
}
`;

const VITE_CONFIG = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
`;

const TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src", "App.tsx", "index.tsx"]
}
`;

const README = (title: string) => `# ${title}

Wygenerowane przez [wybitnastrona.pl](https://wybitnastrona.pl).

## Uruchomienie

\`\`\`bash
npm install
npm run dev
\`\`\`

## Struktura

Glowny plik: \`App.tsx\`. Wszystkie pliki maja sciezki absolutne, mozesz reorganizowac swobodnie.
`;

function safeFilename(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "wybitna-strona"
  );
}

export async function GET(_req: Request, { params }: { params: Params }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await getProject(id);
  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const zip = new JSZip();

  for (const [path, file] of Object.entries(project.files ?? {})) {
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    zip.file(cleanPath, file.code);
  }

  if (!zip.file("package.json")) {
    zip.file("package.json", VITE_PACKAGE_JSON);
  }
  if (!zip.file("vite.config.ts")) {
    zip.file("vite.config.ts", VITE_CONFIG);
  }
  if (!zip.file("tsconfig.json")) {
    zip.file("tsconfig.json", TSCONFIG);
  }
  zip.file("README.md", README(project.title));

  const buffer = await zip.generateAsync({ type: "uint8array" });
  const filename = `${safeFilename(project.title)}.zip`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
