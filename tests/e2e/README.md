# Radar Municipal — E2E tests (Playwright)

Suite mínima para proteger los flujos críticos del frontend durante
Horizonte 1 (H1.2). Corre contra un build de producción (`next build` +
`next start`), no contra dev. Esto nos deja detectar regresiones de
hidratación y de rutas estáticas que no aparecen en `next dev`.

## Correr local

Primera vez (instala navegador Chromium de Playwright):

```bash
pnpm test:e2e:install
```

Después:

```bash
pnpm test:e2e            # headless
pnpm test:e2e:headed     # con navegador visible
pnpm test:e2e:ui         # UI mode interactivo
```

El script `test:e2e` corre `next build` antes de lanzar la suite porque
Playwright arranca `next start` contra el `.next/` generado por el paquete
`@radar-municipal/web`.

## Apuntar a un server ya corriendo

Si ya tenés el web arriba (por ejemplo `pnpm --filter web dev`), podés
evitar el build + restart exportando la URL:

```bash
E2E_BASE_URL=http://localhost:3000 playwright test
```

Nota: algunos tests pueden fallar contra `next dev` porque dependen del
render estático (ej. verificaciones de JSON-LD server-rendered).

## Qué cubre la suite

| Archivo | Flujo |
|---|---|
| `home.spec.ts` | Home → navegación a ranking y metodología |
| `ranking.spec.ts` | Ranking: listado completo + búsqueda por nombre |
| `municipio-detail.spec.ts` | Ficha municipal de Bahía Blanca: scores visibles |
| `comparador.spec.ts` | Comparador con params `?a=&b=` en URL |
| `dimensiones.spec.ts` | Ranking por dimensión (transparencia) |
| `calidad-datos.spec.ts` | Panel de cobertura con 135 filas + filtros |
| `mobile-nav.mobile.spec.ts` | Hamburger menu en viewport móvil |

El proyecto `mobile` solo corre tests que matchean `*.mobile.spec.ts`.
