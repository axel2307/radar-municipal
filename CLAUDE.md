# CLAUDE.md — Contexto del proyecto Radar Municipal

> **Guía de trabajo:** antes de tocar código, revisar los 4 principios al final de este archivo (sección "Karpathy Skills"): *Think Before Coding · Simplicity First · Surgical Changes · Goal-Driven Execution*. Tienen precedencia sobre la velocidad.

## Qué es este proyecto

**Radar Municipal** es una plataforma que convierte información pública dispersa de los 135 municipios de la Provincia de Buenos Aires en datos comparables, rankeables y auditables. Es un "Bloomberg de municipios": agrega, normaliza, rankea, alerta y vuelve operable información que hoy está inutilizable.

## Misión en una línea

Crear el estándar de comparación municipal que hoy no existe en Argentina.

## Usuarios objetivo

- Ciudadanos que quieren entender su municipio en 2 minutos
- Periodistas buscando historias con datos
- Concejales y equipos políticos
- ONGs y civic tech
- Productores rurales (vertical vial)
- Cámaras empresarias y consultoras
- Los propios municipios que quieran mostrar gestión

---

## Arquitectura general (target)

```
radar-municipal/
├── CLAUDE.md                    # Este archivo (contexto para Claude Code)
├── docs/
│   ├── research.md              # Deep research original (referencia)
│   ├── project-vision.md        # Visión completa del proyecto
│   ├── methodology.md           # Metodología de scoring (se va refinando)
│   └── data-dictionary.md       # Diccionario de datos y fuentes
├── packages/
│   ├── core/                    # Modelos de datos, tipos, constantes compartidas
│   │   ├── src/
│   │   │   ├── models/          # Municipio, Score, Dataset, Source, etc.
│   │   │   ├── constants/       # Lista de 135 municipios, categorías, etc.
│   │   │   └── types/           # TypeScript types compartidos
│   │   └── package.json
│   ├── scraper/                 # Pipeline de extracción de datos
│   │   ├── src/
│   │   │   ├── crawlers/        # Un crawler por "familia" de fuente
│   │   │   ├── parsers/         # Parsers de PDF RAFAM, HTML, CSV, etc.
│   │   │   ├── normalizers/     # Normalización a esquema común
│   │   │   └── scheduler/       # Orquestación de scraping periódico
│   │   └── package.json
│   ├── scoring/                 # Motor de cálculo de scores y rankings
│   │   ├── src/
│   │   │   ├── dimensions/      # Una dimensión por archivo (transparencia, fiscal, etc.)
│   │   │   ├── engine/          # Cálculo, ponderación, agregación
│   │   │   └── explainability/  # Genera explicación trazable de cada score
│   │   └── package.json
│   ├── api/                     # API REST/GraphQL
│   │   ├── src/
│   │   │   ├── routes/          # Endpoints
│   │   │   ├── middleware/       
│   │   │   └── services/        
│   │   └── package.json
│   └── web/                     # Frontend (Next.js)
│       ├── src/
│       │   ├── app/             # App router pages
│       │   ├── components/      # UI components
│       │   └── lib/             # Hooks, utils, API client
│       └── package.json
├── data/                        # Datos estáticos y seeds
│   ├── municipios.json          # Los 135 municipios con metadata base
│   ├── poblacion-censo2022.json # Población por partido (INDEC)
│   └── geometry/                # GeoJSON de límites de partidos
├── scripts/                     # Scripts de utilidad y migración
├── turbo.json                   # Turborepo config
└── package.json                 # Root workspace
```

### Decisiones técnicas clave

- **Monorepo con Turborepo**: packages separados para que scraper, scoring y web sean independientes
- **TypeScript everywhere**: tipos compartidos desde `core`
- **Base de datos**: PostgreSQL + Drizzle ORM (necesitamos relacional para las queries de ranking y comparación; PostGIS para geometrías)
- **Frontend**: Next.js 14+ con App Router, Tailwind, shadcn/ui
- **Scraper**: Node.js con Playwright (para sitios dinámicos) y cheerio (para HTML estático); pdf-parse o pdf.js para PDFs RAFAM
- **Deploy target**: Vercel (web). Sprint 27 movió los cron jobs a GitHub Actions (`.github/workflows/monthly-refresh.yml`) — corre el 1° de cada mes, refrescha datos vía `pnpm refresh:*`, abre PR con auto-merge si CI pasa, crea issue si falla.
- **Datos estáticos primero**: antes de scrapear, el MVP puede funcionar con datos curados manualmente para 13 municipios piloto

