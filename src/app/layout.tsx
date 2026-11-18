import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Mono, Host_Grotesk } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

const hostGrotesk = Host_Grotesk({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-host-grotesk" });
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
    <html lang="en" className={`${hostGrotesk.variable} ${atkinsonMono.variable}`}>
      <body>
        <a className="skip" href="#main">
          Skip to the ranking
        </a>
        <header className="bar">
          <div className="container bar__inner">
            <Link href="/" className="wordmark" aria-label="Dev News, home">
              Dev News
            </Link>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
