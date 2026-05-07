# NEXT-STEPS.md — Activación del cron en producción

**Estado al cierre de Sprint 30**:

- ✅ Repo git local inicializado en `D:\Claude\Radar Municipal`
- ✅ Initial commit hecho: `acc634d` con 323 archivos en branch `main`
- ✅ `.gitignore` configurado (excluye `node_modules`, `.next`, `.claude`, `data/geometry/_tmp`, etc.)
- ✅ Working tree limpio
- ⏳ **Falta: push al remote + activación del cron** (requiere `gh` autenticado)

`gh` CLI no estaba disponible en el entorno donde se preparó el repo. Esta página tiene los comandos exactos para terminar la activación desde tu máquina (Windows / WSL / Mac / Linux).

---

## Paso 1 — Instalá / autenticá `gh` (si no lo tenés)

**Windows (PowerShell o cmd):**
```powershell
winget install --id GitHub.cli
gh auth login
```

**Mac (homebrew):**
```bash
brew install gh
gh auth login
```

**Linux:** ver https://github.com/cli/cli#installation

Confirmá que está OK:
```bash
gh auth status
```

Debería decir `✓ Logged in to github.com as <usuario>`.

---

## Paso 2 — Crear el repo remoto + push

Decidí el nombre del repo (público o privado). Sugerencia: `radar-municipal`.

**Opción A — repo nuevo público:**
```bash
cd "D:/Claude/Radar Municipal"
gh repo create radar-municipal --source=. --public --remote=origin --push
```

**Opción B — repo nuevo privado:**
```bash
cd "D:/Claude/Radar Municipal"
gh repo create radar-municipal --source=. --private --remote=origin --push
```

**Opción C — ya tenés el repo creado en GitHub:**
```bash
cd "D:/Claude/Radar Municipal"
git remote add origin https://github.com/<usuario>/radar-municipal.git
git push -u origin main
```

Verificá:
```bash
git remote -v
gh repo view --web
```

---

## Paso 3 — Configurar permisos del workflow

Settings del repo (browser):

**`Settings → Actions → General → Workflow permissions`:**
- [x] Read and write permissions
- [x] Allow GitHub Actions to create and approve pull requests

**`Settings → General → Pull Requests`:**
- [x] Allow auto-merge
- [x] Automatically delete head branches

URL directa (ajustá el slug):
```
https://github.com/<usuario>/radar-municipal/settings/actions
```

---

## Paso 4 — Trigger manual del primer run

```bash
cd "D:/Claude/Radar Municipal"
gh workflow run monthly-refresh
gh run watch
```

**Qué esperar (~5-10 minutos):**

1. Job `refresh (compras)` corre `pnpm refresh:pilar4` (~3 min) + `validate:data`
2. Job `refresh (deuda)` corre `pnpm refresh:deuda` (~1 min) + `validate:data`
3. Job `consolidate` agrega manifests + crea PR + (si CI pasa) auto-mergea
4. Vercel re-deploya automáticamente si está conectado

**Verificación post-merge:**
```bash
gh pr list --state merged --limit 1
gh run list --workflow=ci --limit 1
```

Y abrí el sitio en producción → `/datos-abiertos` → el banner debería mostrar la fecha del run real.

---

## Alternativa — usar el helper script

```bash
cd "D:/Claude/Radar Municipal"
bash scripts/activate-cron.sh
```

El script automatiza pre-flight checks + prompts + watch del run. Equivalente a los Pasos 2-4 de arriba con confirmaciones interactivas.

---

## Si algo falla

Ver `DEPLOY.md` sección **Troubleshooting**. Casos cubiertos:
- Workflow no se dispara automáticamente
- PR no se auto-mergea
- Smoke test (validate:data) falla
- Refresh script timeout
- Cómo deshabilitar cron temporalmente

---

## Una vez activado

El cron correrá automáticamente el 1° de cada mes 04:00 UTC (= 01:00 AR). No tenés que hacer nada más.

Verificación periódica recomendada:
```bash
# Listar runs del cron mensual
gh run list --workflow=monthly-refresh

# Ver issues de fallo si las hay
gh issue list --label refresh-failure
```

Si una fuente falla, la issue se crea automáticamente. Cuando la arregles (e.g. updated parser por schema drift), trigger manual:
```bash
gh workflow run monthly-refresh
```

---

## Status del repo local

```
$ git log --oneline -1
acc634d feat: initial commit (Sprints 1-29 consolidated)

$ git status
On branch main
nothing to commit, working tree clean

$ git ls-files | wc -l
323 files
```

Cualquier cambio futuro (refresh scripts, tests, UI) seguirá el flow normal: branch → commit → PR → CI → merge → Vercel deploy.
