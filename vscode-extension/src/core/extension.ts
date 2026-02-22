process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import * as vscode from "vscode";
import { jumbuddyExists, readConfig, writeConfig, getWorkspaceRoot } from "../utils/config";
import { initializeTracking } from "../tracking/init";
import { startTracking, stopTracking } from "../tracking/tracker";
import { pushFlushes } from "../sync/flusher";
import { JumbuddyConfig } from "../utils/types";
import { createStatusBar, setTracking, setIdle, setUninitialized, dispose as disposeStatusBar } from "../ui/statusbar";

const DEFAULT_SERVER_URL = "https://10000.sethlupo.com";
const WEB_URL = "https://10001.sethlupo.com";

export async function activate(context: vscode.ExtensionContext) {
  console.log("[JumBuddy] Activating extension...");

  // Status bar
  const statusBar = createStatusBar();
  context.subscriptions.push(statusBar);

  // Register URI handler for browser callback
  const uriHandler: vscode.UriHandler = {
    async handleUri(uri: vscode.Uri) {
      console.log("[JumBuddy] URI callback received:", uri.toString());

      const params = new URLSearchParams(uri.query);
      const key = params.get("key");
      const utln = params.get("utln");
      const assignmentId = params.get("assignment_id");
      const courseId = params.get("course_id");
      const serverUrl = params.get("server_url") ?? DEFAULT_SERVER_URL;
      const workspace = params.get("workspace");

      if (!key || !utln || !assignmentId || !courseId) {
        vscode.window.showErrorMessage(
          "JumBuddy: Invalid callback — missing parameters.",
        );
        return;
      }

      let workspaceRoot = getWorkspaceRoot();

      // If callback has a workspace path and we're not in the right folder, open it
      if (workspace && workspaceRoot !== workspace) {
        await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(workspace), false);
        return; // Extension will re-activate in the new window with the URI
      }

      if (!workspaceRoot) {
        vscode.window.showErrorMessage(
          "JumBuddy: No workspace folder open.",
        );
        return;
      }

      const config: JumbuddyConfig = {
        utln,
        key,
        assignment_id: assignmentId,
        course_id: courseId,
        server_url: serverUrl,
      };
      writeConfig(config);

      initializeTracking(workspaceRoot).then(() => {
        setTracking();
        vscode.commands.executeCommand("workbench.action.focusActiveEditorGroup");
        vscode.window.showInformationMessage(
          `JumBuddy: Connected as ${utln}. Tracking started.`,
        );
      });
    },
  };
  context.subscriptions.push(vscode.window.registerUriHandler(uriHandler));

  // Init command — opens browser with workspace path so callback returns here
  const initCmd = vscode.commands.registerCommand(
    "jumbuddy.init",
    async () => {
      const root = getWorkspaceRoot();
      if (!root) {
        vscode.window.showErrorMessage(
          "JumBuddy: Open a workspace folder first.",
        );
        return;
      }

      const params = new URLSearchParams({ workspace: root });
      const connectUrl = `${WEB_URL}/connect?${params.toString()}`;
      await vscode.env.openExternal(vscode.Uri.parse(connectUrl));
      vscode.window.showInformationMessage(
        "JumBuddy: Complete setup in your browser.",
      );
    },
  );
  context.subscriptions.push(initCmd);

  // Resume tracking if .jumbuddy/ already exists
  if (jumbuddyExists()) {
    const config = readConfig();
    if (config) {
      startTracking();
      setTracking();
      vscode.window.showInformationMessage("JumBuddy: Resumed tracking.");
    }
  } else {
    setUninitialized();
  }
}

export async function deactivate() {
  await stopTracking();
  await pushFlushes();
  disposeStatusBar();
}
