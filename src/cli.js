#!/usr/bin/env node

import fs from "fs";
import path from "path";
import readline from "readline";
import { runXS } from "./runtime.js";
import { lex } from "./lexer.js";
import { parse } from "./parser.js";
import { optimize } from "./optimizer.js";
import { generate } from "./codegen.js";
import { setSource, XSError, formatError } from "./errors.js";
import { interpret } from "./interpreter.js";
import { createEnv } from "./runtime.js";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let VERSION;
try {
  VERSION = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf-8")
  ).version;
} catch (_) {
  VERSION = "3.0.0";
}

const [, , rawCmd, ...rawRest] = process.argv;

const CMD_ALIASES = {
  roda: "run",
  monta: "build",
  verifica: "check",
  teste: "test",
  vigia: "dev",
  ajeita: "fmt",
  "bate-papo": "repl",
  "fala-com-ide": "lsp",
  documenta: "docs",
  rascunho: "init",
  "bota-ai": "install",
  "solta-ai": "publish",
  stalkeia: "search",
  mede: "bench",
};

const FLAG_ALIASES = {
  "--otimizado": "--opt",
  "--sozinho": "--standalone",
  "--olha": "--watch",
};

let cmd = CMD_ALIASES[rawCmd] || rawCmd;
const rest = rawRest.map((a) => FLAG_ALIASES[a] || a);

if (cmd === "run" && rest.includes("--vm")) {
  cmd = "vm";
  rest.splice(rest.indexOf("--vm"), 1);
}

const HELP = `
XanaScript CLI - v${VERSION}
  xana run <file>          Runs a .xs file (AST Interpreter)      [roda]
  xana vm  <file>          Runs a .xs file (Bytecode VM)          [roda --vm]
  xana fmt <file>          Formats a .xs file                     [ajeita]
  xana build <file>        Generates JavaScript from .xs          [monta]
  xana build --opt <file>  Generates ultra-optimized JS           [--otimizado]
  xana build --wasm <file> Generates WebAssembly (.wat + .wasm)
  xana build --standalone <file>  Generates a single .js with runtime  [--sozinho]
  xana check <file>        Type-checks a .xs file                 [verifica]
  xana dev [file]          Watcher with hot reload                [vigia]
  xana lsp                 Language Server Protocol (stdin/stdout) [fala-com-ide]
  xana debuga              Debug Adapter Protocol (stdin/stdout)
  xana repl                Interactive mode                       [bate-papo]
  xana bench               Runs the benchmark                     [mede]

PACKAGE MANAGER:
  xana init [dir]          Creates a new XanaScript project       [rascunho]
  xana install [package]   Installs dependencies                  [bota-ai]
  xana publish             Publishes a package to the registry    [solta-ai]
  xana search <term>       Searches packages                      [stalkeia]
  xana login               Logs into the registry
  xana whoami              Shows the logged-in user
  xana logout              Logs out of the registry

TESTS:
  xana test [dir]          Runs all tests (*test*.xs)             [teste]
  xana test --watch        Watch mode for tests                   [teste --olha]

DOCUMENTATION:
  xana docs [src] [out]    Generates HTML documentation           [documenta]

TASKS:
  xana <task>              Runs a task from tarefas.xs
                           (auto-detected)

  xana help                Shows help
`;

if (cmd === "-v" || cmd === "--version" || cmd === "version") {
  console.log("XanaScript v" + VERSION);
  process.exit(0);
}

if (!cmd || cmd === "help") {
  console.log(HELP);
  process.exit(0);
}

