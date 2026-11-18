import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Mono, Host_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SiteHeader } from "./site-header";
import "./globals.css";

const hostGrotesk = Host_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-host-grotesk" });
const atkinsonMono = Atkinson_Hyperlegible_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-atkinson-mono",
  // Google publishes no metric overrides for this face, so Next cannot build a fallback.
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Dev News",
  description: "What developers are reading today, ranked by each Source.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn("dark", hostGrotesk.variable, atkinsonMono.variable)}>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-50"
        >
          Skip to the ranking
        </a>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
