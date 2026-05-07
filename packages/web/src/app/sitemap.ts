import type { MetadataRoute } from "next";
import { MUNICIPIOS_PILOTO } from "@radar-municipal/core";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://radarmunicipal.ar";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/ranking`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/municipios`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/calidad-datos`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/presion-impositiva`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/comparador`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/metodologia`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/datos-abiertos`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/acerca-de`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
  ];

  const municipioPages: MetadataRoute.Sitemap = MUNICIPIOS_PILOTO.map((m) => ({
    url: `${BASE_URL}/municipios/${m.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...municipioPages];
}
