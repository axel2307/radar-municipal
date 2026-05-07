import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { JsonLd } from "@/components/JsonLd";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://radarmunicipal.ar";

export const metadata: Metadata = {
  title: {
    default: "Radar Municipal — Ranking de municipios de Buenos Aires",
    template: "%s | Radar Municipal",
  },
  description:
    "Datos públicos, comparables y auditables de los 135 municipios de la Provincia de Buenos Aires. Rankings de transparencia, indicadores fiscales y normativa.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Radar Municipal",
    title: "Radar Municipal — Ranking de municipios de Buenos Aires",
    description:
      "El estándar de comparación municipal. Datos de transparencia, fiscales y normativos de los 135 municipios bonaerenses.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Radar Municipal",
    description:
      "Rankings de transparencia, indicadores fiscales y normativa de los 135 municipios de la Provincia de Buenos Aires.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <JsonLd data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "Radar Municipal",
          "url": "https://radarmunicipal.ar",
          "description": "El estándar de comparación municipal de la Provincia de Buenos Aires.",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://radarmunicipal.ar/ranking?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }} />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
