#!/usr/bin/env python3
"""Stream logs from a Docker Compose service."""

import os
import sys
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COMPOSE_FILE = os.path.join(ROOT, "docker-compose.yml")

SERVICES = {
    "server": "Flask API server (port 10000)",
    "web":    "React/Vite frontend (port 10001)",
    "db":     "PostgreSQL database (port 10005)",
    "auth":   "Supabase Auth / GoTrue — handles login, signup, JWTs",
    "rest":   "PostgREST — auto-generated REST API over Postgres",
    "kong":   "API gateway — routes requests to auth/rest (port 10002)",
    "meta":   "Postgres-meta — introspection API used by Studio",
    "studio": "Supabase Studio — DB admin UI (port 10003)",
}


def print_help():
    print("Usage: logs.py <service>")
    print(f"\nServices: {', '.join(SERVICES)}")


def print_explain():
    print("Services:\n")
    for name, desc in SERVICES.items():
        print(f"  {name:8s}  {desc}")


if len(sys.argv) < 2 or sys.argv[1] == "--help":
    print_help()
    sys.exit(0)

if sys.argv[1] == "--explain":
    print_explain()
    sys.exit(0)

service = sys.argv[1]
if service not in SERVICES:
    print(f"Unknown service: {service}")
    print_help()
    sys.exit(1)

subprocess.run(
    f'docker compose -f "{COMPOSE_FILE}" logs -f {service}',
    shell=True,
)
