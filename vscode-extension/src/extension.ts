// Must be set before any imports that might trigger network code
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import * as vscode from "vscode";
import * as http from "http";
import { jumbudExists, readConfig, writeConfig } from "./config";
import { runInit } from "./init";
import { startTracking, stopTracking } from "./tracker";
import { pushFlushes } from "./flusher";

const BASE_URL = "http://127.0.0.1:10000";
const INTERNAL_API_KEY = "vscode-dev-key";

function getAuthHeaders(): Record<string, string> {
  const config = readConfig();
  const utln = config?.utln ?? "";
  return {
    "X-Internal-Key": INTERNAL_API_KEY,
    "X-User-UTLN": utln,
  };
}

function rawHttpGet(url: string, headers: Record<string, string> = {}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { agent: false, headers }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
      res.on("error", reject);
    });
    req.on("error", (err) => {
      const details = JSON.stringify(err, Object.getOwnPropertyNames(err));
      console.error("[CodeActivity] http.get error:", details);
      reject(err);
    });
    req.setTimeout(5000, () => {
      req.destroy(new Error("Request timed out after 5s"));
    });
    req.end();
  });
}

export async function activate(context: vscode.ExtensionContext) {
  console.log("[CodeActivity] Activating extension...");
  console.log("[CodeActivity] Node version:", process.version);
  console.log("[CodeActivity] HTTP_PROXY:", process.env.HTTP_PROXY ?? "(none)");
  console.log("[CodeActivity] HTTPS_PROXY:", process.env.HTTPS_PROXY ?? "(none)");

  const pingCmd = vscode.commands.registerCommand(
    "codeactivity.ping",
    async () => {
      const url = `${BASE_URL}/api/profiles/me`;
      console.log("[CodeActivity] Pinging:", url);

      try {
        const { status, body } = await rawHttpGet(url, getAuthHeaders());
        const msg = `status=${status} body=${body.substring(0, 100)}`;
        console.log("[CodeActivity] Ping success:", msg);
        vscode.window.showInformationMessage(`Ping OK: ${msg}`);
      } catch (err: any) {
        const details = JSON.stringify(err, Object.getOwnPropertyNames(err));
        console.error("[CodeActivity] Ping failed:", details);
        vscode.window.showErrorMessage(
          `Ping FAILED: ${err?.message ?? err} | code=${err?.code} | cause=${err?.cause?.message ?? "(none)"}`,
        );
      }
    },
  );
  context.subscriptions.push(pingCmd);

  const initCmd = vscode.commands.registerCommand(
    "codeactivity.init",
    async () => {
      await runInit();
    },
  );
  context.subscriptions.push(initCmd);

  const setUtlnCmd = vscode.commands.registerCommand(
    "codeactivity.setUtln",
    async () => {
      const utln = await vscode.window.showInputBox({
        prompt: "Enter your UTLN (e.g. slupo01)",
        placeHolder: "slupo01",
      });
      if (!utln) return;

      const config = readConfig() ?? {
        utln: "",
        assignment_id: "",
        course_id: "",
        server_url: "http://127.0.0.1:10000",
      };
      writeConfig({ ...config, utln });
      vscode.window.showInformationMessage(`UTLN set to: ${utln}`);
    },
  );
  context.subscriptions.push(setUtlnCmd);

  if (jumbudExists()) {
    const config = readConfig();
    if (config) {
      startTracking();
      vscode.window.showInformationMessage("CodeActivity: Resumed tracking.");
    }
  }
}

export async function deactivate() {
  await stopTracking();
  await pushFlushes();
}