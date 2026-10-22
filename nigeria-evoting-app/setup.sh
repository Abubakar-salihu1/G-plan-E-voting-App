#!/usr/bin/env bash
# One-time setup for a fresh Codespace. Safe to run again: it skips anything already done.
#   cd /workspaces/E-voting-App/nigeria-evoting-app && SEED_ADMIN_PASSWORD=YourAdminPassword1 bash setup.sh
set -e
cd "$(dirname "$0")"
ROOT="$(pwd)"

echo "== 1/6  PostgreSQL =="
if ! command -v psql >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq postgresql
fi
sudo service postgresql start
cat > /tmp/naijavote-db.sh <<'SQL'
psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='naijavote'" | grep -q 1 || psql -c "CREATE USER naijavote WITH PASSWORD 'naijavote_dev_pw' CREATEDB;"
psql -tAc "SELECT 1 FROM pg_database WHERE datname='naijavote'" | grep -q 1 || psql -c "CREATE DATABASE naijavote OWNER naijavote;"
SQL
chmod 755 /tmp/naijavote-db.sh
sudo su postgres -c "bash /tmp/naijavote-db.sh"

echo "== 2/6  Server packages =="
cd "$ROOT/server"
npm install --no-audit --no-fund

echo "== 3/6  Secret keys (.env) =="
node scripts/setup-env.js

echo "== 4/6  Email sending =="
if grep -q '^SMTP_PASS=.\+' .env; then
  echo "Email already configured."
else
  read -r -p "Gmail address that sends the codes (Enter to skip email): " EMAIL_ADDR || true
  if [ -n "$EMAIL_ADDR" ]; then
    read -r -s -p "Its 16-letter Google App Password (hidden as you paste): " EMAIL_PASS || true
    echo
    EMAIL_ADDR="$EMAIL_ADDR" EMAIL_PASS="$EMAIL_PASS" node scripts/set-email.js || true
  else
    echo "Skipped. Codes will show on screen instead of being emailed."
  fi
fi

echo "== 5/6  Database tables and admin account =="
npx prisma db push --skip-generate
npx prisma generate
npm run db:seed

echo "== 6/6  Website packages =="
cd "$ROOT/client"
npm install --no-audit --no-fund

echo
echo "All set. Start everything with:   bash start.sh"
