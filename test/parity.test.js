import { lex } from "../src/lexer.js";
import { parse } from "../src/parser.js";
import { optimize } from "../src/optimizer.js";
import { interpret } from "../src/interpreter.js";
import { createEnv } from "../src/runtime.js";
import { compile } from "../src/bytecode/compiler.js";
import { run } from "../src/bytecode/vm.js";

function assert(condition, msg) {
  if (!condition) throw new Error("FAIL: " + msg);
  console.log("  PASS:", msg);
}

function collectInterpreter(code, baseDir = process.cwd()) {
  const tokens = lex(code);
  let ast = parse(tokens);
  ast = optimize(ast);
  const out = [];
  const env = Object.assign({}, createEnv(baseDir), {
    "grita-ae": (...a) => {
      out.push(a.map(String).join(" "));
    },
  });
  return interpret(ast, env).then(() => out);
}

function collectVM(code, baseDir = process.cwd()) {
  const tokens = lex(code);
  let ast = parse(tokens);
  ast = optimize(ast);
  const bytecode = compile(ast);
  const out = [];
  const origLog = console.log;
  console.log = (...a) => {
    out.push(a.map(String).join(" "));
  };
  try {
    run(bytecode, baseDir);
  } finally {
    console.log = origLog;
  }
  return Promise.resolve(out);
}

const CASES = [
  [
    "arith",
    `
cria a = 10
cria b = 3
grita-ae(a + b)
grita-ae(a - b)
grita-ae(a * b)
grita-ae(a / b)
grita-ae(a % b)
grita-ae(a ** b)`,
  ],
  [
    "logic",
    `
cria x = verdadeiro && falso
cria y = falso || 7
cria w = 1
w &&= 2
w ||= 9
grita-ae(x)
grita-ae(y)
grita-ae(w)`,
  ],
  [
    "closures",
    `
resolve criaContador(inicial) {
  cria estado = { count: inicial }
  resolve incrementar() {
    estado.count = estado.count + 1
    volta estado.count
  }
  volta incrementar
}
cria cont = criaContador(10)
grita-ae(cont())
grita-ae(cont())
grita-ae(cont())`,
  ],
  [
    "match",
    `
resolve descreve(v) {
  ve-se (v) {
    bateu-com 1: volta "um"
    bateu-com [a, b]: volta "soma:" + (a + b)
    bateu-com { nome: n }: volta n
    qualquer-coisa: volta "outro"
  }
}
grita-ae(descreve(1))
grita-ae(descreve([4, 5]))
grita-ae(descreve({ nome: "ana" }))
grita-ae(descreve("x"))`,
  ],
  [
    "loop",
    `
cria total = 0
repete-na-moral (cria i = 0; i < 5; i++) {
  total = total + i
}
grita-ae(total)
cria j = 3
repete-enquanto (j > 0) {
  j = j - 1
}
grita-ae(j)`,
  ],
  [
    "strings",
    `
cria partes = divide-texto("a,b,c", ",")
grita-ae(tamanho(partes))
grita-ae(juntar(partes, "-"))
grita-ae(decodifica-url("a%20b"))
grita-ae(url("a b"))`,
  ],
  [
    "string-methods",
    `
cria s = "ola mundo"
grita-ae(s.toUpperCase())
grita-ae(s.indexOf("mundo"))
cria arr = [3, 1, 2]
arr.push(4)
grita-ae(arr.join(","))
grita-ae(arr.reverse())`,
  ],
  [
    "coalesce",
    `
cria a = nulo
a ??= 42
cria b = 7
b ??= 99
grita-ae(a)
grita-ae(b)
cria obj = { x: 1 }
obj.x &&= 5
obj.x ||= 8
grita-ae(obj.x)`,
  ],
  [
    "obj-access",
    `
cria pessoa = { nome: "ana", idade: 30 }
grita-ae(pessoa.nome)
pessoa.idade = 31
grita-ae(pessoa.idade)
cria arr = [10, 20, 30]
grita-ae(arr[1])
arr[2] = 99
grita-ae(arr[2])`,
  ],
];

async function testParity() {
  console.log("\n=== PARITY VM <-> INTERPRETER ===");

  for (const [name, code] of CASES) {
    const interp = await collectInterpreter(code);
    const vm = await collectVM(code);
    const a = JSON.stringify(interp);
    const b = JSON.stringify(vm);
    if (a === b) {
      assert(true, name);
    } else {
      assert(false, `${name} (interp=${a} vm=${b})`);
    }
  }

  console.log("  PARITY: OK\n");
}

testParity().catch((e) => {
  console.error(e);
  process.exit(1);
});
