import * as vscode from "vscode";

let item: vscode.StatusBarItem | undefined;
let animTimer: ReturnType<typeof setTimeout> | undefined;

export function createStatusBar(): vscode.StatusBarItem {
  item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    0,
  );
  item.command = "jumbud.init";
  setIdle();
  item.show();
  return item;
}

/** Tracking active — resting elephant */
export function setTracking(): void {
  if (!item) return;
  clearAnim();
  item.text = "$(whole-word) Tracking";
  item.tooltip = "JumBud: Tracking edits";
  item.color = undefined;
}

/** Not connected yet */
export function setIdle(): void {
  if (!item) return;
  clearAnim();
  item.text = "$(whole-word) JumBud: Idle";
  item.tooltip = "JumBud: Click to connect";
  item.color = new vscode.ThemeColor("statusBarItem.warningForeground");
}

/** Flash while pushing flushes */
export function setPushing(): void {
  if (!item) return;
  clearAnim();
  item.text = "$(sync~spin) Pushing...";
  item.tooltip = "JumBud: Sending edits to server";
  item.color = undefined;
}

/** Brief success flash, then back to tracking */
export function flashSuccess(): void {
  if (!item) return;
  clearAnim();
  item.text = "$(check) Pushed!";
  item.color = new vscode.ThemeColor("charts.green");
  animTimer = setTimeout(() => setTracking(), 1500);
}

/** Brief error flash, then back to tracking */
export function flashError(): void {
  if (!item) return;
  clearAnim();
  item.text = "$(error) Push failed";
  item.color = new vscode.ThemeColor("errorForeground");
  animTimer = setTimeout(() => setTracking(), 3000);
}

function clearAnim(): void {
  if (animTimer) {
    clearTimeout(animTimer);
    animTimer = undefined;
  }
}

export function dispose(): void {
  clearAnim();
  item?.dispose();
  item = undefined;
}
