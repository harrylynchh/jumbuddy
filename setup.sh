#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=== JumBud Setup ==="

# Check for .env
if [ ! -f "$ROOT/.env" ]; then
  cp "$ROOT/.env.example" "$ROOT/.env"
  echo "Created .env from .env.example — fill in your Supabase credentials before continuing."
  exit 1
fi

# Python setup
echo ""
echo "--- Python dependencies ---"
if [ ! -d "$ROOT/server/venv" ]; then
  python3 -m venv "$ROOT/server/venv"
  echo "Created virtualenv at server/venv"
fi

source "$ROOT/server/venv/bin/activate"
pip install -q -r "$ROOT/server/requirements.txt"
echo "Python dependencies installed."

# Node setup (web)
echo ""
echo "--- Web dependencies ---"
if command -v npm &> /dev/null; then
  (cd "$ROOT/web" && npm install)
  echo "Web dependencies installed."
else
  echo "SKIP: npm not found — install Node.js to set up the frontend."
fi

# Node setup (vscode extension)
echo ""
echo "--- VSCode extension dependencies ---"
if command -v npm &> /dev/null; then
  (cd "$ROOT/vscode-extension" && npm install)
  echo "VSCode extension dependencies installed."
fi

# Quick smoke test — import Flask app
echo ""
echo "--- Smoke test ---"
python3 -c "from app import create_app; app = create_app(); print('Flask app created OK')" \
  --import-site 2>/dev/null \
  || (cd "$ROOT/server" && python3 -c "from app import create_app; app = create_app(); print('Flask app created OK')")

echo ""
echo "=== Setup complete ==="
echo "Next steps:"
echo "  1. Fill in .env with your Supabase credentials"
echo "  2. Run the migration SQL in your Supabase dashboard"
echo "  3. Run: source server/venv/bin/activate && cd server && pytest tests/ -v"
echo "  4. Or run: ./run.sh to start with Docker"
