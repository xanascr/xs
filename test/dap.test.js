import { spawn } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BIN = join(__dirname, "..", "bin", "xs.js");

function assert(condition, msg) {
  if (!condition) throw new Error("FAIL: " + msg);
  console.log("  PASS:", msg);
}

class DAPClient {
  constructor() {
    this.child = spawn("node", [BIN, "debuga"]);
    this.child.stderr.on("data", () => {});
    this.buffer = "";
    this.seq = 1;
    this.events = [];
    this.responses = new Map();
    this.responseWaiters = [];
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
    if (body.type === "event") {
      this.events.push(body);
      const w = this.responseWaiters.find((w) => w.event === body.event);
      if (w) {
        this.responseWaiters = this.responseWaiters.filter((x) => x !== w);
        w.resolve(body);
      }
    } else if (body.type === "response") {
      const w = this.responseWaiters.find((w) => w.reqSeq === body.request_seq);
      if (w) {
        this.responseWaiters = this.responseWaiters.filter((x) => x !== w);
        w.resolve(body);
      }
    }
  }

  send(command, args = {}) {
    const seq = this.seq++;
    const msg = { seq, type: "request", command, arguments: args };
    const body = JSON.stringify(msg);
    const header = `Content-Length: ${Buffer.byteLength(body, "utf-8")}\r\n\r\n`;
    this.child.stdin.write(header + body);
    return new Promise((resolve) => {
      this.responseWaiters.push({ reqSeq: seq, resolve });
    });
  }

  waitEvent(event) {
    const existing = this.events.find((e) => e.event === event);
    if (existing) {
      this.events = this.events.filter((e) => e !== existing);
      return Promise.resolve(existing);
    }
    return new Promise((resolve) => {
      this.responseWaiters.push({ event, resolve });
    });
  }

  close() {
    this.child.stdin.end();
    this.child.kill();
  }
}

async function testDAP() {
  console.log("\n=== DAP ===");

  const dir = mkdtempSync(join(tmpdir(), "xs-dap-"));
  const prog = join(dir, "prog.xs");
  writeFileSync(
    prog,
    `cria a = 1
cria b = 2
grita-ae(a + b)
grita-ae("fim")
`
  );

  const dap = new DAPClient();
  await new Promise((r) => setTimeout(r, 300));

  const init = await dap.send("initialize", { adapterID: "xanascript" });
  assert(init.success, "initialize responde ok");
  assert(init.body?.supportsConfigurationDoneRequest, "initialize anuncia configurationDone");

  const launch = await dap.send("launch", { program: prog });
  assert(launch.success, "launch aceita programa");
  await dap.waitEvent("initialized");

  // set breakpoint na linha 3
  const bp = await dap.send("setBreakpoints", {
    source: { path: prog },
    breakpoints: [{ line: 3 }],
  });
  assert(bp.success, "setBreakpoints ok");
  assert(bp.body?.breakpoints?.[0]?.verified === true, "breakpoint verificado");

  const done = await dap.send("configurationDone");
  assert(done.success, "configurationDone ok");

  // deve parar na linha 3
  const stopped = await dap.waitEvent("stopped");
  assert(stopped.body?.reason === "breakpoint", "parou por breakpoint");

  // stackTrace
  const st = await dap.send("stackTrace", { threadId: 1 });
  assert(st.body?.stackFrames?.[0]?.line === 3, "stackTrace aponta linha 3");
  assert(st.body?.stackFrames?.[0]?.source?.path === prog, "stackTrace aponta arquivo");

  // scopes + variables
  const sc = await dap.send("scopes", { frameId: 1 });
  assert(sc.body?.scopes?.[0]?.name === "Local", "scopes tem Local");
  const vars = await dap.send("variables", { variablesReference: 1 });
  const names = vars.body?.variables?.map((v) => v.name) || [];
  assert(names.includes("a") && names.includes("b"), "variables lista a e b");
  const a = vars.body.variables.find((v) => v.name === "a");
  assert(a.value === "1" && a.type === "eh-numero", "variables mostra valor e tipo de a");

  // evaluate
  const ev = await dap.send("evaluate", { expression: "b", frameId: 1 });
  assert(ev.body?.result === "2", "evaluate avalia b");

  // continue -> termina
  const cont = await dap.send("continue", { threadId: 1 });
  assert(cont.success, "continue ok");
  const exited = await Promise.race([dap.waitEvent("terminated"), dap.waitEvent("exited")]);
  assert(exited.event === "terminated" || exited.event === "exited", "programa terminou");

  dap.close();
  rmSync(dir, { recursive: true, force: true });
  console.log("  DAP: OK\n");
}

testDAP().catch((e) => {
  console.error(e);
  process.exit(1);
});
