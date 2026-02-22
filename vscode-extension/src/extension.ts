process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import * as vscode from "vscode";
import { jumbudExists, readConfig, writeConfig, getWorkspaceRoot } from "./config";

import { initializeTracking } from "./init";
import { startTracking, stopTracking } from "./tracker";
import { pushFlushes } from "./flusher";
import { JumbudConfig } from "./types";
import { createStatusBar, setTracking, setIdle, dispose as disposeStatusBar } from "./statusbar";

const DEFAULT_SERVER_URL = "http://localhost:10000";
const WEB_URL = "http://localhost:10001";

export async function activate(context: vscode.ExtensionContext) {
  console.log("[JumBud] Activating extension...");

  // Status bar
  const statusBar = createStatusBar();
  context.subscriptions.push(statusBar);

  // Register URI handler for browser callback
  const uriHandler: vscode.UriHandler = {
    handleUri(uri: vscode.Uri) {
      console.log("[JumBud] URI callback received:", uri.toString());

      const params = new URLSearchParams(uri.query);
      const key = params.get("key");
      const utln = params.get("utln");
      const assignmentId = params.get("assignment_id");
      const courseId = params.get("course_id");
      const serverUrl = params.get("server_url") ?? DEFAULT_SERVER_URL;

      if (!key || !utln || !assignmentId || !courseId) {
        vscode.window.showErrorMessage(
          "JumBud: Invalid callback — missing parameters.",
        );
        return;
      }

      const workspaceRoot = getWorkspaceRoot();
      if (!workspaceRoot) {
        vscode.window.showErrorMessage(
          "JumBud: No workspace folder open.",
        );
        return;
      }

      const config: JumbudConfig = {
        utln,
        key,
        assignment_id: assignmentId,
        course_id: courseId,
        server_url: serverUrl,
      };
      writeConfig(config);

      initializeTracking(workspaceRoot).then(() => {
        setTracking();
        vscode.window.showInformationMessage(
          `JumBud: Connected as ${utln}. Tracking started.`,
        );
      });
    },
  };
  context.subscriptions.push(vscode.window.registerUriHandler(uriHandler));

  // Init command — opens browser
  const initCmd = vscode.commands.registerCommand(
    "jumbud.init",
    async () => {
      if (!getWorkspaceRoot()) {
        vscode.window.showErrorMessage(
          "JumBud: Open a workspace folder first.",
        );
        return;
      }

      const connectUrl = `${WEB_URL}/connect`;
      await vscode.env.openExternal(vscode.Uri.parse(connectUrl));
      vscode.window.showInformationMessage(
        "JumBud: Complete setup in your browser.",
      );
    },
  );
  context.subscriptions.push(initCmd);

  // Resume tracking if .jumbud/ already exists
  if (jumbudExists()) {
    const config = readConfig();
    if (config) {
      startTracking();
      setTracking();
      vscode.window.showInformationMessage("JumBud: Resumed tracking.");
    }
  }
}

export async function deactivate() {
  await stopTracking();
  await pushFlushes();
  disposeStatusBar();
}
