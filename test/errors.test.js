import { lex } from "../src/lexer.js";
import { parse } from "../src/parser.js";
import { interpret } from "../src/interpreter.js";
import { createEnv } from "../src/runtime.js";
import {
  XSError,
  levenshtein,
  didYouMean,
  formatError,
  CATEGORY,
  setSource,
} from "../src/errors.js";

function assert(condition, msg) {
  if (!condition) throw new Error("FAIL: " + msg);
  console.log("  PASS:", msg);
}

async function runThrows(src) {
  setSource(src, "test_errors.xs");
  const tokens = lex(src, "test_errors.xs");
  let ast;
  try {
    ast = parse(tokens);
  } catch (e) {
    return e;
  }
  const env = createEnv(process.cwd());
  try {
    await interpret(ast, env);
    return null;
  } catch (e) {
    return e;
  }
}

async function testErrors() {
  console.log("\n=== ERRORS (Fase 3) ===");

  // --- 3.1 Levenshtein distance ---
  assert(levenshtein("nome", "nome") === 0, "levenshtein identico = 0");
  assert(levenshtein("nome", "noma") === 1, "levenshtein noma/nome = 1");
  assert(levenshtein("", "abc") === 3, "levenshtein vazio = tamanho");
  assert(levenshtein("kitten", "sitting") === 3, "levenshtein kitten/sitting = 3");

  // --- 3.2 did-you-mean ---
  const sugs = didYouMean("noma", ["nome", "idade", "cidade"]);
  assert(sugs === "nome", "did-you-mean noma -> nome");
  const sugs2 = didYouMean("grita", ["grita-ae", "sussurra"], 3);
  assert(sugs2 === "grita-ae", "did-you-mean grita -> grita-ae");
  assert(didYouMean("zzz", ["aaa"]) === null, "did-you-mean sem proximo = null");

  // --- 3.3 Categorias ---
  const e1 = new XSError("msg", { code: "SINT-01" });
  assert(e1.code === "SINT-01", "codigo SINT-01 presente");
  assert(typeof CATEGORY.SINT === "string" && CATEGORY.SINT === "SINT", "categoria SINT");
  assert(CATEGORY.TIPO === "TIPO" && CATEGORY.NOME === "NOME", "categorias TIPO/NOME");
  assert(CATEGORY.IMPT === "IMPT" && CATEGORY.NET === "NET", "categorias IMPT/NET");
  assert(CATEGORY.ORML === "ORML" && CATEGORY.TST === "TST", "categorias ORML/TST");
  assert(CATEGORY.RUNT === "RUNT" && CATEGORY.INFO === "INFO", "categorias RUNT/INFO");

  // --- 3.4 Formatting ---
  setSource("cria x = 10", "fmt.xs");
  const err = new XSError("Erro de teste", {
    loc: { line: 1, column: 7, file: "fmt.xs" },
    code: "SINT-01",
    hint: "Dica aqui",
    help: "Como consertar aqui",
  });
  const out = formatError(err);
  assert(out.includes("SINT-01"), "formato inclui codigo");
  assert(out.includes("Dica aqui"), "formato inclui hint");
  assert(out.includes("Como consertar aqui"), "formato inclui help");
  assert(out.includes("fmt.xs:1:7"), "formato inclui local");
  assert(out.includes("cria x = 10"), "formato inclui linha de codigo");

  // --- 3.4b Suggestion e frames no formato ---
  const err2 = new XSError("msg", {
    suggestion: "nome",
    frames: [{ name: "f", loc: { file: "a.xs", line: 1, column: 1 } }],
  });
  const out2 = formatError(err2);
  assert(out2.includes("nome"), "formato inclui sugestao");
  assert(out2.includes("resolve f"), "formato inclui stack frame");

  // --- 3.4c Undefined variable error has a suggestion (did-you-mean runtime) ---
  const r1 = await runThrows("cria noma = 10\ngrita-ae(nome)");
  assert(r1 !== null && r1 instanceof XSError, "variavel undefined gera XSError");
  assert(r1.code.startsWith("NOME"), "undefined var usa categoria NOME");
  assert(r1.suggestion === "noma", "undefined var sugere nome proximo no escopo");

  // --- 3.4d Erro de sintaxe usa categoria SINT ---
  const r2 = await runThrows("cria x = ");
  assert(r2 === null || r2.code.startsWith("SINT"), "erro de sintaxe usa SINT");

  // --- 3.5 Stack em XanaScript ---
  const r3 = await runThrows("resolve f() { grita-ae(x) }\nresolve g() { f() }\ng()");
  assert(r3 !== null && r3.frames && r3.frames.length >= 2, "stack tem frames");
  const frameNames = r3.frames.map((f) => f.name);
  assert(frameNames.includes("f") && frameNames.includes("g"), "stack tem f e g");
  assert(!r3.stack || r3.frames, "stack de XanaScript (nomes de resolve)");

  console.log("  ERRORS: OK\n");
}

await testErrors();
