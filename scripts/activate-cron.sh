#!/usr/bin/env bash
# scripts/activate-cron.sh
#
# Sprint 29 — Helper interactivo para activar el cron mensual del
# proyecto Radar Municipal. Guía al operador a través del checklist
# de DEPLOY.md con prompts y verificaciones.
#
# Uso:
#   bash scripts/activate-cron.sh
#
# Pre-requisitos:
#   - gh CLI autenticado (gh auth status)
#   - estar en un repo git con remote
#   - permisos admin/maintain en el repo

set -euo pipefail

# Colores
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
RESET="\033[0m"

step() { echo -e "\n${BLUE}━━━ $1${RESET}"; }
ok()   { echo -e "${GREEN}✓${RESET} $1"; }
warn() { echo -e "${YELLOW}!${RESET} $1"; }
fail() { echo -e "${RED}✗${RESET} $1"; exit 1; }

confirm() {
  read -rp "$(echo -e "${YELLOW}?${RESET} $1 [y/N] ")" answer
  [[ "$answer" =~ ^[Yy]$ ]]
}

# ─────────────────────────────────────────
# Paso 0 — pre-flight checks
# ─────────────────────────────────────────

step "Paso 0 — Pre-flight checks"

if ! command -v gh &>/dev/null; then
  fail "gh CLI no instalada. Instalala desde https://cli.github.com/"
fi
ok "gh CLI presente: $(gh --version | head -1)"

if ! gh auth status &>/dev/null; then
  fail "gh CLI no autenticada. Corré: gh auth login"
fi
ok "gh CLI autenticada"

if ! git rev-parse --git-dir &>/dev/null; then
  fail "No es un repo git. Inicializá primero: git init && git remote add origin <url>"
fi
ok "Repo git inicializado"

REMOTE_URL="$(git remote get-url origin 2>/dev/null || echo '')"
if [[ -z "$REMOTE_URL" ]]; then
  fail "Sin remote 'origin' configurado. Corré: git remote add origin <url>"
fi
ok "Remote: $REMOTE_URL"

REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo '')"
if [[ -z "$REPO" ]]; then
  fail "No se pudo determinar el repo via gh. Verificá que el remote sea github.com"
fi
ok "Repo GH: $REPO"

# ─────────────────────────────────────────
# Paso 1 — verificar workflow committeado
# ─────────────────────────────────────────

step "Paso 1 — Verificar que monthly-refresh.yml está en main"

if ! git show main:.github/workflows/monthly-refresh.yml &>/dev/null; then
  warn "Workflow NO está en main todavía. Pasos previos:"
  echo "  1. git checkout -b sprint/29-activate-cron"
  echo "  2. git add -A && git commit -m 'feat: activate monthly cron'"
  echo "  3. git push -u origin sprint/29-activate-cron"
  echo "  4. gh pr create + merge a main"
  echo ""
  if ! confirm "¿Ya hiciste merge del workflow a main?"; then
    fail "Abortando. Volvé a correr cuando esté en main."
  fi
fi
ok "Workflow está en main"

# ─────────────────────────────────────────
# Paso 2 — Permisos del repo
# ─────────────────────────────────────────

step "Paso 2 — Permisos del workflow"

echo "Verificá manualmente en el browser:"
echo "  → https://github.com/$REPO/settings/actions"
echo ""
echo "Settings → Actions → General → Workflow permissions:"
echo "  [x] Read and write permissions"
echo "  [x] Allow GitHub Actions to create and approve pull requests"
echo ""
echo "Settings → General → Pull Requests:"
echo "  [x] Allow auto-merge"
echo "  [x] Automatically delete head branches"
echo ""
if ! confirm "¿Configuraste los permisos?"; then
  fail "Abortando. Configurá permisos y volvé a correr."
fi
ok "Permisos configurados"

# ─────────────────────────────────────────
# Paso 3 — Trigger manual
# ─────────────────────────────────────────

step "Paso 3 — Trigger manual del primer run"

if ! confirm "¿Disparar el workflow ahora? (~5-10 minutos)"; then
  echo "OK, lo podés disparar manualmente con: gh workflow run monthly-refresh"
  exit 0
fi

gh workflow run monthly-refresh
ok "Workflow disparado"

echo ""
echo "Watching run en vivo (Ctrl+C para salir, el run sigue corriendo)..."
sleep 3
gh run watch || true

# ─────────────────────────────────────────
# Paso 4 — Verificación post-run
# ─────────────────────────────────────────

step "Paso 4 — Verificación post-run"

LAST_STATUS="$(gh run list --workflow=monthly-refresh --limit 1 --json status,conclusion -q '.[0] | "\(.status) (\(.conclusion // "running"))"')"
ok "Status del último run: $LAST_STATUS"

LAST_PR="$(gh pr list --search 'in:title chore(refresh)' --state all --limit 1 --json number,title,state -q '.[0]' 2>/dev/null || echo '{}')"
if [[ "$LAST_PR" != "{}" ]] && [[ -n "$LAST_PR" ]]; then
  ok "Último PR de refresh: $LAST_PR"
else
  warn "No se encontró PR de refresh. Si el run aún corre, esperá."
fi

# ─────────────────────────────────────────
# Resumen
# ─────────────────────────────────────────

step "Resumen"

echo "Cron activado. Próximas corridas automáticas:"
echo "  - Schedule: 0 4 1 * * (1° del mes, 04:00 UTC = 01:00 AR)"
echo "  - Trigger manual cuando quieras: gh workflow run monthly-refresh"
echo ""
echo "Verificación periódica:"
echo "  - gh run list --workflow=monthly-refresh"
echo "  - gh issue list --label refresh-failure"
echo "  - Abrir tu sitio /datos-abiertos en producción"
echo ""
ok "Listo."
