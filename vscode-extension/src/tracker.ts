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

export function startTracking(): void {
  console.log("[JumBud] Tracker: starting file change listeners");

  disposables.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      const filePath = e.document.uri.fsPath;
      if (e.contentChanges.length === 0) return;
      if (!isTrackedFile(filePath)) return;
      console.log(`[JumBud] Tracker: text changed in ${path.basename(filePath)}`);
      onFileChanged(filePath);
    }),
  );

  disposables.push(
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (!editor) return;
      for (const [filePath] of activeFiles) {
        if (filePath !== editor.document.uri.fsPath) {
          console.log(`[JumBud] Tracker: file_switch from ${path.basename(filePath)}`);
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
      if (currentSymbol !== state.lastSymbol && state.lastSymbol !== null) {
        console.log(
          `[JumBud] Tracker: symbol_change ${state.lastSymbol} → ${currentSymbol}`,
        );
        await flushFile(filePath, "symbol_change");
      }
    }),
  );

  console.log("[JumBud] Tracker: listeners registered");
}

export async function stopTracking(): Promise<void> {
  console.log("[JumBud] Tracker: stopping, flushing %d active files", activeFiles.size);
  for (const filePath of [...activeFiles.keys()]) {
    await flushFile(filePath, "deactivate");
  }
  await pushFlushes();

  for (const d of disposables) {
    d.dispose();
  }
  disposables.length = 0;
  console.log("[JumBud] Tracker: stopped");
}

function onFileChanged(filePath: string): void {
  const existing = activeFiles.get(filePath);

  if (existing) {
    clearTimeout(existing.timer);
    existing.timer = setTimeout(() => {
      console.log(`[JumBud] Tracker: timeout for ${path.basename(filePath)}`);
      flushFile(filePath, "timeout");
    }, DEBOUNCE_TIME);
  } else {
    const now = new Date().toISOString();
    const editor = vscode.window.activeTextEditor;

    console.log(`[JumBud] Tracker: new active file ${path.basename(filePath)}`);

    const state: FileState = {
      timer: setTimeout(() => {
        console.log(`[JumBud] Tracker: timeout for ${path.basename(filePath)}`);
        flushFile(filePath, "timeout");
      }, DEBOUNCE_TIME),
      maxTimer: setTimeout(() => {
        console.log(`[JumBud] Tracker: max_duration for ${path.basename(filePath)}`);
        flushFile(filePath, "max_duration");
      }, MAX_DEBOUNCE_TIME),
      startTimestamp: now,
      lastSymbol: null,
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
  if (workspaceRoot && filePath.startsWith(path.join(workspaceRoot, ".jumbud"))) {
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
      console.warn(`[JumBud] Tracker: cannot read ${relativePath}, skipping`);
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
    console.log(`[JumBud] Tracker: no changes in ${relativePath}, skipping flush`);
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

  const flush: FlushPayload = {
    file_path: relativePath,
    trigger,
    start_timestamp: state.startTimestamp,
    end_timestamp: now,
    diffs,
    active_symbol: activeSymbol,
  };

  console.log(
    `[JumBud] Tracker: flushing ${relativePath} trigger=${trigger} symbol=${activeSymbol}`,
  );

  await enqueueFlush(flush);
}
