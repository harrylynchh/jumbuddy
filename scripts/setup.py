#!/usr/bin/env python3
"""
Cross-platform setup script.
Ensures .env exists, creates venv, installs all dependencies.
"""

import os
import sys
import shutil
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VENV_DIR = os.path.join(ROOT, "server", "venv")
REQUIREMENTS = os.path.join(ROOT, "server", "requirements.txt")


def run(cmd, **kwargs):
    print(f"  $ {cmd}")
    return subprocess.run(cmd, shell=True, **kwargs)


def venv_python():
    if sys.platform == "win32":
        return os.path.join(VENV_DIR, "Scripts", "python.exe")
    return os.path.join(VENV_DIR, "bin", "python3")


def venv_pip():
    if sys.platform == "win32":
        return os.path.join(VENV_DIR, "Scripts", "pip.exe")
    return os.path.join(VENV_DIR, "bin", "pip")


def main():
    print("=== JumBud Setup ===\n")

    # .env
    env_file = os.path.join(ROOT, ".env")
    env_example = os.path.join(ROOT, ".env.example")
    if not os.path.exists(env_file):
        shutil.copy2(env_example, env_file)
        print("Created .env from .env.example")

    # Docker check
    if not shutil.which("docker"):
        print("WARNING: Docker not found. Install from https://docker.com")

    # Python venv + deps
    print("--- Python dependencies ---")
    py = venv_python()
    if not os.path.exists(py):
        print("  Creating virtualenv...")
        run(f'"{sys.executable}" -m venv "{VENV_DIR}"')
    run(f'"{venv_pip()}" install -q -r "{REQUIREMENTS}"')
    print("  Python dependencies installed.")

    # Node deps (web)
    print("\n--- Web dependencies ---")
    if shutil.which("npm"):
        run(f'npm install --prefix "{os.path.join(ROOT, "web")}"')
        print("  Web dependencies installed.")
    else:
        print("  SKIP: npm not found — install Node.js to set up the frontend.")

    # Node deps (vscode extension)
    print("\n--- VSCode extension dependencies ---")
    if shutil.which("npm"):
        run(f'npm install --prefix "{os.path.join(ROOT, "vscode-extension")}"')
        print("  VSCode extension dependencies installed.")

    # Smoke test
    print("\n--- Smoke test ---")
    result = run(
        f'"{py}" -c "import sys; sys.path.insert(0, \'server\'); from app import create_app; create_app(); print(\'Flask app created OK\')"',
        cwd=ROOT,
    )
    if result.returncode != 0:
        print("  Smoke test failed — check server/app for import errors.")

    print("\n=== Setup complete ===")
    print("Next: python scripts/run.py")


if __name__ == "__main__":
    main()