(async () => {
  try {
    if (cmd === "init") {
      const { initProject } = await import("./pkgmgr.js");
      await initProject(rest[0]);
      return;
    }
    if (cmd === "install") {
      const { installPackages } = await import("./pkgmgr.js");
      await installPackages(rest);
      return;
    }
    if (cmd === "publish") {
      const { publishPackage } = await import("./pkgmgr.js");
      await publishPackage();
      return;
    }
    if (cmd === "search") {
      const { searchPackages } = await import("./pkgmgr.js");
      await searchPackages(rest.join(" "));
      return;
    }
    if (cmd === "login") {
      const { loginUser } = await import("./pkgmgr.js");
      await loginUser();
      return;
    }
    if (cmd === "whoami") {
      const { whoami } = await import("./pkgmgr.js");
      whoami();
      return;
    }
    if (cmd === "logout") {
      const { logoutUser } = await import("./pkgmgr.js");
      logoutUser();
      return;
    }
    if (cmd === "test") {
      const { runTests } = await import("./testrunner.js");
      const watch = rest.includes("--watch");
      const dir = (rest.find((r) => !r.startsWith("-")) || ".").trim();
      if (!watch) {
        await runTests(dir);
        return;
      }
      console.log(` Watching for changes in: ${dir}`);
      let running = false;
      const run = async () => {
        if (running) return;
        running = true;
        try {
          await runTests(dir);
        } finally {
          running = false;
        }
      };
      await run();
      const testFile = (f) => f.endsWith(".xs") && f.toLowerCase().includes("test");
      const collect = (d) => {
        const files = [];
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          const full = path.join(d, e.name);
          if (e.isDirectory() && e.name !== "node_modules" && !e.name.startsWith("."))
            files.push(...collect(full));
          else if (e.isFile() && testFile(e.name)) files.push(full);
        }
        return files;
      };
      const stamps = new Map();
      const snapshot = () => {
        for (const f of collect(dir)) stamps.set(f, fs.statSync(f).mtimeMs);
      };
      snapshot();
      await simpleWatchAll(dir, collect, stamps, run);
      return;
    }
    if (cmd === "docs") {
      const { generateDocs } = await import("./docsgen.js");
      await generateDocs(rest[0] || ".", rest[1] || "docs");
      return;
    }
    if (cmd === "lsp") {
      const { startLSP } = await import("./lsp.js");
      startLSP();
      return;
    }
    if (cmd === "debuga") {
      const { startDAP } = await import("./dap.js");
      startDAP();
      return;
    }
    if (cmd === "repl") {
      await startREPL();
      return;
    }
    if (cmd === "dev") {
      const watchFile = rest[0] || "index.xs";
      if (!fs.existsSync(watchFile)) {
        console.log(` File not found: ${watchFile}`);
        process.exit(1);
      }
      console.log(` Watching: ${watchFile}`);
      const chokidar = await import("chokidar").catch(() => null);
      if (!chokidar) {
        console.log("  Using polling fallback...");
        await simpleWatch(watchFile);
        return;
      }
      chokidar.watch(watchFile, { persistent: true }).on("change", async () => {
        console.log(`\n↻ ${new Date().toLocaleTimeString()}`);
        try {
          const c = fs.readFileSync(watchFile, "utf-8");
          setSource(c, watchFile);
          await runXS(c, process.cwd(), watchFile);
          console.log("   OK");
        } catch (e) {
          if (e instanceof XSError) {
            console.error(e.toString());
          } else {
            console.error("", e.message);
          }
        }
      });
      await new Promise(() => {});
      return;
    }
    if (cmd === "bench") {
      const { runBench } = await import("./bench.js");
      await runBench();
      return;
    }
    const taskFiles = ["tarefas.xs", "TASKS.xs", "tasks.xs"];
    const taskFile = taskFiles.find((f) => fs.existsSync(f));
    let taskRan = false;
    if (taskFile && cmd !== "test" && cmd !== "docs") {
      const taskCode = fs.readFileSync(taskFile, "utf-8");
      setSource(taskCode, taskFile);
      const taskTokens = lex(taskCode);
      const taskAst = parse(taskTokens);
      const taskOpt = optimize(taskAst);
      const taskEnv = createEnv(process.cwd());

      await interpret(taskOpt, taskEnv);

      if (taskEnv.__tasks && taskEnv.__tasks[cmd]) {
        await taskEnv.__tasks[cmd]();
        taskRan = true;
      }
    }
    if (taskRan) return;
    const file = rest.find((r) => !r.startsWith("-")) || (cmd.endsWith(".xs") ? cmd : null);
    if (!file) {
      console.log("Specify a .xs file");
      process.exit(1);
    }
    if (cmd === "fmt") {
      const flags = rest.filter((r) => r.startsWith("-"));
      const targets = rest.filter((r) => !r.startsWith("-"));
      const files = [];
      for (const t of targets.length > 0 ? targets : [file]) {
        if (fs.existsSync(t) && fs.statSync(t).isDirectory()) {
          const walk = (dir) => {
            for (const e of fs.readdirSync(dir)) {
              const full = path.join(dir, e);
              if (fs.statSync(full).isDirectory()) walk(full);
              else if (full.endsWith(".xs")) files.push(full);
            }
          };
          walk(t);
        } else {
          files.push(t);
        }
      }
      let failed = false;
      for (const f of files) {
        const c = fs.readFileSync(f, "utf-8");
        setSource(c, f);
        const tokens = lex(c);
        const ast = parse(tokens);
        const out = formatAST(ast) + "\n";
        if (flags.includes("--check")) {
          if (out !== c) {
            console.error(`  ${f}: needs formatting`);
            failed = true;
          }
        } else {
          console.log(out);
        }
      }
      if (failed) process.exit(1);
      return;
    }
    const code = fs.readFileSync(file, "utf-8");
    setSource(code, file);
    if (cmd === "run" || cmd === ".") {
      if (rest.includes("--strict") || rest.includes("-s")) {
        const tokens = lex(code);
        const ast = parse(tokens);
        const { checkTypes } = await import("./typecheck.js");
        const errors = checkTypes(ast);
        if (errors.length > 0) {
          for (const e of errors) console.error(e.toString());
          console.error(" Aborted by --strict (type errors)");
          process.exit(1);
        }
      }
      await runXS(code, path.dirname(path.resolve(file)), file);
      return;
    }
    if (cmd === "vm") {
      const { compile } = await import("./bytecode/compiler.js");
      const { run } = await import("./bytecode/vm.js");

      const tokens = lex(code);
      let ast = parse(tokens);
      ast = optimize(ast);
      const bytecode = compile(ast);

      console.log("BYTECODE:");
      console.log(bytecode);
      console.log("\nRESULT:");
      console.log(run(bytecode));
      return;
    }
    if (cmd === "run-wasm") {
      const tokens = lex(code);
      let ast = parse(tokens);
      ast = optimize(ast);
      const { runWasm, getWasmRuntime } = await import("./wasm_binary.js");
      const runner = await runWasm(ast, { env: getWasmRuntime() });
      console.log(runner.main());
      return;
    }
    if (cmd === "build") {
      const tokens = lex(code);
      let ast = parse(tokens);
      ast = optimize(ast);
      if (rest.includes("--wasm") || rest.includes("-w")) {
        const { compileWasm, runWasm, getWasmRuntime, generateWasm } =
          await import("./wasm_binary.js");
        const wasmFile = file.replace(/\.xs$/, ".wasm");
        const watFile = file.replace(/\.xs$/, ".wat");
        try {
          const wasmBytes = compileWasm(ast);
          fs.writeFileSync(wasmFile, Buffer.from(wasmBytes));
          console.log(` Generated .wasm: ${wasmFile} (${wasmBytes.length} bytes)`);
          try {
            const runner = await runWasm(ast, { env: getWasmRuntime() });
            const result = runner.main();
            console.log(`  Test: main() = ${result}`);
          } catch (e) {
            console.log(`   Execution: ${e.message}`);
          }
        } catch (e) {
          console.log(`   Binary fallback: ${e.message}`);
          console.log(`  Generating WAT as an alternative...`);
          const wat = generateWasm(ast);
          fs.writeFileSync(watFile, wat, "utf-8");
          console.log(` Generated WAT: ${watFile}`);
          console.log(`  To compile: npm install -g wabt && wat2wasm ${watFile} -o ${wasmFile}`);
        }
        return;
      }
      if (rest.includes("--standalone") || rest.includes("-s")) {
        const { generateOpt, inferTypes } = await import("./codegen_opt.js");
        const types = inferTypes(ast);
        const jsCode = generateOpt(ast, types);
        const standalone = buildStandalone(jsCode, file);
        const outFile = file.replace(/\.xs$/, ".js");
        fs.writeFileSync(outFile, standalone, "utf-8");
        console.log(` Generated: ${outFile}`);
        console.log(`  Run with: node ${outFile}`);
        return;
      }
      if (rest.includes("--opt") || rest.includes("-o")) {
        const { generateOpt, inferTypes } = await import("./codegen_opt.js");
        const types = inferTypes(ast);
        console.log(generateOpt(ast, types));
      } else {
        console.log(generate(ast));
      }
      return;
    }
    if (cmd === "check" || cmd === "verifica") {
      const tokens = lex(code);
      const ast = parse(tokens);
      const { checkTypes } = await import("./typecheck.js");
      const errors = checkTypes(ast);
      if (errors.length > 0) {
        for (const e of errors) {
          console.error(e.toString());
        }
        process.exit(1);
      }
      console.log(" Types OK");
      return;
    }
    // Default: run the .xs file
    if (file) {
      await runXS(code, path.dirname(path.resolve(file)), file);
      return;
    }
    console.log(`Unknown command: ${cmd}`);
    console.log(HELP);
  } catch (e) {
    if (e instanceof XSError) {
      console.error(e.toString());
    } else {
      console.error(`\x1b[1;31m╔═══ XanaScript ERROR \x1b[0m`);
      console.error(`\x1b[1;31m║\x1b[0m ${e.message}`);
      if (e.loc) {
        console.error(
          `\x1b[1;31m║\x1b[0m \x1b[2m  --> ${e.loc.file}:${e.loc.line}:${e.loc.column}\x1b[0m`
        );
      }
      console.error(`\x1b[1;31m╚══════════════════════════════════\x1b[0m`);
    }
    process.exit(1);
  }
})();

