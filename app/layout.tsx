import type { Metadata } from "next";
import { Fraunces, Newsreader, Archivo } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Three type roles, three faces (design.md §2). Loaded as CSS variables the
// @theme block maps to --font-display / --font-narrative / --font-ui.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-fraunces",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
  adjustFontFallback: false, // Newsreader has no next/font fallback-metric data
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Relay",
  description: "Client-comms intelligence layer for media buying agencies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Geist is the redesign's single family, loaded from Vercel's official
          package (local files, no Google Fonts round trip). The three original
          faces stay until the screens still using them are redesigned. */}
      <body
        className={`${GeistSans.variable} ${fraunces.variable} ${newsreader.variable} ${archivo.variable}`}
      >
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
