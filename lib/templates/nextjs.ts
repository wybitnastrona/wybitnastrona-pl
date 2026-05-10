import type { ProjectFiles } from "@/lib/types/project";

export const NEXTJS_DEPS: Record<string, string> = {
  next: "15.1.0",
  react: "^19.0.0",
  "react-dom": "^19.0.0",
};

export const NEXTJS_RUN = { cmd: "npm", args: ["run", "dev"] };

export function getNextjsTemplate(): ProjectFiles {
  return {
    "/package.json": {
      code: JSON.stringify(
        {
          name: "wybitna-nextjs",
          private: true,
          scripts: {
            dev: "next dev",
            build: "next build",
            start: "next start",
          },
          dependencies: NEXTJS_DEPS,
        },
        null,
        2,
      ),
      hidden: true,
    },
    "/next.config.js": {
      code: "module.exports = {};\n",
      hidden: true,
    },
    "/app/layout.tsx": {
      code: `export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="bg-neutral-950 text-neutral-100">{children}</body>
    </html>
  );
}
`,
    },
    "/app/page.tsx": {
      code: `export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-medium">wybitnastrona.pl + Next.js</h1>
        <p className="text-neutral-400">Opisz pomysł w czacie — AI rozbuduje aplikację.</p>
      </div>
    </main>
  );
}
`,
      active: true,
    },
  };
}
