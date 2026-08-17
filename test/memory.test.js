import { lex } from "../src/lexer.js";
import { parse } from "../src/parser.js";
import { optimize } from "../src/optimizer.js";
import { interpret } from "../src/interpreter.js";
import { createEnv } from "../src/runtime.js";
import { runWasm } from "../src/wasm_binary.js";
import { getWasmRuntime, readMemString, setWasmMemory } from "../src/codegen_wasm.js";

function assert(condition, msg) {
  if (!condition) throw new Error("FAIL: " + msg);
  console.log("  PASS:", msg);
}

function buildAst(code) {
  return optimize(parse(lex(code)));
}

async function collectInterpreter(code) {
  const ast = buildAst(code);
  const out = [];
  const env = Object.assign({}, createEnv(), {
    "grita-ae": (...a) => {
      out.push(a.map(String).join(" "));
    },
  });
  await interpret(ast, env);
  return out;
}

async function collectWasm(code) {
  const ast = buildAst(code);
  const out = [];
  const orig = console.log;
  console.log = (...a) => {
    out.push(a.map(String).join(" "));
  };
  try {
    const runner = await runWasm(ast, { env: getWasmRuntime() });
    const result = runner.main();
    return { out, result, exports: runner.exports };
  } finally {
    console.log = orig;
  }
}

async function testMemory() {
  console.log("\n=== MEMORY / GC ===");

  // muitas strings distintas não se sobrepõem
  const manyStrings = [
    "alpha",
    "beta",
    "gama",
    "delta",
    "épsilon",
    "zeta",
    "eta",
    "teta",
    "iota",
    "capa",
    "lâmbda",
    "mu",
  ];
  const codeMany = manyStrings.map((s, i) => `grita-ae("${s}")`).join("\n");
  const interp = await collectInterpreter(codeMany);
  const wasm = await collectWasm(codeMany);
  assert(
    JSON.stringify(interp) === JSON.stringify(wasm.out),
    `muitas strings: ${interp.length} saídas idênticas`
  );

  // string longa
  const longStr = "x".repeat(500);
  const codeLong = `grita-ae("${longStr}")`;
  const outLong = await collectWasm(codeLong);
  assert(outLong.out[0] === longStr, "string longa (500 chars) intacta");

  // readMemString lê do ponteiro exportado
  const runner = await runWasm(buildAst(`volta tamanho("memoria")`), { env: getWasmRuntime() });
  const mem = runner.exports.memory;
  setWasmMemory(mem);
  const ptrs = Array.from(mem.buffer, () => 0);
  let found = false;
  for (let p = 0x4000; p < 0x6000 && p < mem.buffer.byteLength; p++) {
    if (readMemString(p) === "memoria") {
      found = true;
      break;
    }
  }
  assert(found, "readMemString encontra a string na memória exportada");

  // execução repetida não acumula (não cresce memória fora do esperado)
  const loopCode = `cria t = 0\nrepete-na-moral (cria i = 0; i < 50; i++) { t += i }\nvolta t`;
  const bytesBefore = (await runWasm(buildAst(loopCode), { env: getWasmRuntime() })).bytes.length;
  for (let i = 0; i < 3; i++) {
    const r2 = await runWasm(buildAst(loopCode), { env: getWasmRuntime() });
    assert(r2.main() === 1225, `execução repetida ${i + 1} → 1225`);
  }
  const r3 = await runWasm(buildAst(loopCode), { env: getWasmRuntime() });
  assert(r3.bytes.length === bytesBefore, "tamanho do módulo estável em execuções repetidas");

  console.log("  MEMORY: OK\n");
}

testMemory().catch((e) => {
  console.error(e);
  process.exit(1);
});
