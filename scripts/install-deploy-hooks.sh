#!/usr/bin/env bash
set -euo pipefail

REPO="$(git rev-parse --show-toplevel)"
HOOKS="$REPO/.git/hooks"
DEPLOY="$REPO/scripts/deploy-local.sh"

mkdir -p "$HOOKS"

cat > "$HOOKS/post-commit" <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
REPO="$(git rev-parse --show-toplevel)"
LOG="$REPO/.git/agentify-deploy.log"
{
  if [ "${AGENTIFY_SKIP_DEPLOY_HOOK:-}" = "1" ]; then
    echo "==== post-commit $(date -Is) skipped by AGENTIFY_SKIP_DEPLOY_HOOK ===="
    exit 0
  fi
  echo "==== post-commit $(date -Is) $(git rev-parse --short HEAD) ===="
  "$REPO/scripts/deploy-local.sh"
} >>"$LOG" 2>&1 || {
  echo "Agentify post-commit deploy failed. See $LOG" >&2
  exit 0
}
HOOK

cat > "$HOOKS/post-merge" <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
REPO="$(git rev-parse --show-toplevel)"
LOG="$REPO/.git/agentify-deploy.log"
{
  if [ "${AGENTIFY_SKIP_DEPLOY_HOOK:-}" = "1" ]; then
    echo "==== post-merge $(date -Is) skipped by AGENTIFY_SKIP_DEPLOY_HOOK ===="
    exit 0
  fi
  echo "==== post-merge $(date -Is) $(git rev-parse --short HEAD) ===="
  "$REPO/scripts/deploy-local.sh"
} >>"$LOG" 2>&1 || {
  echo "Agentify post-merge deploy failed. See $LOG" >&2
  exit 0
}
HOOK

chmod +x "$DEPLOY" "$HOOKS/post-commit" "$HOOKS/post-merge"

echo "Installed Agentify deploy hooks:"
echo "  $HOOKS/post-commit"
echo "  $HOOKS/post-merge"
echo "Logs: $REPO/.git/agentify-deploy.log"
