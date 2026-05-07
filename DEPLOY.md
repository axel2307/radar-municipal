# DEPLOY.md — Activar el cron mensual

Sprint 27 + 28 entregaron toda la infraestructura del refresh mensual.
Sprint 29 documenta cómo activarlo en producción. Este archivo es el
checklist que el operador (o un agente futuro con acceso al remote)
sigue cuando quiere que el cron empiece a correr.

**Estado del código local (Sprint 29 dry-run):**
- ✅ `pnpm refresh:pilar4` corre OK (243 contrataciones, 2 municipios)
- ✅ `pnpm refresh:deuda` corre OK (13 snapshots, 5 municipios)
- ✅ `pnpm validate:data` pasa (8/8 archivos)
- ✅ `pnpm consolidate:manifest` produce manifest válido
- ✅ Banner UI en `/datos-abiertos` y footer global muestran datos reales
- ✅ Workflow YAML parsea OK, actions todas v4 stable
- ✅ 282/282 tests verdes, typecheck clean en 3 paquetes

El sistema está listo. Falta solo el push al remoto + configuración
de permisos.

---

## Pre-requisitos

- Acceso `write` al repo remoto (e.g. `github.com/<owner>/radar-municipal`)
- `gh` CLI autenticado (`gh auth status` debe mostrar logged in)
- Acceso `Settings` del repo (admin o maintain role)
- Si usás Vercel para el web: Vercel proyecto conectado al repo (auto-deploy on merge a main)

---

## Paso 1 — Inicializar repo y push (si aún no está)

Si el directorio local no es un repo git:

```bash
cd "D:/Claude/Radar Municipal"
git init
git checkout -b main
git add -A
git commit -m "feat: initial commit (Sprint 1-29 consolidated)"
gh repo create <owner>/radar-municipal --source=. --public --push
```

Si ya hay un repo remoto pero no están los Sprints 27+28+29:

```bash
cd "D:/Claude/Radar Municipal"
git checkout -b sprint/29-activate-cron
git add packages/core/src/types/refresh.ts packages/core/src/types/contratacion.ts packages/core/src/types/index.ts packages/core/src/index.ts \
        packages/scraper/scripts/validate-data.ts packages/scraper/scripts/consolidate-manifest.ts packages/scraper/package.json \
        .github/workflows/monthly-refresh.yml .github/workflows/README.md \
        packages/web/src/lib/scoring-data/refresh.ts packages/web/src/lib/scoring-data/index.ts \
        packages/web/src/app/datos-abiertos/page.tsx packages/web/src/components/layout/Footer.tsx \
        CLAUDE.md DEPLOY.md scripts/activate-cron.sh \
        packages/web/src/data/auto-refresh-manifest.json
git commit -m "feat(sprint-27-28-29): monthly cron + refresh manifest UI

- Sprint 27: GitHub Actions workflow + validate-data + consolidate-manifest
- Sprint 28: banner /datos-abiertos + footer indicator
- Sprint 29: dry-run E2E + DEPLOY checklist + activate helper"
git push -u origin sprint/29-activate-cron
gh pr create --base main --title "feat: monthly refresh cron + UI freshness banner" \
  --body "Closes Sprint 27/28/29. Activates monthly data refresh via GitHub Actions."
```

Después: review del PR, merge a main.

---

## Paso 2 — Configurar permisos del workflow

GitHub bloquea por default que GitHub Actions cree PRs. Hay que habilitar:

**Settings → Actions → General → Workflow permissions:**

- [x] **Read and write permissions** (no "Read repository contents and packages permissions")
- [x] **Allow GitHub Actions to create and approve pull requests** ✓

**Settings → General → Pull Requests:**

- [x] **Allow auto-merge** ✓ (necesario para que el workflow auto-mergee si CI pasa)
- [x] **Automatically delete head branches** ✓ (recomendado: el branch `refresh/YYYY-MM-DD` se borra tras merge)

**Settings → Branches → Branch protection rules → main:**

Si tenés branch protection en main (recomendado para producción):

- [x] **Require status checks to pass before merging** ✓ — selecciona los checks de `ci.yml` (Lint+Type+Test+Build, E2E)
- [ ] **Require pull request reviews** — opcional. Si lo activás, auto-merge solo funciona después de aprobación. Para un proyecto con 1 maintainer alcance es OK desactivarlo.
- [x] **Allow GitHub Actions to bypass required pull request reviews** — necesario si tenés "Require reviews" + querés auto-merge. Settings → Branches → Branch protection rules → main → "Bypass list".

---

## Paso 3 — Trigger manual del primer run (smoke test)

El cron está configurado para `0 4 1 * *` (1° de cada mes 04:00 UTC).
NO esperes a que llegue: dispará una corrida manual ahora para validar
que todo funciona end-to-end con tu setup real.

```bash
cd "D:/Claude/Radar Municipal"
gh workflow run monthly-refresh
```

Después listá los runs:

```bash
gh run list --workflow=monthly-refresh --limit 5
```

Y mirá el último en vivo:

```bash
gh run watch
```

**Qué esperar (happy path, ~5 minutos):**

