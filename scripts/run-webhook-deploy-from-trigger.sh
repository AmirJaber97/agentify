#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/ajhosts/agentify"
TRIGGER="$APP_DIR/.git/webhook-deploy.trigger"
LOG="$APP_DIR/.git/agentify-webhook-deploy.log"

if [ ! -f "$TRIGGER" ]; then
  echo "[agentify-systemd-deploy] trigger file missing: $TRIGGER" >>"$LOG"
  exit 0
fi

# Read metadata from the trigger without exposing secrets. The trigger is
# written by the BFF after GitHub HMAC verification and watched by systemd.path.
readarray -t META < <(python3 - "$TRIGGER" <<'PY'
import json, shlex, sys
try:
    data=json.load(open(sys.argv[1]))
except Exception:
    data={}
print('GITHUB_DELIVERY_ID=' + shlex.quote(str(data.get('delivery') or 'systemd-trigger')))
print('GITHUB_AFTER_SHA=' + shlex.quote(str(data.get('after') or '')))
PY
)

DELIVERY="${META[0]#GITHUB_DELIVERY_ID=}"
AFTER="${META[1]#GITHUB_AFTER_SHA=}"

# Keep git/npm/build artifacts owned by ajhosts, but run outside the sandboxed
# agentify.service cgroup so deploy-local.sh can restart agentify.service.
exec runuser -u ajhosts -- env GITHUB_DELIVERY_ID="$DELIVERY" GITHUB_AFTER_SHA="$AFTER" "$APP_DIR/scripts/deploy-from-webhook.sh"