---

## Los 5 pilares del producto (en orden de implementación)

### Pilar 1: Capa de Transparencia (MVP)
Mide si publica, qué publica, si está actualizado, si es accesible, si es reutilizable.
- Score de publicación por documento clave (presupuesto, ejecución, SEF, deuda, finalidad/función)
- Rezago en días desde cierre trimestral
- Facilidad de acceso (clicks desde home, menú visible)
- Machine-readability (CSV/JSON vs PDF vs PDF escaneado)

### Pilar 2: Comparabilidad Fiscal
Indicadores homogéneos extraídos de documentos fiscales:
- Gasto total per cápita, deuda per cápita
- % gasto en personal, % gasto de capital
- Resultado fiscal, composición del gasto
- Evolución interanual

### Pilar 3: Normativa y Decisiones (SIBOM)
Estructurar ordenanzas, decretos, resoluciones, licitaciones desde SIBOM y boletines.
Timeline institucional viva de cada municipio.

### Pilar 4: Compras, Obras y Ejecución Real
Licitaciones, adjudicaciones, montos, proveedores, concentración (HHI).
Obras anunciadas vs contratadas vs ejecutadas.

### Pilar 5: Inteligencia Territorial
Verticales: vial rural, urbana, institucional.
Requiere GIS con OSM + geometrías de ARBA.

---

## Fuentes de datos principales

| Fuente | Qué da | Cómo se extrae |
|--------|--------|----------------|
| Portales de transparencia municipales | Presupuesto, ejecución, SEF, deuda (PDFs RAFAM) | Crawling + PDF parsing |
| SIBOM (sibom.slyt.gba.gob.ar) | Normas por municipio y tipo (ordenanzas, decretos, licitaciones) | Scraping HTML + descarga de PDFs |
| ASAP (asap.org.ar) | Metodología de ranking + lista de 135 municipios + sitios relevados | Referencia metodológica |
| Datos Abiertos PBA (ARBA) | Geometrías de partidos (SHP/GeoJSON) | Descarga directa |
| INDEC Censo 2022 | Población, superficie por partido | XLSX descargable |
| Portales de datos abiertos municipales | Datasets estructurados (compras, obras) | APIs CKAN/Junar |
| OpenStreetMap (Geofabrik) | Red vial estimada por partido | PBF/Shapefile processing |

## Municipios piloto (13, mezcla urbano/rural y variedad de plataformas)

1. Bahía Blanca — datos abiertos robustos, portal de compras
2. General Pueyrredón (Mar del Plata) — transparencia fiscal + datos abiertos
3. Tandil — licitaciones estructuradas + datos abiertos
4. Vicente López — portal compras + datos abiertos Junar
5. San Isidro — HTML institucional clásico
6. La Plata — municipio grande, stress test
7. Zárate — ciclo licitación→decreto completo
8. Luján — PaisDigital con metadatos limpios
9. Ayacucho — PaisDigital + transparencia fiscal
10. Lobería — reportes económicos trimestrales completos
11. Azul — municipio intermedio
12. Bragado — reportes RAFAM claros
13. Necochea — ordenanza fiscal vía SIBOM

---

## Scoring: principios metodológicos

- **Separar "no publica" de "gestiona mal"**: cobertura de datos es una dimensión, no un castigo moral
- **Cada score tiene trazabilidad**: fuente, fórmula, fecha, nivel de confianza, advertencias
- **Rankings por dimensión** (no un solo número mágico): transparencia, fiscal, normativa, compras, obras, vialidad, calidad de datos
- **Normalizar siempre**: per cápita, por km², por km de red vial estimada. Nunca rankear por monto bruto
- **El rezago se mide en días**: diferencia entre cierre trimestral y fecha de publicación/última modificación