1. Job `refresh (compras)` — corre `refresh:pilar4` (~3 min) + `validate:data` (~5s)
2. Job `refresh (deuda)` — corre `refresh:deuda` (~1 min) + `validate:data` (~5s)
3. Job `consolidate` — descarga artifacts + corre `consolidate:manifest` con env real (~30s)
4. **PR creado** automáticamente: branch `refresh/YYYY-MM-DD`, título `chore(refresh): monthly data refresh YYYY-MM-DD`
5. CI corre sobre el PR (typecheck + tests + E2E, ~5-10 min)
6. Si CI pasa: PR auto-mergea (squash). Si Vercel está conectado, deploya automáticamente.

**Verificación post-merge:**

```bash
gh pr list --state merged --limit 1
gh run list --workflow=ci --limit 5
```

Y abrí el sitio en producción → `/datos-abiertos` → el banner debería
mostrar la fecha del run real (e.g. "hace 3 minutos").

---

## Paso 4 — Test del fallo gracioso (opcional pero recomendado)

Para confirmar que el fail-fast: false funciona, hacé un test:

```bash
# Editá temporalmente packages/scraper/src/cli/refresh-pilar4.ts
# Cambiá QUILMES_BASE = "http://datos.quilmes.gov.ar" por una URL inválida
# (e.g. "http://datos.invalid.local") y commiteá a un branch.
git checkout -b test/fail-isolation
# (edit el archivo)
git commit -am "test: simulate Quilmes outage"
git push -u origin test/fail-isolation

# Trigger manual del workflow desde ese branch
gh workflow run monthly-refresh --ref test/fail-isolation
```

**Qué esperar:**

- Job `refresh (compras)` falla (HTTP error)
- Job `refresh (deuda)` completa OK (5 municipios)
- Job `consolidate` corre (gracias a `if: always()`)
- **PR sin auto-merge** se abre con título `... (partial — compras failed)`
- **Issue creada** con label `refresh-failure-YYYY-MM-DD`, asignada al maintainer si pusiste el flag

Después limpiá:

```bash
git checkout main
git push origin --delete test/fail-isolation
gh pr close <PR number>      # cerrá el PR de test
gh issue close <issue number>   # cerrá la issue de test
```

---

## Paso 5 — Activar el schedule

Cuando el smoke test del Paso 3 funciona OK, **el schedule ya está
activo** automáticamente. No hay que hacer nada más. El workflow
correrá el 1° del próximo mes a las 04:00 UTC.

Para verificar el schedule:

```bash
gh workflow list
gh workflow view monthly-refresh
```

Si querés modificar el cron expression (e.g. semanal en vez de
mensual), editá `.github/workflows/monthly-refresh.yml` línea ~15:

```yaml
schedule:
  - cron: "0 4 1 * *"     # 1° del mes
  # - cron: "0 4 * * 0"   # cada domingo
  # - cron: "0 4 * * *"   # cada día
```

---

## Troubleshooting

### "El workflow no se dispara automáticamente"

GitHub Actions a veces atrasa los schedules ~5-30 min cuando hay alta
carga global. Si pasaron varias horas del 1° del mes y no corrió:

```bash
gh run list --workflow=monthly-refresh --limit 10
```

Si la última corrida es vieja (>30 días), trigger manual:

```bash
gh workflow run monthly-refresh
```

### "El PR no se auto-mergea"

Verificá:
- Settings → Actions → "Allow GitHub Actions to create and approve pull requests" ✓
- Settings → General → "Allow auto-merge" ✓
- CI passed en el PR (`gh pr view <num>`)
- Branch protection no requiere reviews (o GitHub Actions está en bypass)

### "El smoke test (validate:data) falla"

Inspeccioná qué archivo falló:

```bash
gh run view --log
# o local
pnpm --filter @radar-municipal/scraper validate:data
```

Probable causa: schema drift en una fuente upstream. Editá
`packages/scraper/scripts/validate-data.ts` para reflejar el nuevo
shape esperado, o el parser correspondiente.

### "El refresh script falla con timeout"

Default `FETCH_TIMEOUT_MS = 30_000` en cada refresh script. Si una
fuente está lenta, subílo:

```ts
// packages/scraper/src/cli/refresh-pilar4.ts
const FETCH_TIMEOUT_MS = 60_000;  // 60s en vez de 30
```

### "Quiero deshabilitar el cron temporalmente"

Settings → Actions → General → **Disable Actions** (afecta a todos los
workflows). O comentá el `schedule:` en el yml y hacé push:

```yaml
on:
  # schedule:
  #   - cron: "0 4 1 * *"
  workflow_dispatch:
```

---

## Verificación final post-deploy

Una vez activado, semanalmente revisá:

- [ ] `gh run list --workflow=monthly-refresh` muestra runs mensuales con status success
- [ ] `gh issue list --label refresh-failure` está vacío (sin fallos sin resolver)
- [ ] Sitio en producción `/datos-abiertos` muestra fecha reciente
- [ ] Footer global de cualquier página muestra dot verde

Si algo no está OK, los pasos de Troubleshooting cubren los casos más
frecuentes.
