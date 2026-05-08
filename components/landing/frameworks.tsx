const FRAMEWORKS = [
  "React 19",
  "TypeScript",
  "Tailwind CSS",
  "Vite",
  "Next.js",
  "shadcn/ui",
];

export function Frameworks() {
  return (
    <section className="border-t border-beige/10 bg-background py-12">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <p className="text-center text-xs uppercase tracking-wider text-muted-foreground">
          Wspierane technologie
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {FRAMEWORKS.map((name) => (
            <span
              key={name}
              className="text-sm font-medium text-foreground/60 transition hover:text-beige"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
