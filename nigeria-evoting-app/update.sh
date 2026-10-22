#!/usr/bin/env bash
# Run after unzipping a new version over an existing project:
#   cd /workspaces/<repo>/nigeria-evoting-app && bash update.sh
# Installs new packages, updates the database tables (keeps your data) and restarts everything.
set -e
cd "$(dirname "$0")"
ROOT="$(pwd)"

sudo service postgresql start

echo "== Server packages =="
(cd "$ROOT/server" && npm install --no-audit --no-fund)

echo "== Database tables =="
(cd "$ROOT/server" && npx prisma db push && npx prisma generate)

echo "== Website packages =="
(cd "$ROOT/client" && npm install --no-audit --no-fund)

echo "== Restarting =="
bash "$ROOT/start.sh"
