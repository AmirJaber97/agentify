#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/ajhosts/agentify"
LOG="$APP_DIR/.git/agentify-webhook-deploy.log"
LOCK="$APP_DIR/.git/agentify-webhook-deploy.lock"

exec >>"$LOG" 2>&1
printf '\n==== webhook deploy %s delivery=%s after=%s ====\n' "$(date -Is)" "${GITHUB_DELIVERY_ID:-unknown}" "${GITHUB_AFTER_SHA:-unknown}"

exec 9>"$LOCK"
if ! flock -n 9; then
  echo '[agentify-webhook] another deploy is already running; exiting'
  exit 0
fi

cd "$APP_DIR"

echo '[agentify-webhook] fetching origin/main'
git fetch origin main
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse origin/main)"
if [ "$LOCAL" = "$REMOTE" ]; then
  echo "[agentify-webhook] already at $LOCAL; nothing to deploy"
  exit 0
fi

echo "[agentify-webhook] updating $LOCAL -> $REMOTE"
AGENTIFY_SKIP_DEPLOY_HOOK=1 git merge --ff-only origin/main

echo '[agentify-webhook] deploying merged commit'
"$APP_DIR/scripts/deploy-local.sh"

echo "[agentify-webhook] deployed $(git rev-parse --short HEAD)"
