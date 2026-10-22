#!/usr/bin/env bash
# Starts PostgreSQL, the server and the website in the background.
# Run it again any time the Codespace has gone to sleep:   bash start.sh
cd "$(dirname "$0")"
ROOT="$(pwd)"
mkdir -p "$ROOT/.logs"

sudo service postgresql start

pkill -f "src/index.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

(cd "$ROOT/server" && nohup npm run dev > "$ROOT/.logs/server.log" 2>&1 &)
(cd "$ROOT/client" && nohup npm run dev > "$ROOT/.logs/client.log" 2>&1 &)

echo "Starting... (about 8 seconds)"
sleep 8
echo "---- server ----";  tail -n 4 "$ROOT/.logs/server.log"
echo "---- website ----"; tail -n 4 "$ROOT/.logs/client.log"
echo
if [ -n "$CODESPACE_NAME" ]; then
  echo "Open your site here:"
  echo "  https://${CODESPACE_NAME}-5173.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
fi
echo "If something looks wrong, show me:  tail -n 30 $ROOT/.logs/server.log"
