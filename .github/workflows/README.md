# GitHub Actions workflows

Documentación de los workflows de CI/CD del proyecto.

---

## `ci.yml` — Continuous Integration

**Triggers**: push a `main`, pull requests contra `main`.

Corre type-check, vitest, build de Next.js, y E2E con Playwright. Es el
gate de cualquier merge.

---

## `monthly-refresh.yml` — Refresh mensual de datos

**Triggers**:
- `schedule: '0 4 1 * *'` — primer día de cada mes, 04:00 UTC (= 01:00 AR).
- `workflow_dispatch` — botón manual ("Run workflow") en la UI de GitHub.

**Qué hace**:

1. Corre los `refresh:*` scripts de `packages/scraper` en paralelo (matrix).
   Cada uno fetches data upstream (Quilmes CKAN, gobabierto, portales
   municipales con XLSX) y escribe a `packages/web/src/data/auto-*.json`.
2. Valida los JSONs producidos con `validate:data` (smoke test).
3. Consolida un `auto-refresh-manifest.json` global con el status de cada
   target (success / failed / skipped, duration, error).
4. Si hay cambios en `packages/web/src/data/`:
   - **Sin fallos** → abre PR y lo mergea inmediatamente (squash + delete
     branch). Vercel re-deploya en el merge.
   - **Con fallos parciales** → abre PR sin merge automático. El maintainer
     revisa antes de mergear.
5. Si algún target falló, crea una issue con label `refresh-failure` y
   link al run para investigación.

**Aislamiento**: `fail-fast: false` en la matrix. Si Quilmes está caído,
el job de Compras falla pero el de Deuda completa OK. Los JSONs de la
fuente que sí corrió SE commitean — los de la que falló retienen el
estado anterior (sin regresión silenciosa).

### ¿Por qué el merge es directo y no `--auto` con CI gating?

GitHub Actions tiene una protección contra loops infinitos: eventos
disparados por `GITHUB_TOKEN` (incluyendo `gh pr create`) **no triggerean
otros workflows**. Por eso el `pull_request` trigger del `ci.yml` NO
corre sobre los PRs creados por el cron. Sin CI checks pendientes,
`gh pr merge --auto` queda en limbo (espera checks que nunca llegan).

Solución pragmática: mergear directo. Es seguro porque:

1. `validate:data` (Sprint 27) ya valida shape + counts del JSON antes
   de commitear. Si un refresh produce data corrupta, el job de
   refresh falla ANTES de llegar al merge.
2. CI extra (typecheck, tests, build, E2E) NO encuentra problemas en
   cambios de JSON estáticos. Los datos son consumidos por el web pero
   no tipados a nivel runtime — un schema drift sutil pasa CI igual que
   pasa validate:data.
3. Si validate:data deja pasar un bug, el siguiente refresh lo detecta
   (issue automática) y lo arreglamos en el próximo ciclo.

Si en el futuro queremos CI gate-ando los PRs del cron:

- **Opción**: crear un PAT con scope `repo`, guardarlo como secret
  `BOT_TOKEN`, y cambiar el yml para usar ese token en `gh pr create`
  en vez de `GITHUB_TOKEN`. Eventos disparados por PAT SÍ activan
  workflows.
- **Costo**: medio (~30 min de setup + rotación periódica del PAT).
- **Cuándo**: si eventualmente un schema drift bug llega a producción
  y `validate:data` no lo detectó.

---

### Cómo agregar un nuevo refresh script

Sprint 27 dejó la convención declarativa. Para enchufar un nuevo
target (e.g. `refresh:normativa-sibom`):

1. **Script**: crear `packages/scraper/src/cli/refresh-X.ts` siguiendo
   el contrato de `refresh-pilar4.ts`:
   - Idempotente.
   - Escribe directo a `packages/web/src/data/auto-X.json` y
     `auto-X-manifest.json`.
   - Maneja fallos por fuente con try/catch (no aborta todo el script).
2. **package.json**: agregar `"refresh:X": "tsx src/cli/refresh-X.ts"` en
   `packages/scraper/package.json`.
3. **Matrix**: agregar a `monthly-refresh.yml`:
   ```yaml
   strategy:
     matrix:
       include:
         - target: compras
           script: "refresh:pilar4"
         - target: deuda
           script: "refresh:deuda"
         - target: X                 # ← nueva entry
           script: "refresh:X"
   ```
4. **Validador**: agregar el shape esperado de `auto-X.json` en
   `packages/scraper/scripts/validate-data.ts` (push una entry a `SPECS`
   con `arrayWithRequiredFields(...)` o un validador custom).
5. **Consolidate**: agregar el target a `TARGETS[]` en
   `packages/scraper/scripts/consolidate-manifest.ts` (target, script,
   manifestPath, dataPath).

Cero cambios a la lógica del workflow. Cero cambios al PR/issue handling.

---

### Debug / re-run manual

```bash
# Trigger un run manual (gh CLI):
gh workflow run monthly-refresh

# Listar runs recientes:
gh run list --workflow=monthly-refresh

# Ver log del último run:
gh run view --log

# Watch un run en curso:
gh run watch
```

Si un mes el cron falló y el bug ya está fixed (e.g. URL upstream
volvió a estar viva, parser actualizado), correr `gh workflow run
monthly-refresh` para re-trigger sin esperar al próximo mes.

---

### Variables y secrets

El workflow usa solo `GITHUB_TOKEN` (provisto automáticamente por
GitHub Actions). NO hay secrets adicionales. Si en el futuro se quiere
notificar via Slack/Discord, agregar el webhook secret y un step
adicional al final del job consolidate.

---

### Permisos

Para que el workflow pueda crear PRs y mergearlos:
- Settings → Actions → General → Workflow permissions: "Read and write".
- Settings → Actions → General → "Allow GitHub Actions to create and
  approve pull requests": ✓
- Settings → General → Pull Requests → "Allow auto-merge": ✓ (si querés
  el auto-merge).