async function startREPL() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "xs> ",
  });

  let env = createEnv(process.cwd());

  console.log("XanaScript REPL - type .help for commands");
  rl.prompt();

  rl.on("line", async (line) => {
    line = line.trim();
    if (!line) {
      rl.prompt();
      return;
    }

    if (line === ".exit") {
      rl.close();
      return;
    }
    if (line === ".help") {
      console.log("Commands: .exit, .help, .reset");
      rl.prompt();
      return;
    }
    if (line === ".reset") {
      env = createEnv(process.cwd());
      console.log("Environment reset");
      rl.prompt();
      return;
    }

    try {
      setSource(line, "<repl>");
      const toks = lex(line);
      const ast = parse(toks);
      if (ast.body.length === 1 && ast.body[0].type === "Program") {
        const result = await interpret(ast, env);
        if (result !== undefined) console.log(result);
      } else {
        for (const stmt of ast.body) {
          const result = await interpret(stmt, env);
          if (result !== undefined) console.log(result);
        }
      }
    } catch (e) {
      if (e instanceof XSError) {
        console.error(e.toString());
      } else {
        console.error("error:", e.message);
      }
    }

    rl.prompt();
  });

  rl.on("close", () => {
    console.log("Bye!");
    process.exit(0);
  });
}

function simpleWatch(file) {
  let last = fs.statSync(file).mtimeMs;
  console.log(`  Polling every 500ms`);
  return new Promise(async (resolve) => {
    while (true) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        const mtime = fs.statSync(file).mtimeMs;
        if (mtime > last) {
          last = mtime;
          console.log(`\n↻ ${new Date().toLocaleTimeString()}`);
          try {
            const c = fs.readFileSync(file, "utf-8");
            setSource(c, file);
            const { runXS } = await import("./runtime.js");
            await runXS(c, process.cwd(), file);
            console.log("   OK");
          } catch (e) {
            if (e instanceof XSError) {
              console.error(e.toString());
            } else {
              console.error("", e.message);
            }
          }
        }
      } catch (e) {
        console.error("  Error checking file:", e.message);
      }
    }
  });
}

