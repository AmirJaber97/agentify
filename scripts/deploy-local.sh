#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/ajhosts/agentify"
PUBLIC_URL="${AGENTIFY_PUBLIC_URL:-https://agentify.tess-it.net/}"
LOCAL_URL="${AGENTIFY_LOCAL_URL:-http://127.0.0.1:8787/}"

cd "$APP_DIR"

printf '[agentify-deploy] repo=%s commit=%s\n' "$APP_DIR" "$(git rev-parse --short HEAD)"
printf '[agentify-deploy] installing dependencies\n'
npm ci

printf '[agentify-deploy] generating types\n'
npm run gen:types

printf '[agentify-deploy] typechecking\n'
npm run typecheck

printf '[agentify-deploy] testing\n'
npm test

printf '[agentify-deploy] building\n'
npm run build

printf '[agentify-deploy] restarting service\n'
sudo -n systemctl restart agentify.service
sleep 2
systemctl is-active --quiet agentify.service

printf '[agentify-deploy] verifying local endpoint\n'
curl -fsS --max-time 10 -A 'Mozilla/5.0 AgentifyDeploy/1.0' "$LOCAL_URL" >/dev/null

printf '[agentify-deploy] verifying public endpoint\n'
curl -fsS --max-time 20 -A 'Mozilla/5.0 AgentifyDeploy/1.0' "$PUBLIC_URL" >/dev/null

printf '[agentify-deploy] ok commit=%s\n' "$(git rev-parse --short HEAD)"
