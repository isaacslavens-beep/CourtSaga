import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

// One family for everything: a grotesque with a width axis, so headings and big numbers can run condensed,
// like a scoreboard's, while running text stays at its normal width
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const description =
  "Explore the story of any tennis match, star the ones you care about to build your own shareable story, and look up the records behind them. Launching before the 2027 Australian Open.";

export const metadata: Metadata = {
  // Link previews fetch their images from the live site, whatever address a page was built on
  metadataBase: new URL("https://www.courtsaga.com"),
  title: "CourtSaga",
  description,
  openGraph: {
    title: "CourtSaga",
    description,
    siteName: "CourtSaga",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
