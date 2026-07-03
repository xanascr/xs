import fs from "fs";
import { lex } from "./lexer.js";
import { parse } from "./parser.js";
import { setSource, XSError, formatError } from "./errors.js";

const KEYWORDS = [
  "PARTIU", "ACABOU", "CRIA", "SE", "LIGA", "SO", "SENAO",
  "REPETE", "NA", "MORAL", "CHAMA", "ESSE", "CARA", "VOLTA",
  "IMPORTA", "EXPORTA", "SOLTA", "O", "GRITO", "FALA", "BAIXO",
  "AGORA", "VAI", "ESPERA", "AI", "SORTEIA", "PARSEIA", "OUVE",
  "AQUI", "VERDADEIRO", "FALSO", "NULO", "TENTA", "PEGA", "ERRO",
  "ASSINCRONO", "VOA", "CONTINUA", "CLASSE", "HERDA", "CONSTRUTOR",
  "ISTO", "NOVA", "METODO", "ESCOLHE", "CASO", "PADRAO", "COMBINA",
  "CRIA", "SERVIDOR", "PARA", "TAMANHO", "DIVIDE", "TEXTO",
  "ENCONTRA", "DECODIFICA", "URL", "JUNTAR", "TESTE", "AFIRMA",
  "ASSUNTO", "TAREFA", "MACRO",
];

const BUILTIN_FUNCTIONS = [
  { name: "SOLTA_O_GRITO", params: "...args", doc: "console.log()" },
  { name: "FALA_BAIXO", params: "...args", doc: "console.warn()" },
  { name: "AGORA_VAI", params: "url", doc: "HTTP GET request" },
  { name: "ESPERA_AI", params: "ms", doc: "setTimeout()" },
  { name: "SORTEIA", params: "min, max", doc: "Random integer" },
  { name: "PARSEIA", params: "json", doc: "JSON.parse()" },
  { name: "OUVE_AQUI", params: "chave", doc: "ENV variable" },
  { name: "TAMANHO", params: "valor", doc: "Length of array/string" },
  { name: "DIVIDE_TEXTO", params: "texto, separador", doc: "String split" },
  { name: "ENCONTRA", params: "texto, regex", doc: "Regex match" },
  { name: "DECODIFICA_URL", params: "url", doc: "URL decode" },
  { name: "JUNTAR", params: "array, separador", doc: "Array join" },
  { name: "AGORA", params: "", doc: "Date.now()" },
  { name: "AFIRMA", params: "condicao", doc: "Assert truthy" },
  { name: "ASSUNTO", params: "a, b", doc: "Assert equal" },
  { name: "CRIA_SERVIDOR", params: "porta, handler", doc: "Create HTTP server" },
  { name: "PARA_SERVIDOR", params: "server", doc: "Stop HTTP server" },
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
          },
          serverInfo: { name: "xanascript-lsp", version: "2.0.0" },
        },
      });
      break;

    case "initialized":
      sendMessage({ jsonrpc: "2.0", method: "window/logMessage", params: { type: 3, message: "XanaScript LSP iniciado" } });
      break;

    case "textDocument/didOpen":
    case "textDocument/didChange": {
      const uri = params.textDocument?.uri || params.textDocument?.uri;
      const text = params.textDocument?.text || params.contentChanges?.[0]?.text;
      if (uri && text) {
        documents.set(uri, text);
        validateDocument(uri, text);
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
        const items = getCompletions(text, line, col);
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

    case "shutdown":
      sendMessage({ jsonrpc: "2.0", id, result: null });
      break;

    case "exit":
      process.exit(0);
      break;
  }
}

function validateDocument(uri, text) {
  setSource(text, uri);
  const diagnostics = [];

  try {
    const tokens = lex(text);
    parse(tokens);
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

  const fn = BUILTIN_FUNCTIONS.find(f => f.name === word);
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
        value: `\`\`\`xs\n${word}\n\`\`\`\n\nPalavra-chave XanaScript`,
      },
    };
  }

  return null;
}

function getDefinition(text, line, col) {
  const word = getWordAt(text, line, col);
  if (!word) return null;

  const patterns = [
    new RegExp(`CHAMA\\s+ESSE\\s+CARA\\s+${word}\\b`),
    new RegExp(`CRIA\\s+${word}\\b`),
    new RegExp(`CLASSE\\s+${word}\\b`),
    new RegExp(`TAREFA\\s+${word}\\b`),
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
  while (start > 0 && /[a-zA-Z0-9_]/.test(lineText[start - 1])) start--;
  while (end < lineText.length && /[a-zA-Z0-9_]/.test(lineText[end])) end++;

  return start < end ? lineText.slice(start, end) : null;
}

export function startLSP() {
  startLSPServer().catch(console.error);
}