function simpleWatchAll(dir, collect, stamps, onRun) {
  console.log("  Polling every 500ms");
  return new Promise(async (resolve) => {
    while (true) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        const current = new Map();
        for (const f of collect(dir)) current.set(f, fs.statSync(f).mtimeMs);
        let changed = false;
        for (const [f, m] of current) {
          if (!stamps.has(f) || stamps.get(f) !== m) {
            changed = true;
            break;
          }
        }
        if (!changed) {
          for (const f of stamps.keys()) {
            if (!current.has(f)) {
              changed = true;
              break;
            }
          }
        }
        if (changed) {
          stamps.clear();
          for (const [f, m] of current) stamps.set(f, m);
          console.log(`\n↻ ${new Date().toLocaleTimeString()}`);
          await onRun();
        }
      } catch (e) {
        console.error("  Error watching tests:", e.message);
      }
    }
  });
}

function fmtType(t) {
  if (t === null || t === undefined) return "sla";
  if (typeof t === "string") return t;
  if (t.args && t.args.length > 0) return `${t.name}<${t.args.map(fmtType).join(", ")}>`;
  return t.name;
}

function fmtTypeDecl(node, indent) {
  const sp = "  ".repeat(indent);
  if (node.kind === "struct") {
    const props = node.props.map((p) => `\n${sp}  ${p.name}: ${fmtType(p.type)}`).join("");
    return `tipo ${node.name} {${props}\n${sp}}`;
  }
  if (node.kind === "union") {
    return `tipo ${node.name} = ${node.props.map(fmtType).join(" | ")}`;
  }
  if (node.kind === "fn") {
    const params = (node.props.params || [])
      .map((p, i) => {
        const pt =
          node.props.paramTypes && node.props.paramTypes[i]
            ? `: ${fmtType(node.props.paramTypes[i])}`
            : "";
        return `${p}${pt}`;
      })
      .join(", ");
    const ret = node.props.returnType ? `: ${fmtType(node.props.returnType)}` : "";
    return `tipo ${node.name} = (${params})${ret}`;
  }
  return `tipo ${node.name} = ${fmtType(node.value)}`;
}

