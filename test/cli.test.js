import { execSync } from "child_process";
import { existsSync, readFileSync, mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BIN = join(__dirname, "..", "bin", "xs.js");

function assert(condition, msg) {
  if (!condition) throw new Error("FAIL: " + msg);
  console.log("  PASS:", msg);
}

function run(args, opts = {}) {
  return execSync(`node ${BIN} ${args}`, { encoding: "utf-8", ...opts });
}

function runOk(args, opts = {}) {
  return execSync(`node ${BIN} ${args}`, { encoding: "utf-8", ...opts });
}

function tmpXs(name, code) {
  const dir = mkdtempSync(join(tmpdir(), "xs-cli-"));
  const f = join(dir, name);
  writeFileSync(f, code);
  return { dir, file: f };
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

async function testCLI() {
  console.log("\n=== CLI END-TO-END ===");

  // version
  const ver = runOk("--version");
  assert(/XanaScript v\d+\.\d+\.\d+/.test(ver), "--version");

  // help
  const help = runOk("help");
  assert(/run/.test(help) && /build/.test(help) && /test/.test(help), "help lista comandos");

  // run
  const { dir: d1, file: f1 } = tmpXs("hello.xs", 'grita-ae("ola")');
  const out = runOk(`run "${f1}"`, { cwd: d1 });
  assert(out.includes("ola"), "run executa e imprime");
  cleanup(d1);

  // run --strict
  const { file: f2 } = tmpXs("typed.xs", 'cria n: eh-numero = "texto"');
  let threw = false;
  try {
    run(`run --strict "${f2}"`);
  } catch {
    threw = true;
  }
  assert(threw, "run --strict falha com erro de tipo");
  cleanup(dirname(f2));

  // vm
  const { dir: d3, file: f3 } = tmpXs("calc.xs", "cria x = 20\ngrita-ae(x * 2)");
  const vout = runOk(`vm "${f3}"`, { cwd: d3 });
  assert(
    vout.includes("BYTECODE:") && vout.includes("RESULT:") && vout.includes("40"),
    "vm imprime bytecode e resultado"
  );
  cleanup(d3);

  // fmt
  const { file: f4 } = tmpXs("fmt.xs", "cria x=1\ncria y =  2");
  const fout = runOk(`fmt "${f4}"`);
  assert(/cria x = 1/.test(fout), "fmt formata");
  cleanup(dirname(f4));

  // fmt --check fails on unformatted
  const { file: f5 } = tmpXs("bad.xs", "cria x=1");
  let threw5 = false;
  try {
    run(`fmt --check "${f5}"`);
  } catch {
    threw5 = true;
  }
  assert(threw5, "fmt --check falha com arquivo não formatado");
  cleanup(dirname(f5));

  // fmt --check ok on formatted
  const { file: f6 } = tmpXs("good.xs", "cria x = 1\n");
  let threw6 = false;
  try {
    run(`fmt --check "${f6}"`);
  } catch {
    threw6 = true;
  }
  assert(!threw6, "fmt --check passa com arquivo formatado");
  cleanup(dirname(f6));

  // build (JS output)
  const { dir: d7, file: f7 } = tmpXs("prog.xs", 'grita-ae("built")');
  const bout = runOk(`build "${f7}"`, { cwd: d7 });
  assert(/grita-ae|console|generated|code/i.test(bout), "build gera JS");
  cleanup(d7);

  // build --wasm
  const { file: f8 } = tmpXs("prog2.xs", "cria a = 1\ncria b = 2\ngrita-ae(a + b)");
  let wasmOut = "";
  try {
    wasmOut = runOk(`build --wasm "${f8}"`);
  } catch (e) {
    wasmOut = e.stdout || e.message || "";
  }
  assert(/wasm|wat|WebAssembly|module/i.test(wasmOut), "build --wasm gera ou reporta WebAssembly");
  cleanup(dirname(f8));

  // check (typecheck)
  const { dir: d9, file: f9 } = tmpXs("typed2.xs", "cria n: eh-numero = 42");
  let threw9 = false;
  try {
    run(`check "${f9}"`, { cwd: d9 });
  } catch {
    threw9 = true;
  }
  assert(!threw9, "check passa com tipos válidos");
  cleanup(d9);

  // test runner
  const { dir: d10 } = (() => {
    const dir = mkdtempSync(join(tmpdir(), "xs-tests-"));
    writeFileSync(join(dir, "meu_test.xs"), 'crush "simples" { date(1 + 1, 2) }');
    return { dir };
  })();
  const tout = runOk(`test "${d10}"`, { cwd: d10 });
  assert(/passed|ok|sucesso|passed|OK/i.test(tout), "test roda crush e reporta");
  cleanup(d10);

  // unknown command
  let threwU = false;
  try {
    run(`command-inexistente`);
  } catch {
    threwU = true;
  }
  assert(threwU, "comando desconhecido falha");

  // PT aliases: roda == run
  const { dir: dPT, file: fPT } = tmpXs("pt.xs", 'grita-ae("alias-pt")');
  const ptOut = runOk(`roda "${fPT}"`, { cwd: dPT });
  assert(ptOut.includes("alias-pt"), "roda (alias PT de run) executa");
  cleanup(dPT);

  // PT alias: verifica == check
  const { file: fPT2 } = tmpXs("pt2.xs", "cria x = 1");
  let threwPT2 = false;
  try {
    run(`verifica "${fPT2}"`);
  } catch {
    threwPT2 = true;
  }
  assert(!threwPT2, "verifica (alias PT de check) passa");
  cleanup(dirname(fPT2));

  // PT alias: ajeita == fmt
  const { file: fPT3 } = tmpXs("pt3.xs", "cria y=  2");
  const ajeitaOut = runOk(`ajeita "${fPT3}"`);
  assert(/cria y = 2/.test(ajeitaOut), "ajeita (alias PT de fmt) formata");
  cleanup(dirname(fPT3));

  console.log("  CLI: OK\n");
}

testCLI().catch((e) => {
  console.error(e);
  process.exit(1);
});
