import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import {
  DEBOUNCE_TIME,
  MAX_DEBOUNCE_TIME,
  getMirrorDir,
  getWorkspaceRoot,
  isTrackedFile,
} from "./config";
import { computeDiff } from "./differ";
import { enqueueFlush, pushFlushes } from "./flusher";
import { getActiveSymbol } from "./symbols";
import { FlushPayload } from "./types";

interface FileState {
  timer: ReturnType<typeof setTimeout>;
  maxTimer: ReturnType<typeof setTimeout>;
  startTimestamp: string;
  lastSymbol: string | null;
}

const activeFiles = new Map<string, FileState>();
const disposables: vscode.Disposable[] = [];

/**
 * Start tracking file changes in the workspace.
 */
export function startTracking(): void {
  // Text document changes → reset debounce
  disposables.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      const filePath = e.document.uri.fsPath;
      if (e.contentChanges.length === 0) return;
      if (!isTrackedFile(filePath)) return;
      onFileChanged(filePath);
    }),
  );

  // Active editor change → flush previous file with file_switch trigger
  disposables.push(
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (!editor) return;

      // Flush any active files that aren't the newly focused file
      for (const [filePath, state] of activeFiles) {
        if (filePath !== editor.document.uri.fsPath) {
          await flushFile(filePath, "file_switch");
        }
      }
    }),
  );

  // Cursor/selection change → check for symbol change
  disposables.push(
    vscode.window.onDidChangeTextEditorSelection(async (e) => {
      const filePath = e.textEditor.document.uri.fsPath;
      const state = activeFiles.get(filePath);
      if (!state) return;

      const currentSymbol = await getActiveSymbol(e.textEditor);
      if (currentSymbol !== state.lastSymbol && state.lastSymbol !== null) {
        await flushFile(filePath, "symbol_change");
      }
    }),
  );
}

/**
 * Stop tracking and flush all active files.
 */
export async function stopTracking(): Promise<void> {
  // Flush all active files
  for (const filePath of [...activeFiles.keys()]) {
    await flushFile(filePath, "deactivate");
  }
  await pushFlushes();

  // Clean up listeners
  for (const d of disposables) {
    d.dispose();
  }
  disposables.length = 0;
}

function onFileChanged(filePath: string): void {
  const existing = activeFiles.get(filePath);

  if (existing) {
    // Reset the debounce timer
    clearTimeout(existing.timer);
    existing.timer = setTimeout(() => flushFile(filePath, "timeout"), DEBOUNCE_TIME);
  } else {
    // New active file
    const now = new Date().toISOString();
    const editor = vscode.window.activeTextEditor;

    const state: FileState = {
      timer: setTimeout(() => flushFile(filePath, "timeout"), DEBOUNCE_TIME),
      maxTimer: setTimeout(
        () => flushFile(filePath, "max_duration"),
        MAX_DEBOUNCE_TIME,
      ),
      startTimestamp: now,
      lastSymbol: null,
    };

    activeFiles.set(filePath, state);

    // Async get initial symbol
    if (editor && editor.document.uri.fsPath === filePath) {
      getActiveSymbol(editor).then((sym) => {
        const s = activeFiles.get(filePath);
        if (s) s.lastSymbol = sym;
      });
    }
  }
}

async function flushFile(
  filePath: string,
  trigger: FlushPayload["trigger"],
): Promise<void> {
  const state = activeFiles.get(filePath);
  if (!state) return;

  // Clear timers
  clearTimeout(state.timer);
  clearTimeout(state.maxTimer);
  activeFiles.delete(filePath);

  const mirrorDir = getMirrorDir();
  const workspaceRoot = getWorkspaceRoot();
  if (workspaceRoot && filePath.startsWith(path.join(workspaceRoot, ".jumbud"))) {
    console.log("Trigger")
    return;
  }
  if (!mirrorDir || !workspaceRoot) return;

  const relativePath = path.relative(workspaceRoot, filePath);
  const mirrorPath = path.join(mirrorDir, relativePath);

  // Read current content
  let currentContent: string;
  try {
    currentContent = fs.readFileSync(filePath, "utf-8");
  } catch {
    return; // File deleted or unreadable
  }

  // Read mirror content
  let mirrorContent = "";
  try {
    mirrorContent = fs.readFileSync(mirrorPath, "utf-8");
  } catch {
    // No mirror yet — diff from empty
  }

  // Compute diff
  const diffs = computeDiff(relativePath, mirrorContent, currentContent);

  // Update mirror
  fs.mkdirSync(path.dirname(mirrorPath), { recursive: true });
  fs.writeFileSync(mirrorPath, currentContent);

  // Get active symbol
  let activeSymbol: string | null = null;
  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document.uri.fsPath === filePath) {
    activeSymbol = await getActiveSymbol(editor);
  }

  const now = new Date().toISOString();

  const flush: FlushPayload = {
    file_path: relativePath,
    trigger,
    start_timestamp: state.startTimestamp,
    end_timestamp: now,
    diffs,
    active_symbol: activeSymbol,
  };

  await enqueueFlush(flush);
}
