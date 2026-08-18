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
    /* The font variables MUST live on <html>, not <body>: the @theme aliases
       (--font-geist: var(--font-geist-sans), …) are declared at :root, and a
       custom property resolves its var() references WHERE IT IS DECLARED — so
       with --font-geist-sans one level down on <body>, --font-geist computed
       to invalid and every font-family: var(--font-geist) fell back to the
       system face. Geist (and the legacy trio) never actually rendered. */
    <html
      lang="en"
      className={`${GeistSans.variable} ${fraunces.variable} ${newsreader.variable} ${archivo.variable}`}
    >
      {/* Geist is the redesign's single family, loaded from Vercel's official
          package (local files, no Google Fonts round trip). The three original
          faces stay until the screens still using them are redesigned. */}
      <body>
        <TooltipProvider>{children}</TooltipProvider>
        {/* TOP RIGHT, not sonner's default bottom. Below md the nav is a fixed
            bottom bar, so a bottom toast lands on top of it.

            The 60px right inset keeps it clear of the scrollbar and off the
            sheet's rounded top-right corner, so it reads as floating above the
            page rather than clipped to its edge. */}
        <Toaster position="top-right" offset={{ top: 24, right: 60 }} />
      </body>
    </html>
  );
}
