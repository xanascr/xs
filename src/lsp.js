import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { lex } from "./lexer.js";
import { parse } from "./parser.js";
import { setSource, XSError } from "./errors.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LSP_VERSION = JSON.parse(
  fs.readFileSync(resolve(__dirname, "../package.json"), "utf-8")
).version;

const KEYWORDS = [
  "cria",
  "lei",
  "fofoca",
  "se-pah",
  "ai",
  "repete-na-moral",
  "repete-enquanto",
  "resolve",
  "volta",
  "traz-ai",
  "manda-ai",
  "grita-ae",
  "sussurra",
  "horinha",
  "stalkeia",
  "aguenta-ai",
  "escolhe",
  "desembola",
  "bisbilhota",
  "verdadeiro",
  "falso",
  "nulo",
  "tenta",
  "fodeu",
  "no-fim",
  "assincrono",
  "mete-o-pe",
  "segue-o-baile",
  "classe",
  "herda",
  "spawna",
  "esse-cara",
  "novo",
  "metodo",
  "vai-de",
  "se-for",
  "se-nao-der",
  "ve-se",
  "bateu-com",
  "qualquer-coisa",
  "escuta",
  "terminamos!",
  "tamanho",
  "divide-texto",
  "encontra",
  "decodifica-url",
  "juntar",
  "crush",
  "deu-match",
  "date",
  "tarefa",
  "DB",
  "tpm",
  "tipo-de",
  "instancia-de",
];

const BUILTIN_FUNCTIONS = [
  { name: "grita-ae", params: "...args", doc: "console.log()" },
  { name: "sussurra", params: "...args", doc: "console.warn()" },
  { name: "stalkeia", params: "url", doc: "HTTP GET request" },
  { name: "aguenta-ai", params: "ms", doc: "setTimeout()" },
  { name: "escolhe", params: "min, max", doc: "Random integer" },
  { name: "desembola", params: "json", doc: "JSON.parse()" },
  { name: "bisbilhota", params: "key", doc: "ENV variable" },
  { name: "tamanho", params: "value", doc: "Length of array/string" },
  { name: "divide-texto", params: "text, separator", doc: "String split" },
  { name: "encontra", params: "text, regex", doc: "Regex match" },
  { name: "decodifica-url", params: "url", doc: "URL decode" },
  { name: "juntar", params: "array, separator", doc: "Array join" },
  { name: "horinha", params: "", doc: "Date.now()" },
  { name: "traduz-ai", params: "value", doc: "Convert to string" },
  { name: "deu-match", params: "condition", doc: "Assert truthy" },
  { name: "date", params: "a, b", doc: "Assert equal" },
  { name: "escuta", params: "port, handler", doc: "Create HTTP server" },
  { name: "terminamos!", params: "server", doc: "Stop HTTP server" },
];

let documents = new Map();
let requestId = 0;

export async function startLSPServer() {
  process.stdin.setEncoding("utf-8");
  let buffer = "";

  process.stdin.on("data", (chunk) => {
    buffer += chunk;
    const parts = buffer.split("\r\n\r\n");
    if (parts.length < 2) return;

    const header = parts[0];
    const contentLength = parseInt(header.match(/Content-Length: (\d+)/)?.[1] || "0");
    const bodyStart = header.length + 4;

    if (buffer.length < bodyStart + contentLength) return;

    const body = buffer.slice(bodyStart, bodyStart + contentLength);
    buffer = buffer.slice(bodyStart + contentLength);

    try {
      const msg = JSON.parse(body);
      handleMessage(msg);
    } catch (e) {
      if (requestId > 0) {
        sendMessage({
          jsonrpc: "2.0",
          id: requestId,
          error: { code: -32700, message: "Parse error: " + e.message },
        });
      }
    }
  });

  process.stdin.on("end", () => process.exit(0));
}

function sendMessage(msg) {
  const body = JSON.stringify(msg);
  const header = `Content-Length: ${Buffer.byteLength(body, "utf-8")}\r\nContent-Type: application/vscode-jsonrpc;charset=utf-8\r\n\r\n`;
  process.stdout.write(header + body);
}

