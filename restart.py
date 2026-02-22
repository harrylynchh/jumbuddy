#!/usr/bin/env python3
"""Cross-platform restart script. Wipes DB, rebuilds, runs migrations, seeds."""

import os
import sys
import glob
import time
import shutil
import subprocess
import urllib.request
import urllib.error

ROOT = os.path.dirname(os.path.abspath(__file__))
COMPOSE_FILE = os.path.join(ROOT, "docker-compose.yml")
MIGRATIONS_DIR = os.path.join(ROOT, "supabase", "migrations")
SEED_SCRIPT = os.path.join(ROOT, "scripts", "reset_and_seed.py")
VENV_DIR = os.path.join(ROOT, "server", "venv")
REQUIREMENTS = os.path.join(ROOT, "server", "requirements.txt")

ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"


def run(cmd, **kwargs):
    print(f"  $ {cmd}")
    return subprocess.run(cmd, shell=True, **kwargs)


def wait_for_url(url, label, headers=None, max_attempts=30, interval=2):
    print(f"  Waiting for {label}...")
    for i in range(max_attempts):
        try:
            req = urllib.request.Request(url, headers=headers or {})
            urllib.request.urlopen(req, timeout=3)
            print(f"  {label} is ready.")
            return True
        except (urllib.error.URLError, OSError):
            pass
        time.sleep(interval)
    print(f"  WARNING: {label} did not become ready in time.")
    return False


def docker_compose(args):
    return run(f'docker compose -f "{COMPOSE_FILE}" {args}')


def venv_python():
    if sys.platform == "win32":
        return os.path.join(VENV_DIR, "Scripts", "python.exe")
    return os.path.join(VENV_DIR, "bin", "python3")


def venv_pip():
    if sys.platform == "win32":
        return os.path.join(VENV_DIR, "Scripts", "pip.exe")
    return os.path.join(VENV_DIR, "bin", "pip")


def main():
    print("=== CodeActivity Restart ===\n")

    # 1. Stop + wipe
    print("--- Stopping Docker services + wiping DB volume ---")
    docker_compose("down -v --remove-orphans")

    # 2. Rebuild + start
    print("\n--- Starting all services ---")
    docker_compose("up --build -d")

    # 3. Wait for Supabase
    print("\n---  Waiting for Kong ---")
    wait_for_url(
    "http://localhost:10002",
    "Kong",
    headers={"apikey": ANON_KEY},
    max_attempts=30,
    )
    print("\n--- Waiting for Supabase ---")
    auth_ok = wait_for_url(
        "http://localhost:10002/auth/v1/health",
        "Supabase Auth",
        headers={"apikey": ANON_KEY},
    )
    if not auth_ok:
        print("ERROR: Auth not ready. Check: docker compose logs auth")
        sys.exit(1)

    wait_for_url(
        "http://localhost:10002/rest/v1/",
        "Supabase REST",
        headers={"apikey": ANON_KEY},
        max_attempts=15,
    )

    # 4. Run ALL migrations in order
    print("\n--- Running migrations ---")
    migration_files = sorted(glob.glob(os.path.join(MIGRATIONS_DIR, "*.sql")))
    for f in migration_files:
        name = os.path.basename(f)
        print(f"  Applying {name}...")
        with open(f, "r") as sql_file:
            subprocess.run(
                f'docker compose -f "{COMPOSE_FILE}" exec -T db psql -U postgres -d postgres',
                shell=True,
                input=sql_file.read(),
                text=True,
            )
    print("All migrations applied.")

    # 5. Ensure venv + seed
    print("\n--- Seeding data ---")
    py = venv_python()
    if not os.path.exists(py):
        print("  Creating virtualenv...")
        run(f'"{sys.executable}" -m venv "{VENV_DIR}"')
        run(f'"{venv_pip()}" install -q -r "{REQUIREMENTS}"')
    run(f'"{py}" "{SEED_SCRIPT}"')

    # 6. Health checks
    print("\n--- Health checks ---")
    try:
        urllib.request.urlopen("http://localhost:10000/health", timeout=3)
        print("Flask server:     http://localhost:10000  OK")
    except (urllib.error.URLError, OSError):
        print("Flask server:     http://localhost:10000  (starting up...)")

    print("React web:        http://localhost:10001")
    print("Supabase API:     http://localhost:10002")
    print("Supabase Studio:  http://localhost:10003")
    print("PostgreSQL:       localhost:10005")
    print("\n=== Restart complete ===")
    print("Login with: professor@codeactivity.test / testpass123")


if __name__ == "__main__":
    main()
