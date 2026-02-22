import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { JumbudConfig } from "./types";

const JUMBUD_DIR = ".jumbud";
const CONFIG_FILE = "config.json";
const MIRROR_DIR = "mirror";

const DEFAULT_SERVER_URL = "http://0.0.0.0:10000";

// Extension config defaults (match config.yaml)
export const DEBOUNCE_TIME = 10_000; // 10 seconds in ms
export const MAX_DEBOUNCE_TIME = 60_000; // 60 seconds in ms
export const DEBOUNCES_BEFORE_PUSH = 10;

export const TRACKED_EXTENSIONS = new Set([
  ".c",
  ".cpp",
  ".cc",
  ".h",
  ".hpp",
  ".hh",
]);
export const TRACKED_FILENAMES = new Set(["Makefile", "makefile"]);

export function getWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

export function getJumbudDir(): string | undefined {
  const root = getWorkspaceRoot();
  if (!root) return undefined;
  return path.join(root, JUMBUD_DIR);
}

export function getMirrorDir(): string | undefined {
  const jumbudDir = getJumbudDir();
  if (!jumbudDir) return undefined;
  return path.join(jumbudDir, MIRROR_DIR);
}

export function jumbudExists(): boolean {
  const dir = getJumbudDir();
  return !!dir && fs.existsSync(dir);
}

export function readConfig(): JumbudConfig | undefined {
  const dir = getJumbudDir();
  if (!dir) return undefined;
  const configPath = path.join(dir, CONFIG_FILE);
  if (!fs.existsSync(configPath)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch {
    return undefined;
  }
}

export function writeConfig(config: JumbudConfig): void {
  const dir = getJumbudDir();
  if (!dir) return;
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, MIRROR_DIR), { recursive: true });
  fs.writeFileSync(path.join(dir, CONFIG_FILE), JSON.stringify(config, null, 2));
}

export function getServerUrl(): string {
  const config = readConfig();
  return config?.server_url ?? DEFAULT_SERVER_URL;
}

export function isTrackedFile(filePath: string): boolean {
  const root = getWorkspaceRoot();
  if (root && filePath.startsWith(path.join(root, JUMBUD_DIR))) return false;

  const basename = path.basename(filePath);
  if (TRACKED_FILENAMES.has(basename)) return true;
  const ext = path.extname(filePath);
  return TRACKED_EXTENSIONS.has(ext);
}
