import * as vscode from "vscode";
import { readConfig } from "./config";
import type { FlushPayload } from "./types";

let outputChannel: vscode.OutputChannel | null = null;

/**
 * Get or create the JumBuddy debug output channel.
 */
function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel("JumBuddy Debug");
  }
  return outputChannel;
}

/**
 * Check if debug mode is enabled in config.
 */
export function isDebugEnabled(): boolean {
  const config = readConfig();
  return config?.debug === true;
}

/**
 * Log to VS Code output channel if debug mode is enabled.
 */
export function debugLog(message: string): void {
  if (!isDebugEnabled()) return;

  const channel = getOutputChannel();
  const timestamp = new Date().toISOString();
  channel.appendLine(`[${timestamp}] ${message}`);
}

/**
 * Log detailed flush statistics to output channel (only if debug enabled).
 */
export function logFlushStats(flush: FlushPayload): void {
  if (!isDebugEnabled()) return;

  const channel = getOutputChannel();
  channel.appendLine("");
  channel.appendLine("=".repeat(80));
  channel.appendLine(`FLUSH STATS`);
  channel.appendLine("=".repeat(80));
  channel.appendLine(`File:           ${flush.file_path}`);
  channel.appendLine(`Sequence:       ${flush.sequence_number}`);
  channel.appendLine(`Trigger:        ${flush.trigger}`);
  channel.appendLine(`Symbol:         ${flush.active_symbol ?? "(none)"}`);
  channel.appendLine(`Time Window:    ${flush.start_timestamp.slice(11, 19)} → ${flush.end_timestamp.slice(11, 19)}`);

  // Calculate duration
  const start = new Date(flush.start_timestamp).getTime();
  const end = new Date(flush.end_timestamp).getTime();
  const durationSec = ((end - start) / 1000).toFixed(1);
  channel.appendLine(`Duration:       ${durationSec}s`);

  // Metrics
  const m = flush.metrics;
  channel.appendLine(`Chars Inserted: ${m.chars_inserted}`);
  channel.appendLine(`Chars Deleted:  ${m.chars_deleted}`);
  channel.appendLine(`Net Change:     ${m.chars_inserted - m.chars_deleted}`);
  channel.appendLine(`Lines Touched:  ${m.lines_touched}`);
  channel.appendLine(`Edit Velocity:  ${m.edit_velocity.toFixed(2)} chars/sec`);
  channel.appendLine(`Rewrite Ratio:  ${m.rewrite_ratio !== null ? m.rewrite_ratio.toFixed(2) : "N/A"}`);
  channel.appendLine(`Edit Events:    ${m.edit_events}`);
  channel.appendLine(`Pause Count:    ${m.pause_count}`);

  // Thrash
  if (m.thrash.score > 0) {
    channel.appendLine(`Thrash Score:   ${m.thrash.score.toFixed(2)} (${m.thrash.thrashing_lines.length} lines)`);
  }

  // Delete/rewrite
  if (m.delete_rewrite) {
    channel.appendLine(`Delete/Rewrite: ${m.delete_rewrite.deleted_block_size} deleted, ${m.delete_rewrite.rewritten_block_size} rewritten`);
  }

  // Content hash
  channel.appendLine(`Content Hash:   ${flush.content_hash.slice(0, 16)}...`);

  // Diff preview (first 10 lines)
  const diffLines = flush.diffs.split("\n").slice(0, 10);
  if (diffLines.length > 0) {
    channel.appendLine(`Diff Preview:`);
    diffLines.forEach(line => channel.appendLine(`  ${line}`));
    if (flush.diffs.split("\n").length > 10) {
      channel.appendLine(`  ... (${flush.diffs.split("\n").length - 10} more lines)`);
    }
  }

  channel.appendLine("=".repeat(80));
  channel.appendLine("");

  // Show the output channel so user sees it
  channel.show(true); // true = preserve focus
}

/**
 * Dispose of the output channel.
 */
export function disposeLogger(): void {
  if (outputChannel) {
    outputChannel.dispose();
    outputChannel = null;
  }
}
