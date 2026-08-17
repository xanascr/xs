import { spawn } from "child_process";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BIN = join(__dirname, "..", "bin", "xs.js");
import { join } from "path";

function assert(condition, msg) {
  if (!condition) throw new Error("FAIL: " + msg);
  console.log("  PASS:", msg);
}

class LSPClient {
  constructor() {
    this.child = spawn("node", [BIN, "lsp"]);
    this.child.stderr.on("data", (d) => {
      console.error("LSP-STDERR:", d.toString().trim());
    });
    this.buffer = "";
    this.nextId = 1;
    this.waiters = new Map();
    this.child.stdout.on("data", (chunk) => {
      this.buffer += chunk.toString();
      this._drain();
    });
  }

  _drain() {
    while (true) {
      const idx = this.buffer.indexOf("\r\n\r\n");
      if (idx < 0) return;
      const header = this.buffer.slice(0, idx);
      const m = header.match(/Content-Length: (\d+)/);
      if (!m) return;
      const len = parseInt(m[1]);
      const start = idx + 4;
      if (this.buffer.length < start + len) return;
      const body = JSON.parse(this.buffer.slice(start, start + len));
      this.buffer = this.buffer.slice(start + len);
      this._handle(body);
    }
  }

  _handle(body) {
    if (body.id && this.waiters.has(body.id)) {
      this.waiters.get(body.id)(body);
      this.waiters.delete(body.id);
    } else if (body.method === "textDocument/publishDiagnostics") {
      this.lastDiagnostics = body.params;
    }
  }

  send(method, params) {
    const id = this.nextId++;
    const msg = { jsonrpc: "2.0", id, method, params };
    const body = JSON.stringify(msg);
    const header = `Content-Length: ${Buffer.byteLength(body, "utf-8")}\r\n\r\n`;
    this.child.stdin.write(header + body);
    return new Promise((resolve, reject) => {
      this.waiters.set(id, resolve);
      setTimeout(() => reject(new Error(`Timeout waiting for ${method}`)), 5000);
    });
  }

  notify(method, params) {
    const msg = { jsonrpc: "2.0", method, params };
    const body = JSON.stringify(msg);
    const header = `Content-Length: ${Buffer.byteLength(body, "utf-8")}\r\n\r\n`;
    this.child.stdin.write(header + body);
  }

  close() {
    this.child.stdin.end();
    this.child.kill();
  }
}

const code = `
resolve soma(a, b) {
  volta a + b
}
cria x = 10
grita-ae(soma(x, 5))
`;

const CODE = code.trim();

