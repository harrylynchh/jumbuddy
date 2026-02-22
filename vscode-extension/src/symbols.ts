import * as vscode from "vscode";
import * as path from "path";

/**
 * Get the active symbol at the cursor position.
 * Returns "filename:symbolName" or just "filename" if no symbols available.
 */
export async function getActiveSymbol(
  editor: vscode.TextEditor,
): Promise<string | null> {
  const uri = editor.document.uri;
  const position = editor.selection.active;
  const filename = path.basename(uri.fsPath);

  try {
    const symbols = await vscode.commands.executeCommand<
      vscode.DocumentSymbol[]
    >("vscode.executeDocumentSymbolProvider", uri);

    if (!symbols || symbols.length === 0) {
      return filename;
    }

    const innermost = findInnermostSymbol(symbols, position);
    if (innermost) {
      return `${filename}:${innermost.name}`;
    }

    return filename;
  } catch {
    return filename;
  }
}

function findInnermostSymbol(
  symbols: vscode.DocumentSymbol[],
  position: vscode.Position,
): vscode.DocumentSymbol | undefined {
  for (const symbol of symbols) {
    if (symbol.range.contains(position)) {
      // Check children for a more specific match
      const child = findInnermostSymbol(symbol.children, position);
      return child ?? symbol;
    }
  }
  return undefined;
}
