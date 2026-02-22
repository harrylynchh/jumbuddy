#!/usr/bin/env python3
import os
import shutil
import subprocess
import sys
import time

HOME = os.path.expanduser("~")
TARGET_DIR = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(HOME, "CODE", "cpp-fun")
JUMBUDDY_DIR = os.path.join(TARGET_DIR, ".jumbuddy")
EXTENSION_DIR = os.path.join(HOME, "code", "jumbohack2026", "vscode-extension")
EXTENSIONS_DIR = os.path.join(HOME, ".vscode", "extensions")
INSTALL_DIR = os.path.join(EXTENSIONS_DIR, "jumbuddy")
GHOST_PROFILE = os.path.join(HOME, ".vscode-jumbuddy-test")

# Kill VS Code (Linux)
subprocess.run(["pkill", "-f", "code"], capture_output=True)
time.sleep(2)
print("Closed VS Code")
print("Closed VS Code")

# Delete ghost profile left over from old --user-data-dir approach
if os.path.exists(GHOST_PROFILE):
  shutil.rmtree(GHOST_PROFILE)
  print(f"Deleted ghost profile {GHOST_PROFILE}")

# Delete .jumbuddy completely
if os.path.exists(JUMBUDDY_DIR):
  shutil.rmtree(JUMBUDDY_DIR)
  print(f"Deleted {JUMBUDDY_DIR}")
else:
  print(f"{JUMBUDDY_DIR} does not exist, skipping")

# Rebuild extension
print("Building VS Code extension...")
result = subprocess.run(["npm", "run", "compile"], cwd=EXTENSION_DIR, capture_output=True, text=True)
if result.returncode != 0:
    print(f"Build failed:\n{result.stderr}")
    sys.exit(1)
print("Build successful")

# Install extension by copying only the needed files
if os.path.islink(INSTALL_DIR):
  os.remove(INSTALL_DIR)
elif os.path.exists(INSTALL_DIR):
  shutil.rmtree(INSTALL_DIR)
os.makedirs(INSTALL_DIR)
shutil.copy2(os.path.join(EXTENSION_DIR, "package.json"), INSTALL_DIR)
shutil.copytree(os.path.join(EXTENSION_DIR, "out"), os.path.join(INSTALL_DIR, "out"))
shutil.copytree(os.path.join(EXTENSION_DIR, "node_modules"), os.path.join(INSTALL_DIR, "node_modules"))
print(f"Installed extension to {INSTALL_DIR}")

# Open VS Code normally
subprocess.Popen(["code", TARGET_DIR])
print(f"Opened VS Code at {TARGET_DIR} with JumBuddy extension")
