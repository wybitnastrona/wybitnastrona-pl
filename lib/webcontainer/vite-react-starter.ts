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
    "lucide-react": "^0.469.0",
    "framer-motion": "^11.3.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.2",
    "class-variance-authority": "^0.7.1",
    "@radix-ui/react-slot": "^1.1.0"
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
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
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
    "allowImportingTsExtensions": false,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
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
    <script src="https://cdn.tailwindcss.com" crossorigin="anonymous"></script>
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
import "./styles.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
`;

const STYLES_CSS = `:root {
  --accent: oklch(0.7 0.22 250);
  --accent-fg: oklch(0.98 0 0);
  --radius: 0.5rem;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
`;

const LIB_UTILS_TS = `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;

const UI_BUTTON_TSX = `import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-neutral-900 text-white shadow hover:bg-neutral-800 focus-visible:ring-neutral-900",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-600",
        outline:
          "border border-neutral-300 bg-transparent shadow-sm hover:bg-neutral-100 hover:text-neutral-900",
        secondary:
          "bg-neutral-100 text-neutral-900 shadow-sm hover:bg-neutral-200",
        ghost: "hover:bg-neutral-100 hover:text-neutral-900",
        link: "text-neutral-900 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-md px-4 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
        xl: "h-14 rounded-lg px-10 text-base font-semibold",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
`;

const UI_CARD_TSX = `import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border border-neutral-200 bg-white text-neutral-950 shadow-sm",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-xl font-semibold leading-tight tracking-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-neutral-500 leading-relaxed", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
`;

const UI_BADGE_TSX = `import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-neutral-900 text-white hover:bg-neutral-800",
        secondary:
          "border-transparent bg-neutral-100 text-neutral-900 hover:bg-neutral-200",
        destructive:
          "border-transparent bg-red-600 text-white hover:bg-red-700",
        outline: "text-neutral-900 border-neutral-300",
        accent:
          "border-transparent bg-[var(--accent)] text-[var(--accent-fg)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
`;

const UI_INPUT_TSX = `import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
`;

const UI_TEXTAREA_TSX = `import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[100px] w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
`;

const SECTION_HEADER_TSX = `import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  number?: string;
  label?: string;
  title: string;
  subtitle?: string;
  center?: boolean;
  className?: string;
}

export function SectionHeader({
  number,
  label,
  title,
  subtitle,
  center = false,
  className,
}: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={cn("mb-12 md:mb-16", center && "text-center", className)}
    >
      {(number || label) && (
        <div
          className={cn(
            "flex items-center gap-3 mb-4",
            center && "justify-center",
          )}
        >
          {number && (
            <span className="text-xs font-mono text-neutral-400 tracking-widest">
              {number}
            </span>
          )}
          {number && label && (
            <span className="text-neutral-300 text-xs">—</span>
          )}
          {label && (
            <span
              className="text-xs uppercase tracking-[0.2em] font-semibold"
              style={{ color: "var(--accent)" }}
            >
              {label}
            </span>
          )}
        </div>
      )}
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p
          className={cn(
            "mt-4 text-base md:text-lg text-neutral-500 leading-relaxed",
            center ? "mx-auto max-w-2xl" : "max-w-2xl",
          )}
        >
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
`;

const UI_LABEL_TSX = `import * as React from "react";
import { cn } from "@/lib/utils";

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className,
    )}
    {...props}
  />
));
Label.displayName = "Label";

export { Label };
`;

const UI_SEPARATOR_TSX = `import * as React from "react";
import { cn } from "@/lib/utils";

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
    <div
      ref={ref}
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      className={cn(
        "shrink-0 bg-neutral-200",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  ),
);
Separator.displayName = "Separator";

export { Separator };
`;

const UI_SKELETON_TSX = `import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-neutral-200", className)}
      {...props}
    />
  );
}

export { Skeleton };
`;

const UI_AVATAR_TSX = `import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  initials?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

function Avatar({ className, src, alt, initials, size = "md", ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-200 font-semibold text-neutral-700 select-none",
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={alt ?? "Avatar"}
          crossOrigin="anonymous"
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{initials ?? "?"}</span>
      )}
    </div>
  );
}

export { Avatar };
`;

const UI_PROGRESS_TSX = `import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-neutral-200",
          className,
        )}
        {...props}
      >
        <div
          className="h-full rounded-full bg-neutral-900 transition-all duration-500 ease-out"
          style={{ width: \`\${percentage}%\` }}
        />
      </div>
    );
  },
);
Progress.displayName = "Progress";

export { Progress };
`;

const UI_TABS_TSX = `import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue>({
  activeTab: "",
  setActiveTab: () => {},
});

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

function Tabs({ defaultValue, value, onValueChange, className, children, ...props }: TabsProps) {
  const [activeTab, setActiveTab] = React.useState(value ?? defaultValue);

  const handleChange = React.useCallback(
    (v: string) => {
      setActiveTab(v);
      onValueChange?.(v);
    },
    [onValueChange],
  );

  return (
    <TabsContext.Provider value={{ activeTab: value ?? activeTab, setActiveTab: handleChange }}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-lg bg-neutral-100 p-1 text-neutral-500",
        className,
      )}
      {...props}
    />
  );
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

function TabsTrigger({ className, value, children, ...props }: TabsTriggerProps) {
  const { activeTab, setActiveTab } = React.useContext(TabsContext);
  const isActive = activeTab === value;
  return (
    <button
      type="button"
      onClick={() => setActiveTab(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-white text-neutral-900 shadow-sm"
          : "hover:bg-white/50 hover:text-neutral-900",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

function TabsContent({ className, value, children, ...props }: TabsContentProps) {
  const { activeTab } = React.useContext(TabsContext);
  if (activeTab !== value) return null;
  return (
    <div className={cn("mt-4 focus-visible:outline-none", className)} {...props}>
      {children}
    </div>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
`;

const UI_ACCORDION_TSX = `import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionItemProps {
  value: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function AccordionItem({ value, trigger, children, className }: AccordionItemProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className={cn("border-b border-neutral-200 last:border-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-4 text-sm font-medium text-left transition-colors hover:text-neutral-600 focus-visible:outline-none"
        aria-expanded={open}
      >
        <span>{trigger}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-neutral-500"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-4 text-sm text-neutral-600 leading-relaxed">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "single" | "multiple";
}

function Accordion({ className, children, ...props }: AccordionProps) {
  return (
    <div className={cn("divide-y divide-neutral-200 rounded-lg border border-neutral-200", className)} {...props}>
      {children}
    </div>
  );
}

export { Accordion, AccordionItem };
`;

const UI_SELECT_TSX = `import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full appearance-none rounded-md border border-neutral-300 bg-white pl-3 pr-8 py-2 text-sm text-neutral-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
    </div>
  ),
);
Select.displayName = "Select";

export { Select };
`;

const UI_SCROLL_AREA_TSX = `import * as React from "react";
import { cn } from "@/lib/utils";

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  maxHeight?: string;
}

function ScrollArea({ className, maxHeight = "24rem", children, ...props }: ScrollAreaProps) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-md", className)}
      {...props}
    >
      <div
        className="h-full w-full overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-300"
        style={{ maxHeight }}
      >
        {children}
      </div>
    </div>
  );
}

export { ScrollArea };
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
    // Build infrastructure — hidden from file tree
    "/package.json": { code: PACKAGE_JSON, hidden: true },
    "/vite.config.ts": { code: VITE_CONFIG, hidden: true },
    "/tsconfig.json": { code: TSCONFIG, hidden: true },
    "/index.html": { code: INDEX_HTML, hidden: true },
    // App entry points — hidden, managed by starter
    "/src/styles.css": { code: STYLES_CSS, hidden: true },
    "/src/main.tsx": { code: MAIN_TSX, hidden: true },
    // Utility & design system — hidden, pre-installed for AI use
    "/src/lib/utils.ts": { code: LIB_UTILS_TS, hidden: true },
    "/src/components/ui/button.tsx": { code: UI_BUTTON_TSX, hidden: true },
    "/src/components/ui/card.tsx": { code: UI_CARD_TSX, hidden: true },
    "/src/components/ui/badge.tsx": { code: UI_BADGE_TSX, hidden: true },
    "/src/components/ui/input.tsx": { code: UI_INPUT_TSX, hidden: true },
    "/src/components/ui/textarea.tsx": { code: UI_TEXTAREA_TSX, hidden: true },
    "/src/components/ui/label.tsx": { code: UI_LABEL_TSX, hidden: true },
    "/src/components/ui/separator.tsx": { code: UI_SEPARATOR_TSX, hidden: true },
    "/src/components/ui/skeleton.tsx": { code: UI_SKELETON_TSX, hidden: true },
    "/src/components/ui/avatar.tsx": { code: UI_AVATAR_TSX, hidden: true },
    "/src/components/ui/progress.tsx": { code: UI_PROGRESS_TSX, hidden: true },
    "/src/components/ui/tabs.tsx": { code: UI_TABS_TSX, hidden: true },
    "/src/components/ui/accordion.tsx": { code: UI_ACCORDION_TSX, hidden: true },
    "/src/components/ui/select.tsx": { code: UI_SELECT_TSX, hidden: true },
    "/src/components/ui/scroll-area.tsx": { code: UI_SCROLL_AREA_TSX, hidden: true },
    "/src/components/sections/SectionHeader.tsx": {
      code: SECTION_HEADER_TSX,
      hidden: true,
    },
    // Main app file — visible and active in editor
    "/src/App.tsx": { code: APP_TSX, active: true },
  };
}

export const VITE_REACT_RUN = { cmd: "npm", args: ["run", "dev"] };
