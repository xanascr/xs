import { lex } from "../src/lexer.js";
import { parse } from "../src/parser.js";
import { optimize } from "../src/optimizer.js";
import { interpret } from "../src/interpreter.js";

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

  r = await run("VERDADEIRO");
  assert(r === true, "Bool true");

  r = await run("FALSO");
  assert(r === false, "Bool false");

  r = await run("NULO");
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

  r = await run("!VERDADEIRO");
  assert(r === false, "unary not");

  r = await run("10 == 10");
  assert(r === true, "eq true");

  r = await run("10 != 10");
  assert(r === false, "neq false");

  r = await run("10 > 5");
  assert(r === true, "gt");

  r = await run("10 < 5");
  assert(r === false, "lt");

  r = await run("VERDADEIRO && VERDADEIRO");
  assert(r === true, "and");

  r = await run("VERDADEIRO && FALSO");
  assert(r === false, "and false");

  r = await run("FALSO || VERDADEIRO");
  assert(r === true, "or");

  r = await run("FALSO || FALSO");
  assert(r === false, "or false");

  const env = {};
  r = await run("CRIA x = 42", env);
  assert(env.x === 42, "VarDecl");
  r = await run("x", env);
  assert(r === 42, "Ident lookup");

  r = await run("CRIA a = 1 + 2", env);
  assert(env.a === 3, "VarDecl with expr");

  r = await run("VERDADEIRO ? 1 : 2");
  assert(r === 1, "ternary true");
  r = await run("FALSO ? 1 : 2");
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

testInterpreter().catch(e => { console.error(e); process.exit(1); });
