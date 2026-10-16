#!/bin/bash
# Prepares Claude Code cloud sessions to run the NarcoGuard gate (lint, typecheck, unit, build, PWA tests).
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
persist() { [ -n "${CLAUDE_ENV_FILE:-}" ] && echo "$1" >> "$CLAUDE_ENV_FILE" || true; }

# The project requires Node 24 (.nvmrc, engines); cloud images may default to another major.
required_major="$(tr -dc '0-9' < .nvmrc)"
current_major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "$current_major" != "$required_major" ]; then
  for nvm_dir in "${NVM_DIR:-}" /opt/nvm "$HOME/.nvm"; do
    if [ -n "$nvm_dir" ] && [ -s "$nvm_dir/nvm.sh" ]; then
      export NVM_DIR="$nvm_dir"
      # shellcheck disable=SC1091
      . "$NVM_DIR/nvm.sh"
      nvm install "$required_major" >/dev/null
      nvm use "$required_major" >/dev/null
      persist "export PATH=\"$(dirname "$(nvm which "$required_major")"):\$PATH\""
      break
    fi
  done
fi
echo "[session-start] node $(node -v), npm $(npm -v)"

# Install exactly what package-lock.json specifies (idempotent; reuses the cached container state).
npm install --no-audit --no-fund
echo "[session-start] dependencies installed"

# Use the preinstalled Chromium when Playwright's bundled revision is not present.
expected_chromium="$(npx --no-install playwright install --dry-run chromium 2>/dev/null | awk '/Install location/ {print $3; exit}')"
if [ -x /opt/pw-browsers/chromium ] && { [ -z "$expected_chromium" ] || [ ! -d "$expected_chromium" ]; }; then
  persist "export PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium"
  echo "[session-start] Playwright will use /opt/pw-browsers/chromium"
fi
