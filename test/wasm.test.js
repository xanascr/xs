import { lex } from "../src/lexer.js";
import { parse } from "../src/parser.js";
import { optimize } from "../src/optimizer.js";
import { interpret } from "../src/interpreter.js";
import { createEnv } from "../src/runtime.js";
import { compileWasm, runWasm } from "../src/wasm_binary.js";
import { getWasmRuntime } from "../src/codegen_wasm.js";

function assert(condition, msg) {
  if (!condition) throw new Error("FAIL: " + msg);
  console.log("  PASS:", msg);
}

function buildAst(code) {
  const tokens = lex(code);
  let ast = parse(tokens);
  return optimize(ast);
}

function collectInterpreter(code, baseDir = process.cwd()) {
  const ast = buildAst(code);
  const out = [];
  const env = Object.assign({}, createEnv(baseDir), {
    "grita-ae": (...a) => {
      out.push(a.map(String).join(" "));
    },
  });
  return interpret(ast, env).then(() => out);
}

async function collectWasm(code, baseDir = process.cwd()) {
  const ast = buildAst(code);
  const out = [];
  const origLog = console.log;
  const origWarn = console.warn;
  console.log = (...a) => {
    out.push(a.map(String).join(" "));
  };
  console.warn = (...a) => {
    out.push("W:" + a.map(String).join(" "));
  };
  try {
    const runner = await runWasm(ast, { env: getWasmRuntime() });
    const result = runner.main();
    return { out, result };
  } finally {
    console.log = origLog;
    console.warn = origWarn;
  }
}

const PARITY_CASES = [
  [
    "arith-int",
    `
cria a = 10
cria b = 3
grita-ae(a + b)
grita-ae(a - b)
grita-ae(a * b)
grita-ae(a / b)
grita-ae(a % b)
grita-ae(a > b)
grita-ae(a <= b)`,
  ],
  [
    "logic",
    `
cria x = verdadeiro && falso
cria y = falso || 7
grita-ae(x)
grita-ae(y)
grita-ae(1 < 2 ? "menor" : "maior")`,
  ],
  [
    "control-flow",
    `
cria total = 0
repete-na-moral (cria i = 0; i < 10; i++) {
  se-pah (i % 2 == 0) {
    total += i
  }
}
grita-ae(total)
cria j = 3
repete-enquanto (j > 0) {
  j -= 1
  se-pah (j == 1) {
    mete-o-pe()
  }
}
grita-ae(j)`,
  ],
  [
    "func-recursion",
    `
resolve fib(n) {
  se-pah (n <= 1) {
    volta n
  }
  volta fib(n - 1) + fib(n - 2)
}
resolve fat(n) {
  se-pah (n <= 1) { volta 1 }
  volta n * fat(n - 1)
}
grita-ae(fib(10))
grita-ae(fat(5))`,
  ],
  [
    "strings",
    `
grita-ae("ola mundo")
grita-ae(tamanho("abcde"))
cria s = "xana"
grita-ae(s)`,
  ],
  [
    "floats",
    `
cria x = 1.5
cria y = 2.5
grita-ae(x + y)
grita-ae(x * y)
grita-ae(x - 0.5)
grita-ae(10.0 / 4)`,
  ],
  [
    "unary",
    `
cria n = 5
grita-ae(-n)
grita-ae(!verdadeiro)
grita-ae(~3)`,
  ],
  [
    "nested-fn",
    `
resolve add(a, b) { volta a + b }
resolve add3(a, b, c) { volta add(add(a, b), c) }
grita-ae(add3(1, 2, 3))`,
  ],
  [
    "bitwise",
    `
cria a = 5
cria b = 3
grita-ae(a | b)
grita-ae(a & b)
grita-ae(a ^ b)
grita-ae(~a)
grita-ae(a << 2)
grita-ae(a >> 1)`,
  ],
  [
    "compound-assign",
    `
cria x = 10
x += 5
x -= 2
x *= 3
x /= 3
x %= 7
grita-ae(x)`,
  ],
  [
    "ternary-nullish",
    `
cria idade = 20
cria r = idade >= 18 ? "maior" : "menor"
cria nome = nulo
cria apelido = nome ?? "sem-nome"
grita-ae(r)
grita-ae(apelido)`,
  ],
  [
    "while-break-continue",
    `
cria soma = 0
cria i = 0
repete-enquanto (i < 20) {
  i += 1
  se-pah (i % 2 == 0) { segue-o-baile() }
  se-pah (i > 7) { mete-o-pe() }
  soma += i
}
grita-ae(soma)
grita-ae(i)`,
  ],
  [
    "nested-loops",
    `
cria total = 0
repete-na-moral (cria i = 0; i < 3; i++) {
  repete-na-moral (cria j = 0; j < 3; j++) {
    total += i * j
  }
}
grita-ae(total)`,
  ],
  [
    "const-global",
    `
lei LIMITE = 10
fofoca total = 0
resolve soma2(a, b) { total = total + a + b }
soma2(2, 3)
soma2(4, 5)
cria x = LIMITE + total
grita-ae(x)
grita-ae(LIMITE)
grita-ae(total)`,
  ],
  [
    "global-fn",
    `
fofoca cont = 0
resolve inc() {
  cont = cont + 1
}
inc()
inc()
inc()
grita-ae(cont)`,
  ],
  [
    "global-loop",
    `
fofoca ac = 0
repete-na-moral (cria i = 0; i < 4; i++) {
  ac = ac + i * 2
}
grita-ae(ac)`,
  ],
];

const RESULT_CASES = [
  [
    "fib main",
    "resolve fib(n) { se-pah (n <= 1) { volta n } volta fib(n - 1) + fib(n - 2) } volta fib(10)",
    55,
  ],
  ["float main", "cria x = 1.5\ncria y = 2\nvolta x * y", 3],
  ["sum main", "cria t = 0\nrepete-na-moral (cria i = 0; i < 10; i += 1) { t += i }\nvolta t", 45],
  ["compound main", "cria x = 10\nx += 5\nx *= 2\nvolta x", 30],
  ["ternary main", "cria idade = 21\nvolta idade >= 18 ? 1 : 0", 1],
  ["const main", "lei A = 5\nlei B = 6\nvolta A * B", 30],
  ["global main", "fofoca g = 0\nresolve inc() { g = g + 1 }\ninc()\ninc()\ninc()\nvolta g", 3],
];

async function testWasm() {
  console.log("\n=== WASM ===");

  // sanity: compileWasm produces valid binary magic
  const bytes = compileWasm(buildAst("volta 1"));
  assert(bytes instanceof Uint8Array, "compileWasm retorna Uint8Array");
  assert(
    bytes[0] === 0x00 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6d,
    "magic wasm válido"
  );

  for (const [name, code] of PARITY_CASES) {
    const interp = await collectInterpreter(code);
    const wasm = await collectWasm(code);
    const a = JSON.stringify(interp);
    const b = JSON.stringify(wasm.out);
    assert(a === b, `${name} (interp=${a} wasm=${b})`);
  }

  for (const [name, code, expected] of RESULT_CASES) {
    const wasm = await collectWasm(code);
    assert(wasm.result === expected, `${name} → ${expected}`);
  }

  // builtins: horinha e escolhe
  const r = await collectWasm('volta tamanho("quatro")');
  assert(r.result === 6, "tamanho de string via wasm");

  console.log("  WASM: OK\n");
}

testWasm().catch((e) => {
  console.error(e);
  process.exit(1);
});
