import React from "react";
import type { Metadata } from "next";
import { Poppins, Inter, Instrument_Sans, Public_Sans } from "next/font/google";
import "@/styles/globals.css";
import { cn } from "@/lib/utils";
import RootProviders from "@/components/providers";
import { generateTitle, generateDescription } from "@/lib/seo";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fontPoppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const fontMono = Inter({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const fontInstrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
});

const fontPublicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: generateTitle("Open D2C"),
  description: generateDescription(
    "We sell Indian tea, coffee and matcha to people who care about quality.",
  ),
  icons: {
    icon: [
      { url: "/favicon.ico" },
      {
        url: "/icon-light.svg",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark.svg",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: [
      {
        url: "/icon-light.svg",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark.svg",
        media: "(prefers-color-scheme: dark)",
      },
    ],
  },
  openGraph: {
    title: generateTitle("Open D2C"),
    description: generateDescription(
      "We sell Indian tea, coffee and matcha to people who care about quality.",
    ),
    images: [
      {
        url: "https://opend2c.com/og.png",
        width: 1200,
        height: 630,
        alt: "Open D2C - Better customer experience with knowledgebase",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: generateTitle("Open D2C"),
    description: generateDescription(
      "We sell Indian tea, coffee and matcha to people who care about quality.",
    ),
    images: ["https://opend2c.com/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <meta name="p:domain_verify" content="263c83126f8d79bccabc00711d8d80c6" />
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
          fontPoppins.variable,
          fontMono.variable,
          fontInstrumentSans.variable,
          fontPublicSans.variable,
        )}
      >
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
