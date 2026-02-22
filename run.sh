#!/usr/bin/env bash
# Usage: ./run.sh            (dev — localhost)
#        ./run.sh --staging   (staging — N.sethlupo.com)
#        ./run.sh -s          (same)
set -euo pipefail
cd "$(dirname "$0")"

STAGING=false
for arg in "$@"; do
  case "$arg" in
    --staging|-s) STAGING=true ;;
  esac
done

if [ "$STAGING" = true ]; then
  echo "=== JumBuddy Run (STAGING — *.sethlupo.com) ==="
  export COMPOSE_FILE="docker-compose.yml:docker-compose.staging.yml"
else
  echo "=== JumBuddy Run (DEV — localhost) ==="
  export COMPOSE_FILE="docker-compose.yml"
fi

python3 scripts/run.py

if [ "$STAGING" = true ]; then
  echo ""
  echo "Staging URLs:"
  echo "  Web:         https://10001.sethlupo.com"
  echo "  API:         https://10000.sethlupo.com"
  echo "  Supabase:    https://10002.sethlupo.com"
  echo "  Studio:      https://10003.sethlupo.com"
fi