function handleMessage(msg) {
  const { method, id, params } = msg;

  switch (method) {
    case "initialize":
      sendMessage({
        jsonrpc: "2.0",
        id,
        result: {
          capabilities: {
            textDocumentSync: { openClose: true, change: 1 },
            completionProvider: { triggerCharacters: [".", "(", " "] },
            hoverProvider: true,
            definitionProvider: true,
            diagnosticProvider: true,
            renameProvider: true,
          },
          serverInfo: { name: "xanascript-lsp", version: LSP_VERSION },
        },
      });
      break;

    case "initialized":
      sendMessage({
        jsonrpc: "2.0",
        method: "window/logMessage",
        params: { type: 3, message: "XanaScript LSP started" },
      });
      break;

    case "textDocument/didOpen":
    case "textDocument/didChange": {
      const uri = params.textDocument?.uri;
      const text = params.textDocument?.text || params.contentChanges?.[0]?.text;
      if (uri && text) {
        documents.set(uri, text);
        validateDocument(uri, text).catch(console.error);
      }
      break;
    }

    case "textDocument/didClose": {
      const uri = params.textDocument?.uri;
      if (uri) documents.delete(uri);
      break;
    }

    case "textDocument/completion": {
      const uri = params.textDocument?.uri;
      const line = params.position?.line || 0;
      const col = params.position?.character || 0;
      const text = documents.get(uri);
      if (text) {
        const members = memberCompletions(text, line, col);
        const items = members || getCompletions(text, line, col);
        sendMessage({ jsonrpc: "2.0", id, result: { isIncomplete: false, items } });
      }
      break;
    }

    case "textDocument/hover": {
      const uri = params.textDocument?.uri;
      const line = params.position?.line || 0;
      const col = params.position?.character || 0;
      const text = documents.get(uri);
      if (text) {
        const hover = getHover(text, line, col);
        sendMessage({ jsonrpc: "2.0", id, result: hover });
      }
      break;
    }

    case "textDocument/definition": {
      const uri = params.textDocument?.uri;
      const line = params.position?.line || 0;
      const col = params.position?.character || 0;
      const text = documents.get(uri);
      if (text) {
        const def = getDefinition(text, line, col);
        sendMessage({ jsonrpc: "2.0", id, result: def });
      }
      break;
    }

    case "textDocument/rename": {
      const uri = params.textDocument?.uri;
      const line = params.position?.line || 0;
      const col = params.position?.character || 0;
      const newName = params.newName;
      const text = documents.get(uri);
      if (text && newName) {
        const edits = buildRename(text, line, col, newName);
        sendMessage({ jsonrpc: "2.0", id, result: { changes: { [uri]: edits } } });
      } else {
        sendMessage({ jsonrpc: "2.0", id, result: null });
      }
      break;
    }

    case "shutdown":
      sendMessage({ jsonrpc: "2.0", id, result: null });
      break;

    case "exit":
      process.exit(0);
      break;
  }
}

async function validateDocument(uri, text) {
  setSource(text, uri);
  const diagnostics = [];

  try {
    const tokens = lex(text);
    const ast = parse(tokens);
    try {
      const { checkTypes } = await import("./typecheck.js");
      for (const e of checkTypes(ast)) {
        const loc = e.loc || { line: 1, column: 1 };
        diagnostics.push({
          range: {
            start: { line: loc.line - 1, character: (loc.column || 1) - 1 },
            end: { line: loc.line - 1, character: (loc.column || 1) + 10 },
          },
          severity: 1,
          message: e.message,
          source: "xanascript",
        });
      }
    } catch {
      // typecheck is best-effort in LSP; without typing it does not block
    }
  } catch (e) {
    const loc = e.loc || { line: 1, column: 1 };
    diagnostics.push({
      range: {
        start: { line: loc.line - 1, character: (loc.column || 1) - 1 },
        end: { line: loc.line - 1, character: (loc.column || 1) + 10 },
      },
      severity: 1,
      message: e.message,
      source: "xanascript",
    });
  }

  sendMessage({
    jsonrpc: "2.0",
    method: "textDocument/publishDiagnostics",
    params: { uri, diagnostics },
  });
}

function getCompletions(text, line, col) {
  const items = [];

  for (const kw of KEYWORDS) {
    items.push({
      label: kw,
      kind: 14,
      detail: "keyword",
      insertText: kw,
    });
  }

  for (const fn of BUILTIN_FUNCTIONS) {
    items.push({
      label: fn.name,
      kind: 3,
      detail: `fn(${fn.params})`,
      documentation: fn.doc,
      insertText: fn.name + "($1)",
      insertTextFormat: 2,
    });
  }

  const words = text.split(/[^a-zA-Z0-9_]/).filter(Boolean);
  const seen = new Set();
  for (const w of words) {
    if (!seen.has(w) && w.length > 1 && !KEYWORDS.includes(w.toUpperCase())) {
      seen.add(w);
      items.push({
        label: w,
        kind: 6,
        insertText: w,
      });
    }
  }

  return items;
}

function getHover(text, line, col) {
  const word = getWordAt(text, line, col);
  if (!word) return null;

  const fn = BUILTIN_FUNCTIONS.find((f) => f.name === word);
  if (fn) {
    return {
      contents: {
        kind: "markdown",
        value: `\`\`\`xs\n${fn.name}(${fn.params})\n\`\`\`\n\n${fn.doc}`,
      },
    };
  }

  if (KEYWORDS.includes(word.toUpperCase())) {
    return {
      contents: {
        kind: "markdown",
        value: `\`\`\`xs\n${word}\n\`\`\`\n\nXanaScript keyword`,
      },
    };
  }

  const type = inferTypeAt(text, word, line, col);
  if (type) {
    return {
      contents: {
        kind: "markdown",
        value: `\`\`\`xs\n${word}: ${type}\n\`\`\``,
      },
    };
  }

  return null;
}

