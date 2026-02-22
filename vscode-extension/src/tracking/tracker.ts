import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import {
  DEBOUNCE_TIME,
  MAX_DEBOUNCE_TIME,
  SNAPSHOT_INTERVAL,
  getMirrorDir,
  getWorkspaceRoot,
  isTrackedFile,
  getNextSequence,
} from "../utils/config";
import { computeDiff } from "./differ";
import { enqueueFlush, pushFlushes } from "../sync/flusher";
import { computeMetrics } from "./metrics";
import { getActiveSymbol } from "./symbols";
import { FlushPayload } from "../utils/types";
import { sha256 } from "../utils/hash";

interface FileState {
  timer: ReturnType<typeof setTimeout>;
  maxTimer: ReturnType<typeof setTimeout>;
  startTimestamp: string;
  lastSymbol: string | null;
  cursorReads: Map<string, number>;
}

const activeFiles = new Map<string, FileState>();
const disposables: vscode.Disposable[] = [];

export function startTracking(): void {
  console.log("[JumBuddy] Tracker: starting file change listeners");

  disposables.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      const filePath = e.document.uri.fsPath;
      if (e.contentChanges.length === 0) return;
      if (!isTrackedFile(filePath)) return;
      console.log(`[JumBuddy] Tracker: text changed in ${path.basename(filePath)}`);
      onFileChanged(filePath);
    }),
  );

  // Watch for new tracked files created in the workspace
  const workspaceRoot = getWorkspaceRoot();
  if (workspaceRoot) {
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspaceRoot, "**/*"),
    );
    disposables.push(watcher);
    disposables.push(
      watcher.onDidCreate((uri) => {
        const filePath = uri.fsPath;
        if (!isTrackedFile(filePath)) return;
        console.log(`[JumBuddy] Tracker: new file detected ${path.basename(filePath)}`);
        initNewFile(filePath);
      }),
    );
  }

  disposables.push(
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (!editor) return;
      for (const [filePath] of activeFiles) {
        if (filePath !== editor.document.uri.fsPath) {
          console.log(`[JumBuddy] Tracker: file_switch from ${path.basename(filePath)}`);
          await flushFile(filePath, "file_switch");
        }
      }
    }),
  );

  disposables.push(
    vscode.window.onDidChangeTextEditorSelection(async (e) => {
      const filePath = e.textEditor.document.uri.fsPath;
      const state = activeFiles.get(filePath);
      if (!state) return;

      const currentSymbol = await getActiveSymbol(e.textEditor);
      if (currentSymbol) {
        state.cursorReads.set(
          currentSymbol,
          (state.cursorReads.get(currentSymbol) || 0) + 1,
        );
      }
      if (currentSymbol !== state.lastSymbol && state.lastSymbol !== null) {
        console.log(
          `[JumBuddy] Tracker: symbol_change ${state.lastSymbol} → ${currentSymbol}`,
        );
        await flushFile(filePath, "symbol_change");
      }
    }),
  );

  console.log("[JumBuddy] Tracker: listeners registered");
}

export async function stopTracking(): Promise<void> {
  console.log("[JumBuddy] Tracker: stopping, flushing %d active files", activeFiles.size);
  for (const filePath of [...activeFiles.keys()]) {
    await flushFile(filePath, "deactivate");
  }
  await pushFlushes();

  for (const d of disposables) {
    d.dispose();
  }
  disposables.length = 0;
  console.log("[JumBuddy] Tracker: stopped");
}

function onFileChanged(filePath: string): void {
  const existing = activeFiles.get(filePath);

  if (existing) {
    clearTimeout(existing.timer);
    existing.timer = setTimeout(() => {
      console.log(`[JumBuddy] Tracker: timeout for ${path.basename(filePath)}`);
      flushFile(filePath, "timeout");
    }, DEBOUNCE_TIME);
  } else {
    const now = new Date().toISOString();
    const editor = vscode.window.activeTextEditor;

    console.log(`[JumBuddy] Tracker: new active file ${path.basename(filePath)}`);

    const state: FileState = {
      timer: setTimeout(() => {
        console.log(`[JumBuddy] Tracker: timeout for ${path.basename(filePath)}`);
        flushFile(filePath, "timeout");
      }, DEBOUNCE_TIME),
      maxTimer: setTimeout(() => {
        console.log(`[JumBuddy] Tracker: max_duration for ${path.basename(filePath)}`);
        flushFile(filePath, "max_duration");
      }, MAX_DEBOUNCE_TIME),
      startTimestamp: now,
      lastSymbol: null,
      cursorReads: new Map(),
    };

    activeFiles.set(filePath, state);

    if (editor && editor.document.uri.fsPath === filePath) {
      getActiveSymbol(editor).then((sym) => {
        const s = activeFiles.get(filePath);
        if (s) s.lastSymbol = sym;
      });
    }
  }
}

