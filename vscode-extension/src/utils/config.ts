import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { JumbuddyConfig } from "./types";

const JUMBUDDY_DIR = ".jumbuddy";
const CONFIG_FILE = "config.json";
const MIRROR_DIR = "mirror";
const SEQUENCE_FILE = "sequences.json";
const QUEUE_FILE = "flush_queue.json";

const DEFAULT_SERVER_URL = "http://0.0.0.0:10000";

// Extension config defaults
export const DEBOUNCE_TIME = 10_000; // 10 seconds in ms
export const MAX_DEBOUNCE_TIME = 60_000; // 60 seconds in ms
export const DEBOUNCES_BEFORE_PUSH = 10;
export const SNAPSHOT_INTERVAL = 50; // Include full file snapshot every N flushes per file

// Patterns for tracked files. Matched against the file's basename.
// Supports globs (via minimatch-style) and exact names.
const TRACKED_PATTERNS: string[] = [
  // C / C++
  "*.c", "*.cpp", "*.cc", "*.h", "*.hpp", "*.hh",
  // Python
  "*.py",
  // Java
  "*.java",
  // JavaScript / TypeScript
  "*.js", "*.ts", "*.jsx", "*.tsx",
  // Rust
  "*.rs",
  // Go
  "*.go",
  // Ruby
  "*.rb",
  // Shell
  "*.sh", "*.bash",
  // Assembly
  "*.s", "*.asm",
  // Scheme / Lisp (common in CS courses)
  "*.scm", "*.rkt", "*.lisp", "*.cl",
  // Haskell / OCaml / SML
  "*.hs", "*.ml", "*.sml",
  // SQL
  "*.sql",
  // Web
  "*.html", "*.css",
  // Data / Config
  "*.json", "*.yaml", "*.yml", "*.toml",
  // Build files
  "Makefile", "makefile", "CMakeLists.txt",
  // Docs
  "README", "README.*",
  // Jupyter
  "*.ipynb",
];

export function getWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

export function getJumbuddyDir(): string | undefined {
  const root = getWorkspaceRoot();
  if (!root) return undefined;
  return path.join(root, JUMBUDDY_DIR);
}

export function getMirrorDir(): string | undefined {
  const jumbuddyDir = getJumbuddyDir();
  if (!jumbuddyDir) return undefined;
  return path.join(jumbuddyDir, MIRROR_DIR);
}

export function jumbuddyExists(): boolean {
  const dir = getJumbuddyDir();
  return !!dir && fs.existsSync(dir);
}

export function readConfig(): JumbuddyConfig | undefined {
  const dir = getJumbuddyDir();
  if (!dir) return undefined;
  const configPath = path.join(dir, CONFIG_FILE);
  if (!fs.existsSync(configPath)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch {
    return undefined;
  }
}

export function writeConfig(config: JumbuddyConfig): void {
  const dir = getJumbuddyDir();
  if (!dir) return;
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, MIRROR_DIR), { recursive: true });
  fs.writeFileSync(path.join(dir, CONFIG_FILE), JSON.stringify(config, null, 2));
}

export function getServerUrl(): string {
  const config = readConfig();
  return config?.server_url ?? DEFAULT_SERVER_URL;
}

/**
 * Match a filename against a simple glob pattern.
 * Supports: "*" (any chars), "?" (one char), exact match.
 */
function matchPattern(filename: string, pattern: string): boolean {
  // Exact match
  if (!pattern.includes("*") && !pattern.includes("?")) {
    return filename === pattern;
  }

  // Convert glob to regex
  const regex = new RegExp(
    "^" +
      pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&") // escape regex chars (except * and ?)
        .replace(/\*/g, ".*")
        .replace(/\?/g, ".") +
      "$",
  );
  return regex.test(filename);
}

export function isTrackedFile(filePath: string): boolean {
  const root = getWorkspaceRoot();
  if (root && filePath.startsWith(path.join(root, JUMBUDDY_DIR))) return false;

  // Skip hidden dirs and node_modules
  const relative = root ? path.relative(root, filePath) : filePath;
  const parts = relative.split(path.sep);
  for (const part of parts.slice(0, -1)) {
    if (part.startsWith(".") || part === "node_modules") return false;
  }

  const basename = path.basename(filePath);
  return TRACKED_PATTERNS.some((pattern) => matchPattern(basename, pattern));
}

// Sequence number management for strict ordering
type SequenceMap = Record<string, number>; // key: file_path, value: next sequence number

export function getNextSequence(filePath: string): number {
  const dir = getJumbuddyDir();
  if (!dir) return 0;

  const seqPath = path.join(dir, SEQUENCE_FILE);
  let sequences: SequenceMap = {};

  if (fs.existsSync(seqPath)) {
    try {
      sequences = JSON.parse(fs.readFileSync(seqPath, "utf-8"));
    } catch {
      sequences = {};
    }
  }

  const current = sequences[filePath] ?? 0;
  sequences[filePath] = current + 1;

  fs.writeFileSync(seqPath, JSON.stringify(sequences, null, 2));
  return current;
}

// Persistent flush queue for crash recovery
export function loadQueue<T>(): T[] {
  const dir = getJumbuddyDir();
  if (!dir) return [];

  const queuePath = path.join(dir, QUEUE_FILE);
  if (!fs.existsSync(queuePath)) return [];

  try {
    return JSON.parse(fs.readFileSync(queuePath, "utf-8"));
  } catch {
    return [];
  }
}

export function saveQueue<T>(queue: T[]): void {
  const dir = getJumbuddyDir();
  if (!dir) return;

  const queuePath = path.join(dir, QUEUE_FILE);
  fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));
}
