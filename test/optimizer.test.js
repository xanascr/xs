import { lex } from "../src/lexer.js";
import { parse } from "../src/parser.js";
import { optimize } from "../src/optimizer.js";
import { interpret, ReturnSignal } from "../src/interpreter.js";
import { createEnv } from "../src/runtime.js";

function assert(condition, msg) {
  if (!condition) throw new Error("FAIL: " + msg);
  console.log("  PASS:", msg);
}

function unwrap(v) {
  return v instanceof ReturnSignal ? v.value : v;
}

function opt(code) {
  return optimize(parse(lex(code)));
}

function firstStmt(code) {
  return opt(code).body[0];
}

async function runStmt(node, env) {
  try {
    return await interpret(node, env);
  } catch (e) {
    if (e instanceof ReturnSignal) return e.value;
    throw e;
  }
}

async function run(code) {
  const ast = optimize(parse(lex(code)));
  const env = Object.assign({}, createEnv(process.cwd()));
  if (ast.type === "Program" && ast.body.length === 1) {
    return runStmt(ast.body[0], env);
  }
  return runStmt(ast, env);
}

async function testOptimizer() {
  console.log("\n=== OPTIMIZER ===");

  // constant folding
  let n = firstStmt("1 + 2");
  assert(n.type === "Num" && n.value === 3, "1 + 2 dobra para Num 3");

  n = firstStmt("2 * 3 + 1");
  assert(n.type === "Num" && n.value === 7, "2 * 3 + 1 dobra para Num 7");

  n = firstStmt("10 / 4");
  assert(n.type === "Num" && n.value === 2.5, "10 / 4 dobra para 2.5");

  n = firstStmt("10 % 3");
  assert(n.type === "Num" && n.value === 1, "10 % 3 dobra para 1");

  n = firstStmt("1 << 3");
  assert(n.type === "Num" && n.value === 8, "1 << 3 dobra para 8");

  n = firstStmt("5 & 3");
  assert(n.type === "Num" && n.value === 1, "5 & 3 dobra para 1");

  n = firstStmt("5 | 3");
  assert(n.type === "Num" && n.value === 7, "5 | 3 dobra para 7");

  n = firstStmt("~5");
  assert(n.type === "Num" && n.value === -6, "~5 dobra para -6");

  n = firstStmt("-5");
  assert(n.type === "Num" && n.value === -5, "-5 dobra para Num -5");

  n = firstStmt("!verdadeiro");
  assert(n.type === "Bool" && n.value === false, "!verdadeiro dobra para false");

  n = firstStmt("10 == 10");
  assert(n.type === "Bool" && n.value === true, "10 == 10 dobra para true");

  n = firstStmt("verdadeiro && falso");
  assert(n.type === "Bool" && n.value === false, "v && f dobra para false");

  n = firstStmt("falso || verdadeiro");
  assert(n.type === "Bool" && n.value === true, "f || v dobra para true");

  // identidade (só com constantes numéricas dos dois lados)
  n = firstStmt("x + 0");
  assert(n.type === "Binary", "x + 0 NÃO simplifica (x pode ser texto)");

  n = firstStmt("0 + x");
  assert(n.type === "Binary", "0 + x NÃO simplifica (x pode ser texto)");

  n = firstStmt("x * 1");
  assert(n.type === "Binary", "x * 1 NÃO simplifica (x pode ser texto)");

  n = firstStmt("x * 0");
  assert(n.type === "Binary", "x * 0 NÃO simplifica (x pode ser texto)");

  n = firstStmt("2 + 0");
  assert(n.type === "Num" && n.value === 2, "2 + 0 dobra para 2");

  n = firstStmt("3 * 1");
  assert(n.type === "Num" && n.value === 3, "3 * 1 dobra para 3");

  n = firstStmt("4 * 0");
  assert(n.type === "Num" && n.value === 0, "4 * 0 dobra para 0");

  // eliminação de branch morta
  let stmt = firstStmt("se-pah (verdadeiro) { a = 1 } ai { a = 2 }");
  assert(stmt.type === "Block" && stmt.body.length === 1, "if(v) remove o else");

  stmt = firstStmt("se-pah (falso) { a = 1 } ai { a = 2 }");
  assert(stmt.type === "Block" && stmt.body.length === 1, "if(f) mantém só o else");

  stmt = firstStmt("se-pah (falso) { a = 1 }");
  assert(stmt.type === "Nil", "if(f) sem else vira Nil");

  n = firstStmt("verdadeiro ? 1 : 2");
  assert(n.type === "Num" && n.value === 1, "ternário true vira 1");

  n = firstStmt("falso ? 1 : 2");
  assert(n.type === "Num" && n.value === 2, "ternário false vira 2");

  // macros
  const macroAst = opt(`tpm dobro(x) { volta x * 2 }
dobro(21)`);
  assert(macroAst.body.length === 1, "MacroDecl removido após expansão");
  const ret = macroAst.body[0];
  assert(
    ret.type === "ReturnStmt" && ret.arg.type === "Num" && ret.arg.value === 42,
    "dobro(21) expande e dobra para 42"
  );

  const macro2 = firstStmt(`tpm soma3(a, b, c) { volta a + b + c }
soma3(1, 2, 3)`);
  assert(
    macro2.type === "ReturnStmt" && macro2.arg.type === "Num" && macro2.arg.value === 6,
    "soma3(1,2,3) → 6"
  );

  assert(
    (await run(`tpm dobro(x) { volta x * 2 }
dobro(21)`)) === 42,
    "macro executa → 42"
  );

  // execução preservada após folding
  assert((await run("2 * 3 + 1")) === 7, "execução de expressão dobrada → 7");
  assert((await run("se-pah (verdadeiro) { 1 } ai { 2 }")) === 1, "execução de if dobrado → 1");

  console.log("  OPTIMIZER: OK\n");
}

testOptimizer().catch((e) => {
  console.error(e);
  process.exit(1);
});
