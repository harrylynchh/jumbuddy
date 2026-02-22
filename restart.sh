#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=== JumBud Restart ==="

# 1. Stop everything and wipe volumes (fresh DB every time)
echo ""
echo "--- Stopping Docker services + wiping DB volume ---"
docker compose -f "$ROOT/docker-compose.yml" down -v --remove-orphans 2>/dev/null || true

# 2. Rebuild and start
echo ""
echo "--- Starting all services ---"
docker compose -f "$ROOT/docker-compose.yml" up --build -d

# 3. Wait for Supabase Auth to be ready (GoTrue needs to run its internal migrations first)
echo ""
echo "--- Waiting for Supabase Auth ---"
for i in $(seq 1 30); do
  if curl -sf -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" http://localhost:10002/auth/v1/health > /dev/null 2>&1; then
    echo "Supabase Auth is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: Supabase Auth did not become ready in time."
    echo "Check logs: docker compose logs auth"
    exit 1
  fi
  sleep 2
done

# Wait for PostgREST
for i in $(seq 1 15); do
  if curl -sf -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" http://localhost:10002/rest/v1/ > /dev/null 2>&1; then
    echo "Supabase REST is ready."
    break
  fi
  if [ "$i" -eq 15 ]; then
    echo "WARNING: Supabase REST not responding yet. Continuing anyway..."
  fi
  sleep 2
done

# 4. Run ALL migration files in order against the fresh DB
echo ""
echo "--- Running migrations ---"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "  Applying $(basename "$f")..."
  docker compose -f "$ROOT/docker-compose.yml" exec -T db \
    psql -U postgres -d postgres < "$f"
done
echo "All migrations applied."

# 5. Seed data
echo ""
echo "--- Seeding data ---"
if [ ! -d "$ROOT/server/venv" ]; then
  echo "Creating virtualenv..."
  python3 -m venv "$ROOT/server/venv"
  "$ROOT/server/venv/bin/pip" install -q -r "$ROOT/server/requirements.txt"
fi
"$ROOT/server/venv/bin/python3" "$ROOT/scripts/reset_and_seed.py"

# 6. Health checks
echo ""
echo "--- Health checks ---"
if curl -sf http://localhost:10000/health > /dev/null 2>&1; then
  echo "Flask server:     http://localhost:10000  OK"
else
  echo "Flask server:     http://localhost:10000  (starting up...)"
fi
echo "React web:        http://localhost:10001"
echo "Supabase API:     http://localhost:10002"
echo "Supabase Studio:  http://localhost:10003"
echo "PostgreSQL:       localhost:10005"

echo ""
echo "=== Restart complete ==="
echo "Login with: professor@jumbud.test / testpass123"
