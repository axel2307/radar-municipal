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
| `presion-impositiva.spec.ts` | Comparador de tasas + calculadora de radicación |
| `cmdk-palette.spec.ts` | Command palette (Cmd+K) |
| `feed.spec.ts` | Feed unificado de actividad |
| `wayfinding.spec.ts` | Cards "¿Qué buscás?" de la home |
| `mobile-nav.mobile.spec.ts` | Hamburger menu en viewport móvil |
| `visual.spec.ts` | **Visual regression** — screenshots vs baseline |

Proyectos en `playwright.config.ts`:
- `chromium`: corre todos los specs `*.spec.ts` excepto `*.mobile` y `visual`.
- `mobile`: solo `*.mobile.spec.ts`.
- `visual`: solo `visual.spec.ts` (project separado por las baselines).

## Visual regression (Sprint 50)

`visual.spec.ts` toma screenshots de 6 páginas clave y las compara contra
PNGs committeados en `tests/e2e/visual.spec.ts-snapshots/`. Tolerancia
configurada: `maxDiffPixelRatio: 0.02`.

**Las baselines son platform-specific.** Linux (CI runner) y Windows/macOS
producen rendering distinto (antialiasing, sub-pixel). La fuente de verdad
es Linux. NO commitees PNGs generados en tu máquina si no son Linux.

### Correr local

```bash
pnpm test:visual            # valida contra baselines existentes
pnpm test:visual:update     # regenera baselines (solo si estás en Linux)
```

### Inicializar / regenerar baselines (workflow oficial)

1. Dispará el workflow manual:
   ```bash
   gh workflow run visual-regression.yml -f update_snapshots=true
   ```
2. Cuando termine, bajá el artifact `visual-snapshots`:
   ```bash
   gh run download <run-id> --name visual-snapshots
   ```
3. Copiá los PNGs a `tests/e2e/visual.spec.ts-snapshots/` y committeá:
   ```bash
   git add tests/e2e/visual.spec.ts-snapshots/
   git commit -m "chore: regenerate visual baselines"
   ```

### Cuando un PR rompe el diff

El job `visual-regression` falla. En el artifact `visual-snapshots` vas a
encontrar:
- `tests/e2e/visual.spec.ts-snapshots/`: baselines actuales (referencia)
- `test-results/`: `*-actual.png`, `*-expected.png`, `*-diff.png` por test fallido
- `playwright-report/`: HTML browseable

Si el cambio visual es intencional, regenerá baselines (paso anterior). Si
es accidental, fixeá el código antes del merge.