function formatAST(node, indent = 0) {
  const sp = "  ".repeat(indent);
  switch (node.type) {
    case "Program":
      return node.body.map((n) => formatAST(n, 0)).join("\n");
    case "Block":
      return `{\n${node.body.map((n) => formatAST(n, indent + 1)).join("\n")}\n${sp}}`;
    case "VarDecl": {
      const hint = node.typeHint ? `: ${fmtType(node.typeHint)}` : "";
      const kw = node.kind === "const" ? "lei" : node.kind === "global" ? "fofoca" : "cria";
      return `${sp}${kw} ${node.id}${hint} = ${formatAST(node.init, indent)}`;
    }
    case "Assign":
      return `${sp}${formatAST(node.left, indent)} = ${formatAST(node.right, indent)}`;
    case "IfStmt": {
      let s = `${sp}se-pah (${formatAST(node.test, indent)}) ${formatAST(node.cons, indent)}`;
      if (node.alt) s += ` ai ${formatAST(node.alt, indent)}`;
      return s;
    }
    case "ForStmt": {
      const init = node.init ? formatAST(node.init, indent) : "";
      const test = formatAST(node.test, indent);
      const update = node.update ? formatAST(node.update, indent) : "";
      return `${sp}repete-na-moral (${init}; ${test}; ${update}) ${formatAST(node.body, indent)}`;
    }
    case "WhileStmt":
      return `${sp}repete-enquanto (${formatAST(node.test, indent)}) ${formatAST(node.body, indent)}`;
    case "FunctionDecl": {
      const tparams = node.typeParams ? `<${node.typeParams.join(", ")}>` : "";
      const params = node.params
        .map((p, i) => {
          const pt =
            node.paramTypes && node.paramTypes[i] ? `: ${fmtType(node.paramTypes[i])}` : "";
          return `${p}${pt}`;
        })
        .join(", ");
      const ret = node.returnType ? `: ${fmtType(node.returnType)}` : "";
      return `${sp}resolve ${node.name}${tparams}(${params})${ret} ${formatAST(node.body, indent)}`;
    }
    case "TypeDecl":
      return `${sp}${fmtTypeDecl(node, indent)}`;
    case "ReturnStmt":
      return `${sp}volta${node.arg ? " " + formatAST(node.arg, indent) : ""}`;
    case "Call": {
      const args = node.args.map((a) => formatAST(a, indent)).join(", ");
      if (node.callee.type === "Ident") {
        const name = node.callee.name;
        if (name === "grita-ae") return `${sp}grita-ae(${args})`;
        if (name === "sussurra") return `${sp}sussurra(${args})`;
        if (name === "stalkeia") return `${sp}stalkeia(${args})`;
        if (name === "aguenta-ai") return `${sp}aguenta-ai(${args})`;
        if (name === "escolhe") return `${sp}escolhe(${args})`;
        if (name === "desembola") return `${sp}desembola(${args})`;
        if (name === "bisbilhota") return `${sp}bisbilhota(${args})`;
        if (name === "escuta") return `${sp}escuta(${args})`;
        if (name === "terminamos!") return `${sp}terminamos!(${args})`;
        return `${sp}${node.callee.name}(${args})`;
      }
      return `${sp}${formatAST(node.callee, indent)}(${args})`;
    }
    case "Member":
      return `${formatAST(node.obj, indent)}.${node.prop}`;
    case "OptionalMember":
      return `${formatAST(node.obj, indent)}?.${node.prop}`;
    case "IndexExpr":
      return `${formatAST(node.obj, indent)}[${formatAST(node.index, indent)}]`;
    case "Binary":
      return `(${formatAST(node.left, indent)} ${node.op} ${formatAST(node.right, indent)})`;
    case "Unary":
      return `${node.op}${formatAST(node.arg, indent)}`;
    case "TypeOf":
      return `tipo-de(${formatAST(node.arg, indent)})`;
    case "InstanceOf":
      return `instancia-de(${formatAST(node.arg, indent)}, ${formatAST(node.cls, indent)})`;
    case "Spread":
      return `...${formatAST(node.arg, indent)}`;
    case "Ident":
      return node.name;
    case "Num":
      return String(node.value);
    case "Str":
      return JSON.stringify(node.value);
    case "Bool":
      return node.value ? "verdadeiro" : "falso";
    case "Nil":
      return "nulo";
    case "ArrayExpr":
      return `[${node.items.map((i) => formatAST(i, indent)).join(", ")}]`;
    case "ObjectExpr":
      return `{${node.props.map((p) => (p.spread ? `...${formatAST(p.value, indent)}` : `${p.key}: ${formatAST(p.value, indent)}`)).join(", ")}}`;
    case "TryCatchStmt": {
      let s = `${sp}tenta ${formatAST(node.tryBlock, indent)}`;
      if (node.catchParam) s += ` fodeu(${node.catchParam}) ${formatAST(node.catchBlock, indent)}`;
      if (node.finallyBlock) s += ` no-fim ${formatAST(node.finallyBlock, indent)}`;
      return s;
    }
    case "ImportExpr":
      return `traz-ai ${JSON.stringify(node.path)}`;
    case "ImportStmt":
      return `${sp}traz-ai ${JSON.stringify(node.path)}`;
    case "ExportStmt":
      return `${sp}manda-ai ${node.name}`;
    case "BreakStmt":
      return `${sp}mete-o-pe`;
    case "ContinueStmt":
      return `${sp}segue-o-baile`;
    case "Ternary":
      return `(${formatAST(node.test, indent)} ? ${formatAST(node.cons, indent)} : ${formatAST(node.alt, indent)})`;
    case "ArrowFunction": {
      const params = node.params
        .map((p, i) => {
          const pt =
            node.paramTypes && node.paramTypes[i] ? `: ${fmtType(node.paramTypes[i])}` : "";
          return `${p}${pt}`;
        })
        .join(", ");
      const ret = node.returnType ? `: ${fmtType(node.returnType)}` : "";
      return `${node.isAsync ? "assincrono " : ""}(${params})${ret} => ${formatAST(node.body, indent)}`;
    }
    case "ThisExpr":
      return "esse-cara";
    case "NewExpr":
      return `novo ${formatAST(node.callee, indent)}`;
    case "ClassDecl": {
      const methods = node.methods
        .map((m) => {
          const kw = m.isConstructor ? "spawna" : "metodo";
          const name = m.isConstructor ? "" : " " + m.name;
          const params = m.params
            .map((p, i) => {
              const pt = m.paramTypes && m.paramTypes[i] ? `: ${fmtType(m.paramTypes[i])}` : "";
              return `${p}${pt}`;
            })
            .join(", ");
          const ret = m.returnType ? `: ${fmtType(m.returnType)}` : "";
          return `${sp}  ${kw}${name}(${params})${ret} ${formatAST(m.body, indent + 1)}`;
        })
        .join("\n");
      const sup = node.superClass ? ` herda ${node.superClass}` : "";
      return `${sp}classe ${node.name}${sup} {\n${methods}\n${sp}}`;
    }
    case "TestStmt":
      return `${sp}crush(${JSON.stringify(node.name)}) ${formatAST(node.body, indent)}`;
    case "AssertStmt":
      return `${sp}deu-match(${formatAST(node.test, indent)})`;
    case "TaskDecl":
      return `${sp}tarefa(${JSON.stringify(node.name)}) ${formatAST(node.body, indent)}`;
    case "TableDecl": {
      const props = node.props.map((p) => `\n${sp}  ${p.name}: ${p.type}`).join(",");
      return `${sp}DB ${node.name} {${props}\n${sp}}`;
    }
    case "MacroDecl":
      return `${sp}tpm ${node.name}(${node.params.join(", ")}) ${formatAST(node.body, indent)}`;
    case "SwitchStmt": {
      const cases = node.cases
        .map((c) =>
          c.test === null
            ? `${sp}  se-nao-der: ${formatAST(c.body, indent + 1)}`
            : `${sp}  se-for ${formatAST(c.test, indent)}: ${formatAST(c.body, indent + 1)}`
        )
        .join("\n");
      return `${sp}vai-de (${formatAST(node.test, indent)}) {\n${cases}\n${sp}}`;
    }
    case "MatchExpr": {
      const cases = node.cases
        .map((c) =>
          c.pattern === null
            ? `${sp}  qualquer-coisa: ${formatAST(c.body, indent + 1)}`
            : `${sp}  bateu-com ${formatAST(c.pattern, indent)}: ${formatAST(c.body, indent + 1)}`
        )
        .join("\n");
      return `${sp}ve-se (${formatAST(node.test, indent)}) {\n${cases}\n${sp}}`;
    }
    default:
      return `${sp}`;
  }
}

