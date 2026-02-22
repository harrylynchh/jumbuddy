import Prism from "prismjs";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-go";
import "prismjs/components/prism-ruby";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-json";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-markup"; // HTML
import "prismjs/components/prism-css";

/**
 * Token represents a syntax-highlighted segment of code.
 */
export interface Token {
  type: string;
  content: string;
}

/**
 * Get Prism language based on file extension.
 */
function getLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();

  const langMap: Record<string, string> = {
    c: "c",
    h: "c",
    cpp: "cpp",
    cc: "cpp",
    cxx: "cpp",
    hpp: "cpp",
    hh: "cpp",
    py: "python",
    java: "java",
    js: "javascript",
    jsx: "jsx",
    ts: "typescript",
    tsx: "tsx",
    rs: "rust",
    go: "go",
    rb: "ruby",
    sh: "bash",
    bash: "bash",
    sql: "sql",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    html: "markup",
    htm: "markup",
    xml: "markup",
    css: "css",
  };

  return langMap[ext || ""] || "plain";
}

/**
 * Flatten Prism token tree into a linear array of tokens.
 */
function flattenTokens(tokens: (string | Prism.Token)[]): Token[] {
  const result: Token[] = [];

  function traverse(item: string | Prism.Token, type: string) {
    if (typeof item === "string") {
      result.push({ type, content: item });
    } else if (Array.isArray(item.content)) {
      item.content.forEach((child) =>
        traverse(child, item.type || type)
      );
    } else {
      result.push({ type: item.type || type, content: String(item.content) });
    }
  }

  tokens.forEach((token) => traverse(token, "plain"));
  return result;
}

/**
 * Tokenize code using Prism for syntax highlighting.
 * Returns array of tokens with type and content.
 */
export function tokenizeCode(code: string, filePath: string): Token[] {
  const language = getLanguage(filePath);

  if (language === "plain" || !Prism.languages[language]) {
    // No highlighting for unknown languages
    return [{ type: "plain", content: code }];
  }

  try {
    const tokens = Prism.tokenize(code, Prism.languages[language]);
    return flattenTokens(tokens);
  } catch {
    // Fallback if tokenization fails
    return [{ type: "plain", content: code }];
  }
}

/**
 * Get token color for a given token type (matching Prism theme).
 */
export function getTokenColor(type: string): string {
  // Dark theme colors (similar to VS Code Dark+)
  const colorMap: Record<string, string> = {
    comment: "#6A9955",
    prolog: "#6A9955",
    doctype: "#6A9955",
    cdata: "#6A9955",

    punctuation: "#D4D4D4",

    property: "#9CDCFE",
    tag: "#4EC9B0",
    boolean: "#569CD6",
    number: "#B5CEA8",
    constant: "#4FC1FF",
    symbol: "#4FC1FF",

    selector: "#D7BA7D",
    "attr-name": "#9CDCFE",
    string: "#CE9178",
    char: "#CE9178",
    builtin: "#4EC9B0",
    inserted: "#B5CEA8",

    operator: "#D4D4D4",
    entity: "#569CD6",
    url: "#3794FF",

    "class-name": "#4EC9B0",
    atrule: "#C586C0",
    "attr-value": "#CE9178",
    keyword: "#C586C0",

    function: "#DCDCAA",
    regex: "#D16969",
    important: "#569CD6",
    variable: "#9CDCFE",

    deleted: "#D16969",

    // Generic fallbacks
    plain: "#D4D4D4",
  };

  return colorMap[type] || "#D4D4D4";
}
