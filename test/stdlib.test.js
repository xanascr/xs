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

async function testStdlibModules() {
  console.log("\n=== STDLIB MODULES ===");

  const env = Object.assign({}, createEnv(process.cwd()));
  async function s(code) {
    const ast = optimize(parse(lex(code)));
    const stmt = ast.body[0];
    return unwrap(await interpret(stmt, env));
  }

  // math
  await s('traz-ai "math" as M');
  assert((await s("M.soma(2, 3)")) === 5, "math.soma");
  assert((await s("M.sub(10, 4)")) === 6, "math.sub");
  assert((await s("M.mul(3, 4)")) === 12, "math.mul");
  assert((await s("M.div(10, 4)")) === 2.5, "math.div");
  assert((await s("M.mod(10, 3)")) === 1, "math.mod");
  assert((await s("M.abs(-7)")) === 7, "math.abs");
  assert((await s("M.max(3, 9)")) === 9, "math.max");
  assert((await s("M.min(3, 9)")) === 3, "math.min");
  assert((await s("M.clamp(15, 0, 10)")) === 10, "math.clamp");

  // array
  await s('traz-ai "array" as A');
  assert((await s("A.primeiro([1, 2, 3])")) === 1, "array.primeiro");
  assert((await s("A.ultimo([1, 2, 3])")) === 3, "array.ultimo");
  assert((await s("A.tem-elemento([1, 2, 3], 2)")) === true, "array.tem-elemento");
  assert((await s("A.acha-indice([1, 2, 3], 2)")) === 1, "array.acha-indice");
  assert(
    JSON.stringify(await s("A.fatia-arr([1, 2, 3, 4], 1, 3)")) === JSON.stringify([2, 3]),
    "array.fatia-arr"
  );
  assert((await s('A.junta-arr(["a", "b"], "-")')) === "a-b", "array.junta-arr");
  assert(
    JSON.stringify(await s("A.inverte-arr([1, 2, 3])")) === JSON.stringify([3, 2, 1]),
    "array.inverte-arr"
  );
  assert((await s("A.soma-arr([1, 2, 3])")) === 6, "array.soma-arr");
  assert((await s("A.media([2, 4, 6])")) === 4, "array.media");
  assert((await s("A.maior([3, 9, 2])")) === 9, "array.maior");
  assert((await s("A.menor([3, 9, 2])")) === 2, "array.menor");
  assert((await s("A.unico([1, 2, 2, 3])")).length === 3, "array.unico");

  // string
  await s('traz-ai "string" as S');
  assert((await s('S.maiuscula("ola")')) === "OLA", "string.maiuscula");
  assert((await s('S.minuscula("OLA")')) === "ola", "string.minuscula");
  assert((await s('S.aparada("  oi  ")')) === "oi", "string.aparada");
  assert((await s('S.começa-com("xana", "xa")')) === true, "string.começa-com");
  assert((await s('S.termina-com("xana", "na")')) === true, "string.termina-com");
  assert((await s('S.tem("xanascript", "script")')) === true, "string.tem");
  assert((await s('S.troca("a-b-c", "-", "+")')) === "a+b+c", "string.troca");
  assert((await s('S.invertida("abc")')) === "cba", "string.invertida");
  assert((await s('S.repete("ab", 3)')) === "ababab", "string.repete");
  assert((await s('S.primeira-maiuscula("xana")')) === "Xana", "string.primeira-maiuscula");

  // json
  await s('traz-ai "json" as J');
  assert((await s("J.em-json({a: 1})")) === '{"a":1}', "json.em-json");
  assert((await s("J.de-json('{\"a\": 1}').a")) === 1, "json.de-json");
  assert(
    (await s('J.hash-sha256("abc")')) ===
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    "json.hash-sha256"
  );

  // datas
  await s('traz-ai "datas" as D');
  assert(typeof (await s("D.agora()")) === "string", "datas.agora");
  assert(typeof (await s("D.agora-ms()")) === "number", "datas.agora-ms");
  assert(typeof (await s("D.do-ms(0)")) === "string", "datas.do-ms");

  console.log("  STDLIB MODULES: OK\n");
}

testStdlibModules().catch((e) => {
  console.error(e);
  process.exit(1);
});
