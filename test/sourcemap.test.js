import { SourceMap, buildSourceMap } from "../src/sourcemap.js";

function assert(condition, msg) {
  if (!condition) throw new Error("FAIL: " + msg);
  console.log("  PASS:", msg);
}

function testSourceMap() {
  console.log("\n=== SOURCE MAP ===");

  const xs = `resolve soma(a, b) {
  volta a + b
}
cria x = 10
grita-ae(soma(x, 5))`;

  // buildSourceMap: 1 statement por linha xs
  const stmts = [
    { loc: { start: { line: 1 } }, generatedJs: "function soma(a, b) {\n return a + b;\n}" },
    { loc: { start: { line: 4 } }, generatedJs: "let x = 10;" },
    { loc: { start: { line: 5 } }, generatedJs: "console.log(soma(x, 5));" },
  ];
  const sm = buildSourceMap(xs.split("\n"), stmts);
  assert(sm.mappings.length === 3, "buildSourceMap cria mapping por statement");
  assert(sm.mappings[0].jsLine === 1 && sm.mappings[0].xsLine === 1, "primeiro mapping correto");
  assert(
    sm.mappings[1].jsLine === 4 && sm.mappings[1].xsLine === 4,
    "mapping aponta jsLine->xsLine"
  );
  assert(sm.mappings[2].jsLine === 5 && sm.mappings[2].xsLine === 5, "segundo mapping correto");

  // translateError: erro na linha JS 5 vira linha xs 5
  const err = new Error("boom");
  err.stack = "Error: boom\n    at main (generated.js:5:20)";
  sm.translateError(err);
  assert(/xs:5/.test(err.stack), "translateError mapeia jsLine 5 -> xs 5");
  assert(err.xsLine === 5, "_findXsLine extrai linha xs");

  // translateError preserva linhas sem mapping
  const err2 = new Error("nope");
  err2.stack = "Error: nope\n    at helper (helper.js:12:3)";
  sm.translateError(err2);
  assert(/helper\.js:12/.test(err2.stack), "linha sem mapping permanece intacta");
  assert(err2.xsLine === null, "sem mapping -> xsLine null");

  // toComment / fromComment roundtrip
  const sm2 = new SourceMap("prog.xs", xs);
  sm2.addXsLine(1, "function soma(a, b) {\n");
  sm2.addXsLine(4, "let x = 10;\n");
  sm2.addXsLine(5, "console.log(soma(x, 5));\n");
  const comment = sm2.toComment();
  assert(
    /sourceMappingURL=data:application\/json;base64,/.test(comment),
    "toComment gera data URL"
  );
  const back = SourceMap.fromComment(comment, xs.split("\n"));
  assert(back !== null, "fromComment recupera mapping");
  assert(back.mappings.length === 3, "roundtrip mantém mappings");
  assert(back.file === "prog.xs", "roundtrip mantém arquivo");

  // addXsLine incremental com contagem de linhas
  const sm3 = new SourceMap("multi.xs", "a\nb\nc\nd\ne");
  sm3.addXsLine(1, "line1\n");
  sm3.add("no-newline");
  sm3.add("line2\n");
  sm3.addXsLine(5, "line5\n");
  assert(sm3.mappings[0].jsLine === 1, "addXsLine inicial é jsLine 1");
  assert(sm3.mappings[1].jsLine === 3, "addXsLine conta novas linhas intermediárias");
  assert(sm3.mappings[1].xsLine === 5, "xsLine 5 mapeada");

  console.log("  SOURCE MAP: OK\n");
}

testSourceMap();