## Variables clave del ranking

### Publicación fiscal (Alta factibilidad)
- Presupuesto publicado (0/1 + completitud)
- Rezago de ejecución (días desde cierre trimestral)
- Publicación por finalidad/función (0/1 + rezago)
- Publicación de deuda (0/1 + rezago)

### Accesibilidad (Alta factibilidad)
- Clicks desde home hasta datos
- Menú "Transparencia" visible
- Machine-readability (% CSV/JSON vs PDF)

### Fiscal (Media factibilidad — requiere parsing)
- Resultado corriente per cápita
- % gasto en personal
- % gasto de capital
- Deuda per cápita

### Normativa (Alta factibilidad vía SIBOM)
- Boletín oficial consultable (0/1 + buscable)
- Ordenanza fiscal vigente publicada (0/1)

### Compras (Media factibilidad)
- Publicación de licitaciones vigentes
- Publicación de adjudicaciones
- Concentración de proveedores (HHI) — solo donde hay open data

---

## Plan de fases de desarrollo

### FASE 0 — Fundaciones (ACTUAL)
Objetivo: monorepo funcional, modelos de datos, seed de municipios, schema de DB, y frontend skeleton.
- Inicializar monorepo Turborepo con packages: core, api, web, scraper, scoring
- Definir modelos en core: Municipio, Source, Document, Score, Indicator
- Seed de los 135 municipios (nombre, partido, código, URL oficial, población censo 2022, superficie)
- Schema PostgreSQL con Drizzle
- Next.js skeleton con layout base: home, ranking, ficha municipal, comparador, metodología
- NO scrapear nada todavía. Datos estáticos/mock.

### FASE 1 — Datos estáticos + Scoring de transparencia
Objetivo: cargar datos curados a mano de 13 municipios piloto y calcular primer ranking.
- Curar manualmente: ¿tiene presupuesto publicado? ¿ejecución? ¿SEF? ¿deuda? ¿ordenanza fiscal?
- Calcular score de transparencia con fórmulas explícitas
- Página de ranking funcional con datos reales
- Ficha por municipio con evidencia y links a fuentes

### FASE 2 — Scraping automatizado
Objetivo: reemplazar datos curados con detección automática.
- Crawlers para portales de transparencia (detectar existencia de documentos)
- Parser básico de PDFs RAFAM (extraer montos totales)
- Scraper de SIBOM (normas por municipio)
- Score de rezago automático

### FASE 3 — Comparabilidad fiscal
Objetivo: extraer KPIs de los PDFs y calcular indicadores comparables.
- Parser profundo de RAFAM: gasto por finalidad, personal, capital, deuda
- Normalización per cápita con datos del Censo
- Comparador entre municipios

### FASE 4 — Verticales
- Compras y contrataciones
- Obras públicas
- Red vial (GIS + OSM)
- Timeline normativa

### FASE 5 — Producto completo
- Alertas inteligentes
- API pública
- Exports (CSV, JSON)
- Freemium / premium
- White-label para municipios

---

## Convenciones de código

- Idioma del código: inglés (nombres de variables, funciones, tipos)
- Idioma de contenido/UI: español argentino
- Commits: conventional commits en español está ok
- Naming: camelCase para variables, PascalCase para tipos/componentes
- Todas las fechas en ISO 8601 (UTC para storage, America/Argentina/Buenos_Aires para display)
- IDs de municipios: usar código de partido oficial de PBA (6 dígitos INDEC)

## Riesgos a tener en cuenta

- PDFs escaneados requieren OCR (no para MVP, marcar como "no parseable")
- Sitios municipales cambian diseño sin aviso (crawlers deben ser resilientes)
- Heterogeneidad de ordenanzas fiscales (comparar existencia, no carga efectiva)
- OSM como proxy de red vial es útil pero discutible (presentar como estimación)
- Algunos municipios no publican nada: "sin datos" es un dato válido

---

# Karpathy Skills — Behavioral Guidelines

> Fuente: https://raw.githubusercontent.com/forrestchang/andrej-karpathy-skills/main/CLAUDE.md
> Incorporado como marco de trabajo común para este proyecto.

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