async function testLSP() {
  console.log("\n=== LSP ===");

  const lsp = new LSPClient();
  let init = null;
  for (let attempt = 0; attempt < 10 && !init; attempt++) {
    try {
      init = await lsp.send("initialize", { capabilities: {} });
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  if (!init) throw new Error("FAIL: initialize nunca respondeu");
  assert(init.result?.serverInfo?.name === "xanascript-lsp", "initialize retorna serverInfo");
  assert(init.result?.capabilities?.completionProvider, "capabilities tem completion");

  lsp.notify("initialized", {});
  lsp.notify("textDocument/didOpen", {
    textDocument: { uri: "file:///tmp/a.xs", text: CODE, version: 1 },
  });
  await new Promise((r) => setTimeout(r, 300));

  // diagnostics (no errors on valid code)
  assert(
    lsp.lastDiagnostics?.diagnostics?.length === 0,
    "didOpen sem diagnostics em código válido"
  );

  // diagnostics with type error
  lsp.notify("textDocument/didChange", {
    textDocument: { uri: "file:///tmp/a.xs", version: 2 },
    contentChanges: [{ text: 'cria n: eh-numero = "oi"' }],
  });
  await new Promise((r) => setTimeout(r, 300));
  assert(lsp.lastDiagnostics?.diagnostics?.length > 0, "didChange reporta erro de tipo");

  // completion
  const comp = await lsp.send("textDocument/completion", {
    textDocument: { uri: "file:///tmp/a.xs" },
    position: { line: 5, character: 0 },
  });
  const labels = comp.result?.items?.map((i) => i.label) || [];
  assert(labels.includes("resolve"), "completion inclui keyword resolve");
  assert(labels.includes("grita-ae"), "completion inclui builtin grita-ae");

  // hover on builtin
  lsp.notify("textDocument/didChange", {
    textDocument: { uri: "file:///tmp/a.xs", version: 3 },
    contentChanges: [{ text: CODE }],
  });
  await new Promise((r) => setTimeout(r, 300));
  const hoverLine = CODE.split("\n").findIndex((l) => l.includes("grita-ae"));
  const hover = await lsp.send("textDocument/hover", {
    textDocument: { uri: "file:///tmp/a.xs" },
    position: { line: hoverLine, character: CODE.split("\n")[hoverLine].indexOf("grita-ae") + 1 },
  });
  assert(
    hover.result && /grita-ae/.test(hover.result.contents?.value || ""),
    "hover sobre builtin"
  );

  // go-to-def on x
  const defLine = CODE.split("\n").findIndex((l) => l.includes("soma(x"));
  const def = await lsp.send("textDocument/definition", {
    textDocument: { uri: "file:///tmp/a.xs" },
    position: { line: defLine, character: CODE.split("\n")[defLine].indexOf("x") },
  });
  assert(def.result && def.result.range, "definition encontra alvo");
  assert(def.result.range.start.line === 3, "definition aponta para cria x = 10");

  // hover com tipo inferido
  const hoverX = await lsp.send("textDocument/hover", {
    textDocument: { uri: "file:///tmp/a.xs" },
    position: { line: defLine, character: CODE.split("\n")[defLine].indexOf("x") },
  });
  assert(
    /x: eh-numero/.test(hoverX.result?.contents?.value || ""),
    "hover mostra tipo de variável"
  );

  // hover em function decl
  const fnLine = 0;
  const hoverFn = await lsp.send("textDocument/hover", {
    textDocument: { uri: "file:///tmp/a.xs" },
    position: { line: fnLine, character: CODE.split("\n")[fnLine].indexOf("soma") + 1 },
  });
  assert(/soma: faz-ai/.test(hoverFn.result?.contents?.value || ""), "hover mostra tipo de função");

  // member completion após "."
  const memberCode = 'cria s = "oi"\ns.to';
  lsp.notify("textDocument/didChange", {
    textDocument: { uri: "file:///tmp/a.xs", version: 4 },
    contentChanges: [{ text: memberCode }],
  });
  await new Promise((r) => setTimeout(r, 300));
  const mcomp = await lsp.send("textDocument/completion", {
    textDocument: { uri: "file:///tmp/a.xs" },
    position: { line: 1, character: 4 },
  });
  const mlabels = mcomp.result?.items?.map((i) => i.label) || [];
  assert(mlabels.includes("toUpperCase"), "member completion inclui toUpperCase");
  assert(mlabels.includes("indexOf"), "member completion inclui indexOf");

  // rename
  lsp.notify("textDocument/didChange", {
    textDocument: { uri: "file:///tmp/a.xs", version: 5 },
    contentChanges: [{ text: CODE }],
  });
  await new Promise((r) => setTimeout(r, 300));
  const ren = await lsp.send("textDocument/rename", {
    textDocument: { uri: "file:///tmp/a.xs" },
    position: { line: defLine, character: CODE.split("\n")[defLine].indexOf("x") },
    newName: "y",
  });
  const edits = ren.result?.changes?.["file:///tmp/a.xs"] || [];
  assert(edits.length >= 2, "rename gera edits para todas ocorrências");
  assert(
    edits.every((e) => e.newText === "y"),
    "rename usa o novo nome"
  );
  assert(
    edits.some((e) => e.range.start.line === 3),
    "rename inclui a declaração"
  );
  assert(
    edits.some((e) => e.range.start.line === 4),
    "rename inclui o uso"
  );

  // shutdown + exit
  await lsp.send("shutdown", {});
  lsp.notify("exit", {});
  lsp.close();

  console.log("  LSP: OK\n");
}

testLSP().catch((e) => {
  console.error(e);
  process.exit(1);
});
