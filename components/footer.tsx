import Link from "next/link";

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

const SECTIONS = [
  {
    title: "Produkt",
    links: [
      { label: "Generator", href: "/" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Pricing", href: "/pricing" },
      { label: "Showcase", href: "/#showcase" },
    ],
  },
  {
    title: "Zasoby",
    links: [
      { label: "Jak to dziala", href: "/#how-it-works" },
      { label: "FAQ", href: "/#faq" },
      { label: "Changelog", href: "#" },
      { label: "Status", href: "#" },
    ],
  },
  {
    title: "Firma",
    links: [
      { label: "Blog", href: "#" },
      { label: "Kariera", href: "#" },
      { label: "Kontakt", href: "mailto:hello@wybitnastrona.pl" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Polityka prywatnosci", href: "/legal/privacy" },
      { label: "Regulamin", href: "/legal/terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-beige/10 bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-lg font-medium tracking-tight">
              <span className="text-beige">wybitnastrona</span>
              <span className="text-beige/60">.pl</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              AI Website Builder, ktory generuje wybitne strony w sekundach.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <a
                href="#"
                aria-label="Twitter / X"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-beige/15 text-muted-foreground transition hover:border-beige/40 hover:text-beige"
              >
                <TwitterIcon className="h-3.5 w-3.5" />
              </a>
              <a
                href="#"
                aria-label="GitHub"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-beige/15 text-muted-foreground transition hover:border-beige/40 hover:text-beige"
              >
                <GithubIcon className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs uppercase tracking-wider text-beige/80">
                {section.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition hover:text-beige"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-beige/10 pt-6 text-xs text-muted-foreground sm:flex-row">
          <span>
            © {new Date().getFullYear()} wybitnastrona.pl - AI Website Builder
          </span>
          <span>Sandboxed by Sandpack · Powered by Anthropic Claude</span>
        </div>
      </div>
    </footer>
  );
}