function getDefinition(text, line, col) {
  const word = getWordAt(text, line, col);
  if (!word) return null;

  const patterns = [
    new RegExp(`resolve\\s+${word}\\b`),
    new RegExp(`cria\\s+${word}\\b`),
    new RegExp(`classe\\s+${word}\\b`),
    new RegExp(`tarefa\\s+${word}\\b`),
  ];

  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const pat of patterns) {
      const match = lines[i].match(pat);
      if (match) {
        const colIdx = match.index + match[0].indexOf(word);
        return {
          uri: "",
          range: {
            start: { line: i, character: colIdx },
            end: { line: i, character: colIdx + word.length },
          },
        };
      }
    }
  }

  return null;
}

function getWordAt(text, line, col) {
  const lines = text.split("\n");
  if (line >= lines.length) return null;
  const lineText = lines[line];
  if (col >= lineText.length) return null;

  let start = col;
  let end = col;
  while (start > 0 && /[a-zA-Z0-9_-]/.test(lineText[start - 1])) start--;
  while (end < lineText.length && /[a-zA-Z0-9_-]/.test(lineText[end])) end++;

  return start < end ? lineText.slice(start, end) : null;
}

function inferTypeAt(text, word, line, col) {
  const lines = text.split("\n");

  // Encontra a declaração mais próxima antes da posição
  for (let i = line; i >= 0; i--) {
    // cria <name> = ...
    let m = lines[i].match(
      new RegExp(`cria\\s+${word}\\s*(?::\\s*([a-zA-Z0-9-?]+))?\\s*=\\s*(.+)$`)
    );
    if (m) {
      const hint = m[1];
      if (hint) return hint;
      const init = m[2].trim();
      return inferExprType(init);
    }
    // resolve <name>(params) -> fn
    m = lines[i].match(new RegExp(`resolve\\s+${word}\\s*\\(([^)]*)\\)`));
    if (m) {
      const params = m[1].trim() ? m[1].split(",").map((p) => p.trim()).length : 0;
      return `faz-ai (${params} param${params === 1 ? "" : "s"})`;
    }
  }
  return null;
}

function inferExprType(expr) {
  expr = expr.trim();
  if (/^-?\d+(\.\d+)?$/.test(expr)) return "eh-numero";
  if (expr === "verdadeiro" || expr === "falso") return "vdd?";
  if (expr === "nulo") return "eh-nada";
  if (expr.startsWith('"') || expr.startsWith("'")) return "eh-palavra";
  if (expr.startsWith("[") && expr.endsWith("]")) return "sus";
  if (expr.startsWith("{") && expr.endsWith("}")) return "bagulho";
  if (expr.includes("(") && expr.includes(")")) return "faz-ai";
  return "sla";
}

function buildRename(text, line, col, newName) {
  const word = getWordAt(text, line, col);
  if (!word || newName === word) return [];
  const lines = text.split("\n");
  const edits = [];
  const re = new RegExp(`(?<![a-zA-Z0-9_-])${escapeRegExp(word)}(?![a-zA-Z0-9_-])`, "g");
  for (let i = 0; i < lines.length; i++) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(lines[i])) !== null) {
      edits.push({
        range: {
          start: { line: i, character: m.index },
          end: { line: i, character: m.index + word.length },
        },
        newText: newName,
      });
    }
  }
  return edits;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function memberCompletions(text, line, col) {
  const lines = text.split("\n");
  const lineText = lines[line] || "";
  const prefix = lineText.slice(0, col);

  // padrão: <expr>.  (após o ponto)
  const m = prefix.match(/\.\s*([a-zA-Z0-9_-]*)$/);
  if (!m) return null;

  const beforeDot = prefix.slice(0, prefix.lastIndexOf(".")).trim();
  const varName = beforeDot.match(/([a-zA-Z0-9_-]+)\s*$/)?.[1];
  if (!varName) return null;

  // descobre o tipo da variável
  let type = null;
  for (const l of lines) {
    const dm = l.match(new RegExp(`cria\\s+${varName}\\s*=\\s*(.+)$`));
    if (dm) type = inferExprType(dm[1].trim());
  }
  if (!type) return null;

  const members = {
    "eh-palavra": [
      ["toUpperCase", "eh-palavra"],
      ["toLowerCase", "eh-palavra"],
      ["indexOf", "eh-numero"],
      ["slice", "eh-palavra"],
      ["split", "sus"],
      ["trim", "eh-palavra"],
      ["replace", "eh-palavra"],
      ["length", "eh-numero"],
    ],
    sus: [
      ["push", "eh-numero"],
      ["pop", "sla"],
      ["length", "eh-numero"],
      ["join", "eh-palavra"],
      ["reverse", "sus"],
      ["slice", "sus"],
      ["indexOf", "eh-numero"],
      ["map", "sus"],
    ],
    bagulho: [["toString", "eh-palavra"]],
  }[type];

  if (!members) return null;
  return members.map(([name, ret]) => ({
    label: name,
    kind: 7,
    detail: `${name}: ${ret}`,
    insertText:
      name +
      (ret === "eh-palavra" || ret === "eh-numero" || ret === "sus" || ret === "sla" ? "($1)" : ""),
    insertTextFormat: 2,
  }));
}

export function startLSP() {
  startLSPServer().catch(console.error);
}
