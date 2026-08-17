import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { lex } from "./lexer.js";
import { parse } from "./parser.js";
import { optimize } from "./optimizer.js";
import { interpret, setDebugHook } from "./interpreter.js";
import { createEnv } from "./runtime.js";
import { setSource } from "./errors.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DAP_VERSION = JSON.parse(
  fs.readFileSync(resolve(__dirname, "../package.json"), "utf-8")
).version;

let running = false;
let paused = false;
let breakpoints = new Set();
let stepOver = false;
let stepInto = false;
let stepDepth = 0;
let requestId = 0;
let filePath = "";
let currentSource = "";
let currentLine = 0;
let currentEnv = null;
let continueResolve = null;
let commandQueue = [];
let nextBody = [];

function send(msg) {
  const body = JSON.stringify(msg);
  const header = `Content-Length: ${Buffer.byteLength(body, "utf-8")}\r\n\r\n`;
  process.stdout.write(header + body);
}

function sendEvent(evt, body) {
  send({ seq: ++requestId, type: "event", event: evt, body });
}

function sendResponse(request, body = {}) {
  send({
    seq: ++requestId,
    type: "response",
    request_seq: request.seq,
    success: true,
    command: request.command,
    body,
  });
}

function sendErrorResponse(request, message) {
  send({
    seq: ++requestId,
    type: "response",
    request_seq: request.seq,
    success: false,
    command: request.command,
    message,
    body: {},
  });
}

function pauseExecution() {
  paused = true;
  sendEvent("stopped", { reason: "breakpoint", threadId: 1, allThreadsStopped: true });
  return new Promise((resolve) => {
    continueResolve = resolve;
  });
}

async function debugHook(node, env) {
  currentLine = node.loc.line;
  currentEnv = env;

  if (stepOver) {
    stepOver = false;
    return pauseExecution();
  }

  if (stepInto) {
    stepInto = false;
    return pauseExecution();
  }

  if (breakpoints.has(node.loc.line)) {
    return pauseExecution();
  }
}

function resumeExecution() {
  if (continueResolve) {
    const r = continueResolve;
    continueResolve = null;
    paused = false;
    r();
  }
}

function collectVariables(env) {
  const vars = [];
  const seen = new Set();
  let cur = env;
  while (cur) {
    for (const k of Object.keys(cur)) {
      if (k === "__proto__" || seen.has(k)) continue;
      seen.add(k);
      vars.push({ name: k, value: cur[k], type: typeName(cur[k]) });
    }
    cur = Object.getPrototypeOf(cur);
    if (cur === Object.prototype) break;
  }
  return vars;
}

function typeName(v) {
  if (v === null || v === undefined) return "eh-nada";
  if (Array.isArray(v)) return "sus";
  switch (typeof v) {
    case "number":
      return "eh-numero";
    case "string":
      return "eh-palavra";
    case "boolean":
      return "vdd?";
    case "function":
      return "faz-ai";
    case "object":
      return "bagulho";
    default:
      return "sla";
  }
}

function makeVariable(v) {
  if (Array.isArray(v)) {
    return {
      name: "value",
      value: `sus (${v.length})`,
      variablesReference: v.length ? 1 : 0,
      type: "sus",
      _arr: v,
    };
  }
  if (typeof v === "object" && v !== null) {
    const keys = Object.keys(v);
    return {
      name: "value",
      value: `bagulho (${keys.length})`,
      variablesReference: keys.length ? 1 : 0,
      type: "bagulho",
      _obj: v,
    };
  }
  return { name: "value", value: String(v), variablesReference: 0, type: typeName(v) };
}

function handleMessage(request) {
  const { command, arguments: args = {} } = request;

  switch (command) {
    case "initialize":
      sendResponse(request, {
        supportsConfigurationDoneRequest: true,
        supportsEvaluateForHovers: true,
        supportsSetVariable: false,
        supportsStepBack: false,
        supportsTerminateRequest: true,
        exceptionBreakpointFilters: [],
      });
      break;

    case "launch": {
      filePath = args.program || "";
      if (!filePath || !fs.existsSync(filePath)) {
        sendErrorResponse(request, `Arquivo não encontrado: ${filePath}`);
        return;
      }
      sendResponse(request, {});
      sendEvent("initialized", {});
      break;
    }

    case "setBreakpoints": {
      const src = args.source?.path || filePath;
      const lines = (args.breakpoints || []).map((b) => b.line);
      if (src === filePath) {
        breakpoints = new Set(lines);
      }
      const bps = lines.map((line) => ({
        verified: true,
        line,
        source: { path: src },
      }));
      sendResponse(request, { breakpoints: bps });
      break;
    }

    case "configurationDone":
      sendResponse(request, {});
      runProgram();
      break;

    case "continue":
      sendResponse(request, { allThreadsContinued: true });
      resumeExecution();
      break;

    case "next": {
      stepOver = true;
      sendResponse(request, {});
      resumeExecution();
      break;
    }

    case "stepIn": {
      stepInto = true;
      sendResponse(request, {});
      resumeExecution();
      break;
    }

    case "pause":
      if (running && !paused) {
        paused = true;
        sendEvent("stopped", { reason: "pause", threadId: 1, allThreadsStopped: true });
      }
      sendResponse(request, {});
      break;

    case "stackTrace":
      sendResponse(request, {
        stackFrames: [
          {
            id: 1,
            name: "main",
            source: { path: filePath },
            line: currentLine,
            column: 1,
          },
        ],
        totalFrames: 1,
      });
      break;

    case "scopes":
      sendResponse(request, {
        scopes: [{ name: "Local", variablesReference: 1, expensive: false }],
      });
      break;

    case "variables": {
      const vars = collectVariables(currentEnv);
      sendResponse(request, {
        variables: vars.map((v) => ({
          name: v.name,
          value: String(v.value),
          variablesReference: 0,
          type: v.type,
        })),
      });
      break;
    }

    case "evaluate": {
      const expr = args.expression || "";
      const target = currentEnv ? currentEnv[expr] : undefined;
      if (target !== undefined) {
        sendResponse(request, {
          result: JSON.stringify(target),
          variablesReference: 0,
        });
      } else {
        sendErrorResponse(request, `Variável não encontrada: ${expr}`);
      }
      break;
    }

    case "terminate":
    case "disconnect":
      sendResponse(request, {});
      process.exit(0);
      break;

    default:
      sendErrorResponse(request, `Comando DAP desconhecido: ${command}`);
  }
}

function runProgram() {
  if (running) return;
  running = true;
  const code = fs.readFileSync(filePath, "utf-8");
  currentSource = code;
  setSource(code, filePath);

  setDebugHook(debugHook);

  let ast;
  try {
    const tokens = lex(code);
    ast = parse(tokens);
    ast = optimize(ast);
  } catch (e) {
    running = false;
    sendEvent("terminated", {});
    return;
  }

  interpret(ast, createEnv(resolve(filePath, "..")))
    .then(() => {
      running = false;
      setDebugHook(null);
      sendEvent("terminated", {});
    })
    .catch((e) => {
      running = false;
      setDebugHook(null);
      sendEvent("exited", { exitCode: 1 });
    });
}

export function startDAP() {
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
      handleMessage(JSON.parse(body));
    } catch (e) {
      console.error("DAP parse error:", e.message);
    }
  });

  process.stdin.on("end", () => process.exit(0));
}
