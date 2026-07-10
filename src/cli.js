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
  VERSION = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf-8")).version;
} catch (_) {
  VERSION = "2.2.0";
}

const [, , cmd, ...rest] = process.argv;

const HELP = `
XanaScript CLI — v2.2.8
  xs run <file>          Executa .xs (AST Interpreter)
  xs vm  <file>          Executa .xs (Bytecode VM)
  xs fmt <file>          Formata .xs
  xs build <file>        Gera JavaScript do .xs
  xs build --opt <file>  Gera JS ultra-otimizado
  xs build --wasm <file> Gera WebAssembly (.wat + .wasm)
  xs build --standalone <file>  Gera .js único com runtime
  xs check <file>        Verifica sintaxe
  xs dev [file]          Watcher com hot reload
  xs lsp                 Language Server Protocol (stdin/stdout)
  xs repl                Modo interativo
  xs bench               Roda benchmark

GERENCIADOR DE PACOTES:
  xs init [dir]          Cria novo projeto XanaScript
  xs install [pacote]    Instala dependências
  xs publish             Publica pacote no registro
  xs search <termo>      Busca pacotes
  xs login               Login no registro
  xs whoami              Mostra usuário logado
  xs logout              Logout do registro

TESTES:
  xs test [dir]          Roda todos os testes (*test*.xs)

DOCUMENTAÇÃO:
  xs docs [src] [out]    Gera documentação HTML

TAREFAS:
  xs <tarefa>            Executa tarefa de tarefas.xs
                           (auto-detectado)

  xs help                Mostra ajuda
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
      await runTests(rest[0] || ".");
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

    if (cmd === "repl") {
      await startREPL();
      return;
    }

    if (cmd === "dev") {
      const watchFile = rest[0] || "index.xs";
      if (!fs.existsSync(watchFile)) {
        console.log(` Arquivo não encontrado: ${watchFile}`);
        process.exit(1);
      }
      console.log(` Assistindo: ${watchFile}`);
      const chokidar = await import("chokidar").catch(() => null);
      if (!chokidar) {
        console.log("  Use polling fallback...");
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
    const taskFile = taskFiles.find(f => fs.existsSync(f));
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

    const file = rest[0] || (cmd.endsWith(".xs") ? cmd : null);
    if (!file) {
      console.log("Especifique um arquivo .xs");
      process.exit(1);
    }

    const code = fs.readFileSync(file, "utf-8");
    setSource(code, file);

    if (cmd === "run" || cmd === ".") {
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

    if (cmd === "fmt") {
      const tokens = lex(code);
      const ast = parse(tokens);
      console.log(formatAST(ast));
      return;
    }

    if (cmd === "build") {
      const tokens = lex(code);
      let ast = parse(tokens);
      ast = optimize(ast);

      if (rest.includes("--wasm") || rest.includes("-w")) {
        const { compileWasm, generateWasm, getWasmRuntime } = await import("./wasm_binary.js");

        try {
          const wasmBytes = compileWasm(ast);
          const wasmFile = file.replace(/\.xs$/, ".wasm");
          fs.writeFileSync(wasmFile, Buffer.from(wasmBytes));
          console.log(` Gerado .wasm direto: ${wasmFile} (${wasmBytes.length} bytes)`);

          try {
            const wasmMod = await WebAssembly.instantiate(wasmBytes, { env: getWasmRuntime() });
            const result = wasmMod.instance.exports.main?.() ?? 0;
            console.log(`  Teste: main() = ${result}`);
          } catch (e) {
            console.log(`   Execução: ${e.message}`);
          }
        } catch (e) {
          console.log(`   Binary fallback: ${e.message}`);
          console.log(`  Gerando WAT como alternativa...`);
          const wat = generateWasm(ast);
          const outFile = file.replace(/\.xs$/, ".wat");
          fs.writeFileSync(outFile, wat, "utf-8");
          console.log(` Gerado WAT: ${outFile}`);
          console.log(`  Para compilar: npm install -g wabt && wat2wasm ${outFile} -o ${wasmFile}`);
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
        console.log(` Gerado: ${outFile}`);
        console.log(`  Rode com: node ${outFile}`);
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

    if (cmd === "check") {
      const tokens = lex(code);
      parse(tokens);
      console.log(" Sintaxe OK");
      return;
    }

    // Default: run the .xs file
    if (file) {
      await runXS(code, path.dirname(path.resolve(file)), file);
      return;
    }

    console.log(`Comando desconhecido: ${cmd}`);
    console.log(HELP);
  } catch (e) {
    if (e instanceof XSError) {
      console.error(e.toString());
    } else {
      console.error(`\x1b[1;31m╔═══ XanaScript ERROR \x1b[0m`);
      console.error(`\x1b[1;31m║\x1b[0m ${e.message}`);
      if (e.loc) {
        console.error(`\x1b[1;31m║\x1b[0m \x1b[2m  --> ${e.loc.file}:${e.loc.line}:${e.loc.column}\x1b[0m`);
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
    prompt: "xs> "
  });

  let env = createEnv(process.cwd());

  console.log("XanaScript REPL — digite .help para comandos");
  rl.prompt();

  rl.on("line", async line => {
    line = line.trim();
    if (!line) { rl.prompt(); return; }

    if (line === ".exit") { rl.close(); return; }
    if (line === ".help") {
      console.log("Comandos: .exit, .help, .reset");
      rl.prompt();
      return;
    }
    if (line === ".reset") {
      env = createEnv(process.cwd());
      console.log("Ambiente resetado");
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
        console.error("erro:", e.message);
      }
    }

    rl.prompt();
  });

  rl.on("close", () => {
    console.log("Até mais!");
    process.exit(0);
  });
}

function simpleWatch(file) {
  let last = fs.statSync(file).mtimeMs;
  console.log(`  Polling a cada 500ms`);
  return new Promise(async (resolve) => {
    while (true) {
      await new Promise(r => setTimeout(r, 500));
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
        console.error("  Erro ao checar arquivo:", e.message);
      }
    }
  });
}

function formatAST(node, indent = 0) {
  const sp = "  ".repeat(indent);
  switch (node.type) {
    case "Program":
      return node.body.map(n => formatAST(n, 0)).join("\n");
    case "Block":
      return `{\n${node.body.map(n => formatAST(n, indent + 1)).join("\n")}\n${sp}}`;
    case "VarDecl":
      return `${sp}CRIA ${node.id} = ${formatAST(node.init, indent)}`;
    case "Assign":
      return `${sp}${formatAST(node.left, indent)} = ${formatAST(node.right, indent)}`;
    case "IfStmt": {
      let s = `${sp}SE LIGA SO (${formatAST(node.test, indent)}) ${formatAST(node.cons, indent)}`;
      if (node.alt) s += ` SENAO ${formatAST(node.alt, indent)}`;
      return s;
    }
    case "ForStmt": {
      const init = node.init ? formatAST(node.init, indent) : "";
      const test = formatAST(node.test, indent);
      const update = node.update ? formatAST(node.update, indent) : "";
      return `${sp}REPETE NA MORAL (${init}; ${test}; ${update}) ${formatAST(node.body, indent)}`;
    }
    case "WhileStmt":
      return `${sp}REPETE AI (${formatAST(node.test, indent)}) ${formatAST(node.body, indent)}`;
    case "FunctionDecl": {
      const params = node.params.join(", ");
      return `${sp}CHAMA ESSE CARA ${node.name}(${params}) ${formatAST(node.body, indent)}`;
    }
    case "ReturnStmt":
      return `${sp}VOLTA${node.arg ? " " + formatAST(node.arg, indent) : ""}`;
    case "Call": {
      const args = node.args.map(a => formatAST(a, indent)).join(", ");
      if (node.callee.type === "Ident") {
        const name = node.callee.name;
        if (name === "SOLTA_O_GRITO") return `${sp}SOLTA O GRITO(${args})`;
        if (name === "FALA_BAIXO") return `${sp}FALA BAIXO(${args})`;
        if (name === "AGORA_VAI") return `${sp}AGORA VAI(${args})`;
        if (name === "ESPERA_AI") return `${sp}ESPERA AI(${args})`;
        if (name === "SORTEIA") return `${sp}SORTEIA(${args})`;
        if (name === "PARSEIA") return `${sp}PARSEIA(${args})`;
        if (name === "OUVE_AQUI") return `${sp}OUVE AQUI(${args})`;
        return `${sp}${node.callee.name}(${args})`;
      }
      return `${sp}${formatAST(node.callee, indent)}(${args})`;
    }
    case "Member":
      return `${formatAST(node.obj, indent)}.${node.prop}`;
    case "IndexExpr":
      return `${formatAST(node.obj, indent)}[${formatAST(node.index, indent)}]`;
    case "Binary":
      return `(${formatAST(node.left, indent)} ${node.op} ${formatAST(node.right, indent)})`;
    case "Unary":
      return `${node.op}${formatAST(node.arg, indent)}`;
    case "Ident":
      return node.name;
    case "Num":
      return String(node.value);
    case "Str":
      return JSON.stringify(node.value);
    case "Bool":
      return node.value ? "VERDADEIRO" : "FALSO";
    case "Nil":
      return "NULO";
    case "ArrayExpr":
      return `[${node.items.map(i => formatAST(i, indent)).join(", ")}]`;
    case "ObjectExpr":
      return `{${node.props.map(p => `${p.key}: ${formatAST(p.value, indent)}`).join(", ")}}`;
    case "TryCatchStmt":
      return `${sp}TENTA ${formatAST(node.tryBlock, indent)} PEGA(${node.catchParam}) ${formatAST(node.catchBlock, indent)}`;
    case "ImportExpr":
      return `IMPORTA ${JSON.stringify(node.path)}`;
    case "ImportStmt":
      return `${sp}IMPORTA ${JSON.stringify(node.path)}`;
    case "ExportStmt":
      return `${sp}EXPORTA ${node.name}`;
    case "BreakStmt":
      return `${sp}VOA()`;
    case "ContinueStmt":
      return `${sp}CONTINUA()`;
    case "Ternary":
      return `(${formatAST(node.test, indent)} ? ${formatAST(node.cons, indent)} : ${formatAST(node.alt, indent)})`;
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
    if (__xs_loading.has(full)) throw new Error("Import cíclico: " + mod);
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
    throw new Error("AGORA_VAI não disponível neste ambiente");
  }
}

function __sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
`;

function buildStandalone(jsCode, entryFile) {
  const dir = path.dirname(path.resolve(entryFile));

  return `#!/usr/bin/env node

${STDLIB_RUNTIME}
const __dirname = ${JSON.stringify(dir)};

(async () => {
  try {
${jsCode.split("\n").map(l => "    " + l).join("\n")}
  } catch (e) {
    console.error("\\n XanaScript runtime error:");
    console.error(e.stack || e.message);
    process.exit(1);
  }
})();
`;
}