async function initNewFile(filePath: string): Promise<void> {
  const mirrorDir = getMirrorDir();
  const workspaceRoot = getWorkspaceRoot();
  if (!mirrorDir || !workspaceRoot) return;

  const relativePath = path.relative(workspaceRoot, filePath);
  const mirrorPath = path.join(mirrorDir, relativePath);

  // Skip if mirror already exists (file was already tracked)
  if (fs.existsSync(mirrorPath)) return;

  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    return;
  }

  // Create mirror
  fs.mkdirSync(path.dirname(mirrorPath), { recursive: true });
  fs.writeFileSync(mirrorPath, content);

  // Generate init flush with sequence and hash
  const now = new Date().toISOString();
  const diffs = computeDiff(relativePath, "", content);
  const metrics = computeMetrics(diffs, "", content, now, now, new Map());
  const sequence = getNextSequence(relativePath);
  const hash = sha256(content);

  const flush: FlushPayload = {
    file_path: relativePath,
    client_flush_id: crypto.randomUUID(),
    sequence_number: sequence,
    content_hash: hash,
    trigger: "init",
    start_timestamp: now,
    end_timestamp: now,
    diffs,
    snapshot: content, // Init always includes full snapshot
    active_symbol: null,
    metrics,
  };

  console.log(`[JumBuddy] Tracker: init flush for new file ${relativePath} seq=${sequence} hash=${hash.slice(0, 8)} [snapshot]`);
  await enqueueFlush(flush);
}

async function flushFile(
  filePath: string,
  trigger: FlushPayload["trigger"],
): Promise<void> {
  const state = activeFiles.get(filePath);
  if (!state) return;

  clearTimeout(state.timer);
  clearTimeout(state.maxTimer);
  activeFiles.delete(filePath);

  const mirrorDir = getMirrorDir();
  const workspaceRoot = getWorkspaceRoot();
  if (workspaceRoot && filePath.startsWith(path.join(workspaceRoot, ".jumbuddy"))) {
    return;
  }
  if (!mirrorDir || !workspaceRoot) return;

  const relativePath = path.relative(workspaceRoot, filePath);
  const mirrorPath = path.join(mirrorDir, relativePath);

  // Read from editor buffer (unsaved state), fall back to disk
  const openDoc = vscode.workspace.textDocuments.find(
    (d) => d.uri.fsPath === filePath,
  );
  let currentContent: string;
  if (openDoc) {
    currentContent = openDoc.getText();
  } else {
    try {
      currentContent = fs.readFileSync(filePath, "utf-8");
    } catch {
      console.warn(`[JumBuddy] Tracker: cannot read ${relativePath}, skipping`);
      return;
    }
  }

  let mirrorContent = "";
  try {
    mirrorContent = fs.readFileSync(mirrorPath, "utf-8");
  } catch {
    // No mirror yet
  }

  if (currentContent === mirrorContent) {
    console.log(`[JumBuddy] Tracker: no changes in ${relativePath}, skipping flush`);
    return;
  }

  const diffs = computeDiff(relativePath, mirrorContent, currentContent);

  fs.mkdirSync(path.dirname(mirrorPath), { recursive: true });
  fs.writeFileSync(mirrorPath, currentContent);

  let activeSymbol: string | null = null;
  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document.uri.fsPath === filePath) {
    activeSymbol = await getActiveSymbol(editor);
  }

  const now = new Date().toISOString();

  const metrics = computeMetrics(
    diffs,
    mirrorContent,
    currentContent,
    state.startTimestamp,
    now,
    state.cursorReads,
  );

  const sequence = getNextSequence(relativePath);
  const hash = sha256(currentContent);
  const includeSnapshot = sequence % SNAPSHOT_INTERVAL === 0;

  const flush: FlushPayload = {
    file_path: relativePath,
    client_flush_id: crypto.randomUUID(),
    sequence_number: sequence,
    content_hash: hash,
    trigger,
    start_timestamp: state.startTimestamp,
    end_timestamp: now,
    diffs,
    snapshot: includeSnapshot ? currentContent : null,
    active_symbol: activeSymbol,
    metrics,
  };

  console.log(
    `[JumBuddy] Tracker: flushing ${relativePath} trigger=${trigger} seq=${sequence} hash=${hash.slice(0, 8)}${includeSnapshot ? " [snapshot]" : ""} symbol=${activeSymbol}`,
  );

  await enqueueFlush(flush);
}