const STDLIB_RUNTIME = `
const __xs_cache = new Map();
const __xs_loading = new Set();

function __xs_require(mod) {
  if (mod.startsWith(".") || mod.startsWith("/")) {
    const { resolve } = require("path");
    const { readFileSync } = require("fs");
    const full = resolve(__dirname, mod);
    if (__xs_cache.has(full)) return __xs_cache.get(full);
    if (__xs_loading.has(full)) throw new Error("Circular import: " + mod);
    __xs_loading.add(full);
    const code = readFileSync(full, "utf-8");
    const exports = {};
    if (full.endsWith(".js")) {
      const m = require(full);
      __xs_cache.set(full, m);
      __xs_loading.delete(full);
      return m;
    }
    const vm = require("vm");
    vm.runInNewContext(code, { require, __exports: exports, __dirname: require("path").dirname(full), console, process, Buffer, setTimeout, setInterval, clearTimeout, clearInterval, Promise }, { filename: full });
    __xs_cache.set(full, exports);
    __xs_loading.delete(full);
    return exports;
  }
  return require(mod);
}

function __randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function __env(k) {
  return process.env[k] ?? null;
}

function __http(url) {
  try {
    const mod = require(url.startsWith("https") ? "https" : "http");
    return new Promise((resolve, reject) => {
      const req = mod.get(url, res => {
        let data = "";
        res.on("data", c => data += c);
        res.on("end", () => {
          try { resolve(JSON.parse(data)); }
          catch { resolve(data); }
        });
      });
      req.on("error", reject);
      req.setTimeout(3000, () => { req.destroy(); reject(new Error("timeout")); });
    });
  } catch {
    throw new Error("stalkeia is not available in this environment");
  }
}

function __sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function __typeOf(v) {
  if (v === null || v === undefined) return "eh-nada";
  if (Array.isArray(v)) return "sus";
  switch (typeof v) {
    case "number": return "eh-numero";
    case "string": return "eh-palavra";
    case "boolean": return "vdd?";
    case "function": return "faz-ai";
    case "object": return "bagulho";
    default: return "sla";
  }
}
`;

function buildStandalone(jsCode, entryFile) {
  const dir = path.dirname(path.resolve(entryFile));

  return `#!/usr/bin/env node

${STDLIB_RUNTIME}
const __dirname = ${JSON.stringify(dir)};

(async () => {
  try {
    ${jsCode
      .split("\n")
      .map((l) => "    " + l)
      .join("\n")}
  } catch (e) {
    console.error("\\n XanaScript runtime error:");
    console.error(e.stack || e.message);
    process.exit(1);
  }
})();
`;
}
