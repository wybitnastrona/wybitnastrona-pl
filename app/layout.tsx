import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { SettingsProvider } from "@/components/settings/settings-provider";
import { CookieBanner } from "@/components/cookie-banner";
import { PwaRegister } from "@/components/pwa-register";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://wybitnastrona.pl";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "wybitnastrona.pl — AI Website Builder",
    template: "%s | wybitnastrona.pl",
  },
  description:
    "Opisz pomysł, a AI zbuduje wybitną stronę w kilka sekund. Generator stron napędzany sztuczną inteligencją.",
  openGraph: {
    title: "wybitnastrona.pl — AI Website Builder",
    description:
      "Opisz pomysł, a AI zbuduje wybitną stronę w kilka sekund.",
    type: "website",
    locale: "pl_PL",
    url: APP_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "wybitnastrona.pl — AI Website Builder",
    description:
      "Opisz pomysł, a AI zbuduje wybitną stronę w kilka sekund.",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "wybitnastrona",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pl"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthProvider>
          <SettingsProvider>
            {children}
            <CookieBanner />
            <PwaRegister />
            <Analytics />
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
