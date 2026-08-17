import { lex } from "./lexer.js";
import { parse } from "./parser.js";
import { optimize } from "./optimizer.js";
import { interpret, ReturnSignal } from "./interpreter.js";
import { createEnv } from "./runtime.js";
import { compile } from "./bytecode/compiler.js";
import { run } from "./bytecode/vm.js";
import { runWasm } from "./wasm_binary.js";
import { getWasmRuntime } from "./codegen_wasm.js";

const xsCode = `
resolve fib(n) {
  se-pah (n <= 1) { volta n }
  volta fib(n - 1) + fib(n - 2)
}
cria soma = 0
repete-na-moral (cria i = 0; i < 2000; i++) {
  soma = soma + i
}
fib(20) + soma
`;

const jsCode = `
function fib(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}
let soma = 0;
for (let i = 0; i < 2000; i++) { soma = soma + i; }
fib(20) + soma
`;

function unwrap(rs) {
  return rs instanceof ReturnSignal ? rs.value : rs;
}

function buildAst() {
  return optimize(parse(lex(xsCode)));
}

function runInterpreter(ast) {
  return interpret(ast, Object.assign({}, createEnv(process.cwd()))).then(unwrap);
}

function runVM(ast) {
  const bc = compile(ast);
  return run(bc, process.cwd());
}

function runJS() {
  return eval(jsCode);
}

async function warmupWasm(ast) {
  return runWasm(ast, { env: getWasmRuntime() });
}

export async function runBench(opts = {}) {
  const iterations = opts.iterations || 3;
  console.log("\n === XanaScript Benchmark (multi-backend) ===\n");

  const ast = buildAst();
  const wasmRunner = await warmupWasm(ast);

  for (let i = 0; i < 2; i++) {
    await runInterpreter(ast);
    runVM(ast);
    runJS();
    wasmRunner.main();
  }

  const results = {};
  const measure = async (name, fn) => {
    let total = 0;
    let firstValue;
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const v = await fn();
      total += performance.now() - start;
      if (i === 0) firstValue = v;
    }
    const avg = total / iterations;
    results[name] = firstValue;
    return { name, avg, firstValue };
  };

  const [interp, vm, js, wasm] = await Promise.all([
    measure("interpreter", () => runInterpreter(ast)),
    measure("VM", () => runVM(ast)),
    measure("JavaScript (eval)", () => runJS()),
    measure("WebAssembly", () => wasmRunner.main()),
  ]);

  const rows = [interp, vm, js, wasm];
  for (const r of rows) {
    console.log(`  ${r.name.padEnd(20)} ${r.avg.toFixed(2).padStart(9)} ms/run`);
  }
  console.log("\n  speedups vs interpreter:");
  console.log(`  VM:               ${(interp.avg / vm.avg).toFixed(2)}x`);
  console.log(`  JavaScript:       ${(interp.avg / js.avg).toFixed(2)}x`);
  console.log(`  WebAssembly:      ${(interp.avg / wasm.avg).toFixed(2)}x`);

  const values = [interp, js, wasm].map((r) => r.firstValue);
  const consistent = values.every((v) => v === values[0]);
  console.log(
    `\n  resultados: interp=${interp.firstValue} js=${js.firstValue} wasm=${wasm.firstValue} (vm=${vm.firstValue})`
  );
  console.log(`  consistente (interp/js/wasm): ${consistent ? "sim" : "não"}`);

  console.log("  BENCHMARK: OK\n");
  return { interp: interp.avg, vm: vm.avg, js: js.avg, wasm: wasm.avg, consistent };
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("src/bench.js")) {
  runBench().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
