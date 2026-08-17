import { lex } from "../src/lexer.js";
import { parse } from "../src/parser.js";
import { optimize } from "../src/optimizer.js";
import { interpret } from "../src/interpreter.js";
import { createEnv } from "../src/runtime.js";

function assert(condition, msg) {
  if (!condition) throw new Error("FAIL: " + msg);
  console.log("  PASS:", msg);
}

async function run(code, env = {}) {
  const tokens = lex(code);
  let ast = parse(tokens);
  ast = optimize(ast);
  if (ast.type === "Program" && ast.body.length === 1) {
    return interpret(ast.body[0], env);
  }
  return interpret(ast, env);
}

async function testInterpreter() {
  console.log("\n=== INTERPRETER ===");

  let r;

  r = await run("10");
  assert(r === 10, "Num literal");

  r = await run('"oi"');
  assert(r === "oi", "Str literal");

  r = await run("verdadeiro");
  assert(r === true, "Bool true");

  r = await run("falso");
  assert(r === false, "Bool false");

  r = await run("nulo");
  assert(r === null, "Nil");

  r = await run("1 + 2");
  assert(r === 3, "addition");

  r = await run("10 - 3");
  assert(r === 7, "subtraction");

  r = await run("3 * 4");
  assert(r === 12, "multiplication");

  r = await run("10 / 2");
  assert(r === 5, "division");

  r = await run("10 % 3");
  assert(r === 1, "modulo");

  r = await run("1 + 2 * 3");
  assert(r === 7, "precedence");

  r = await run("2 * 3 + 1");
  assert(r === 7, "precedence 2");

  r = await run("-5");
  assert(r === -5, "unary minus");

  r = await run("!verdadeiro");
  assert(r === false, "unary not");

  r = await run("10 == 10");
  assert(r === true, "eq true");

  r = await run("10 != 10");
  assert(r === false, "neq false");

  r = await run("10 > 5");
  assert(r === true, "gt");

  r = await run("10 < 5");
  assert(r === false, "lt");

  r = await run("verdadeiro && verdadeiro");
  assert(r === true, "and");

  r = await run("verdadeiro && falso");
  assert(r === false, "and false");

  r = await run("falso || verdadeiro");
  assert(r === true, "or");

  r = await run("falso || falso");
  assert(r === false, "or false");

  const env = {};
  r = await run("cria x = 42", env);
  assert(env.x === 42, "VarDecl");
  r = await run("x", env);
  assert(r === 42, "Ident lookup");

  r = await run("cria a = 1 + 2", env);
  assert(env.a === 3, "VarDecl with expr");

  r = await run("verdadeiro ? 1 : 2");
  assert(r === 1, "ternary true");
  r = await run("falso ? 1 : 2");
  assert(r === 2, "ternary false");

  r = await run("5 | 3");
  assert(r === 7, "bitwise OR");

  r = await run("5 & 3");
  assert(r === 1, "bitwise AND");

  r = await run("5 ^ 3");
  assert(r === 6, "bitwise XOR");

  r = await run("~0");
  assert(r === -1, "bitwise NOT");

  r = await run("1 << 3");
  assert(r === 8, "left shift");

  r = await run("8 >> 2");
  assert(r === 2, "right shift");

  r = await run("1 | 2 & 4");
  assert(r === 1, "precedence & before |");

  r = await run("2 << 2 | 1");
  assert(r === 9, "precedence << before |");

  console.log("  INTERPRETER: OK\n");
}

async function testStdlib() {
  console.log("\n=== STDLIB ===");

  const env = createEnv(process.cwd());
  const s = (code) => {
    const tokens = lex(code);
    let ast = parse(tokens);
    ast = optimize(ast);
    return interpret(ast, env);
  };

  assert((await s("tamanho([1,2,3])")) === 3, "tamanho array");
  assert((await s('tamanho("abc")')) === 3, "tamanho string");
  assert(
    JSON.stringify(await s('divide-texto("a,b,c", ",")')) === JSON.stringify(["a", "b", "c"]),
    "divide-texto"
  );
  assert((await s('juntar(["a","b"], "-")')) === "a-b", "juntar");
  assert((await s('decodifica-url("a%20b")')) === "a b", "decodifica-url");
  assert((await s('url("a b")')) === "a%20b", "url");
  assert((await s('encontra("olamundo", "mun")')) !== null, "encontra");
  assert((await s("embrulha({a:1})")) === '{"a":1}', "embrulha");
  assert(typeof (await s("data-agora()")) === "string", "data-agora");
  assert(
    (await s('hash("abc")')) === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    "hash sha256"
  );

  console.log("  STDLIB: OK\n");
}

async function testConstGlobal() {
  console.log("\n=== CONST/GLOBAL ===");

  let r;

  r = await run("lei X = 10\nX");
  assert(r === 10, "lei declara constante");
  r = await run("lei X = 2\ncria y = X * 3\ny");
  assert(r === 6, "lei usada em expressao");
  r = await run("lei A = 5\nlei B = 6\nA * B");
  assert(r === 30, "multiplas leis");

  let err = false;
  try {
    await run("lei X = 1\nX = 5");
  } catch (e) {
    err = /const/i.test(e.message);
  }
  assert(err, "lei impede reatribuicao via =");
  err = false;
  try {
    await run("lei X = 1\nX += 5");
  } catch (e) {
    err = /const/i.test(e.message);
  }
  assert(err, "lei impede compound assign");
  err = false;
  try {
    await run("lei X = 1\nX++");
  } catch (e) {
    err = /const/i.test(e.message);
  }
  assert(err, "lei impede ++");
  err = false;
  try {
    await run("lei X = 1\nX--");
  } catch (e) {
    err = /const/i.test(e.message);
  }
  assert(err, "lei impede --");

  r = await run("fofoca g = 1\nresolve inc() { g = g + 1 }\ninc()\ninc()\ng");
  assert(r === 3, "fofoca global mutavel em funcao");
  r = await run("fofoca t = 0\nresolve soma2(a, b) { t = t + a + b }\nsoma2(2, 3)\nsoma2(4, 5)\nt");
  assert(r === 14, "fofoca acumulador global");
  r = await run("fofoca g = 10\nse-pah (verdadeiro) { g = g + 1 }\ng");
  assert(r === 11, "fofoca visivel em bloco");
  r = await run("lei F = 99\nfofoca g2 = 5\nresolve pega() { volta g2 }\npega() + F");
  assert(r === 104, "lei + fofoca combinados");

  console.log("  CONST/GLOBAL: OK\n");
}

testInterpreter()
  .then(testStdlib)
  .then(testConstGlobal)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
