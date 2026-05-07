/**
 * Generador puro de slugs y URLs candidatas para portales municipales.
 *
 * Patrón observado en los 13 piloto:
 *   https://www.{slug}.{gob.ar|gov.ar}
 * donde `slug` es el nombre en minúsculas sin acentos, sin espacios, sin ñ.
 *
 * Para los 122 no-piloto necesitamos probar variantes: nombre completo,
 * sin prefijos honoríficos ("General", "Coronel"), sólo última palabra,
 * con y sin guiones, etc. El validador HTTP se encarga de descartar las
 * candidatas que no responden.
 */

/**
 * Normaliza un string a slug: minúsculas, sin acentos, sin ñ, sólo
 * [a-z0-9]. Ejemplo:
 *   "Cañuelas" → "canuelas"
 *   "Benito Juárez" → "benitojuarez"
 *   "Carmen de Areco" → "carmendeareco"
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita diacríticos
    .toLowerCase()
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Genera variantes de slug a partir del nombre de un municipio.
 * Retorna en orden de mayor a menor probabilidad de éxito (priorizando
 * el nombre completo antes que las reducciones).
 */
export function generateSlugs(nombre: string): string[] {
  const slugs = new Set<string>();

  // 1. Nombre completo concatenado (el patrón más común)
  slugs.add(slugify(nombre));

  // 2. Quitar prefijos honoríficos comunes ("General Alvear" → "alvear")
  const HONORIFICOS = [
    "general",
    "coronel",
    "capitan",
    "almirante",
    "comandante",
    "teniente",
    "brigadier",
  ];
  const words = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const sinHonorifico = words.filter((w, i) => !(i === 0 && HONORIFICOS.includes(w)));
  if (sinHonorifico.length > 0 && sinHonorifico.length !== words.length) {
    slugs.add(slugify(sinHonorifico.join("")));
  }

  // 3. Quitar conectores "de", "del", "la", "los" ("Carmen de Areco" → "carmenareco")
  const STOPWORDS = new Set(["de", "del", "la", "los", "las", "el"]);
  const sinStopwords = words.filter((w) => !STOPWORDS.has(w));
  if (sinStopwords.length > 0 && sinStopwords.join("") !== words.join("")) {
    slugs.add(slugify(sinStopwords.join("")));
  }
  // Combinar sin honorífico y sin stopwords ("General San Martín" → "sanmartin")
  const sinAmbos = sinStopwords.filter(
    (w, i) => !(i === 0 && HONORIFICOS.includes(w)),
  );
  if (sinAmbos.length > 0) {
    slugs.add(slugify(sinAmbos.join("")));
  }

  // 4. Última palabra significativa (útil en "Almirante Brown" → "brown")
  const lastSignificant = [...sinAmbos].pop();
  if (lastSignificant && lastSignificant.length >= 4) {
    slugs.add(slugify(lastSignificant));
  }

  // 5. Primera palabra + última (compound sin middle): "Adolfo Gonzales Chaves"
  //    → "adolfochaves"
  if (words.length >= 3) {
    slugs.add(slugify(words[0] + words[words.length - 1]));
  }

  return Array.from(slugs).filter((s) => s.length >= 3);
}

/**
 * Genera URLs candidatas a partir de un slug.
 * Priorización: .gob.ar → .gov.ar → .com.ar. www primero, luego sin www.
 * Solo https (no http): portales municipales modernos tienen SSL.
 */
export function generateUrlsFromSlug(slug: string): string[] {
  if (!slug) return [];
  const tlds = ["gob.ar", "gov.ar", "com.ar"];
  const urls: string[] = [];
  for (const tld of tlds) {
    urls.push(`https://www.${slug}.${tld}`);
    urls.push(`https://${slug}.${tld}`);
  }
  return urls;
}

/**
 * Conveniencia: candidatos completos desde un nombre.
 * Ordenado: mejores slugs × mejores TLDs primero.
 */
export function generateCandidateUrls(nombre: string): string[] {
  const slugs = generateSlugs(nombre);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of slugs) {
    for (const u of generateUrlsFromSlug(s)) {
      if (!seen.has(u)) {
        seen.add(u);
        out.push(u);
      }
    }
  }
  return out;
}
