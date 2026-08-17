import { lex } from "../src/lexer.js";
import { parse } from "../src/parser.js";
import { optimize } from "../src/optimizer.js";
import { compile } from "../src/bytecode/compiler.js";
import { run } from "../src/bytecode/vm.js";

function assert(condition, msg) {
  if (!condition) throw new Error("FAIL: " + msg);
  console.log("  PASS:", msg);
}

function vmRun(code, baseDir = process.cwd()) {
  const tokens = lex(code);
  let ast = parse(tokens);
  ast = optimize(ast);
  return run(compile(ast), baseDir);
}

async function testVM() {
  console.log("\n=== VM ===");

  assert(vmRun("cria y = verdadeiro && falso\nvolta y") === false, "&& curto-circuito false");
  assert(vmRun("cria z = falso || 10\nvolta z") === 10, "|| curto-circuito valor");
  assert(vmRun("cria w = 1\nw &&= 2\nvolta w") === 2, "&&=");
  assert(vmRun("cria w = 1\nw ||= 3\nvolta w") === 1, "||= preserva truthy");
  assert(vmRun("cria a = nulo\na ??= 42\nvolta a") === 42, "??=");
  assert(vmRun("volta tamanho([1,2,3,4,5])") === 5, "LEN array");
  assert(vmRun('volta tamanho("olamundo")') === 8, "LEN string");

  assert(
    vmRun(`
resolve descreve(valor) {
  ve-se (valor) {
    bateu-com 1: volta "um"
    bateu-com [a, b]: volta a + b
    bateu-com { nome: n }: volta n
    qualquer-coisa: volta "outro"
  }
}
volta descreve(1)
`) === "um",
    "match literal"
  );
  assert(
    vmRun(`
resolve descreve(valor) {
  ve-se (valor) {
    bateu-com [a, b]: volta a + b
    qualquer-coisa: volta "outro"
  }
}
volta descreve([4, 5])
`) === 9,
    "match array desestrutura"
  );
  assert(
    vmRun(`
resolve descreve(valor) {
  ve-se (valor) {
    bateu-com { nome: n }: volta n
    qualquer-coisa: volta "outro"
  }
}
volta descreve({ nome: "ana" })
`) === "ana",
    "match objeto"
  );
  assert(
    vmRun(`
resolve acha(n) {
  ve-se (n) {
    bateu-com 10: volta "dez"
  }
  volta "nenhum"
}
volta acha(3)
`) === "nenhum",
    "match sem fallback -> null path"
  );

  assert(vmRun('volta divide-texto("a,b", ",").length') === 2, "builtin divide-texto no VM");
  assert(vmRun('volta juntar(["a","b"], "-")') === "a-b", "builtin juntar no VM");
  assert(vmRun('volta decodifica-url("a%20b")') === "a b", "builtin decodifica-url no VM");
  assert(vmRun('volta url("a b")') === "a%20b", "builtin url no VM");

  assert(vmRun("cria i = 0\ni++\nvolta i") === 1, "update prefix ident ++");
  assert(vmRun("cria i = 5\n--i\nvolta i") === 4, "update prefix ident --");
  assert(vmRun("cria i = 0\nvolta i++") === 0, "update postfix ident ++");
  assert(vmRun("cria i = 5\nvolta i--") === 5, "update postfix ident --");
  assert(vmRun("cria i = 0\ni++\nvolta i++") === 1, "update postfix retorna antigo e atualiza");
  assert(vmRun("cria o = { n: 2 }\no.n++\nvolta o.n") === 3, "update member ++");
  assert(vmRun("cria o = { n: 2 }\nvolta o.n++") === 2, "update member postfix");
  assert(vmRun("cria o = { n: 2 }\nvolta ++o.n") === 3, "update member prefix");
  assert(vmRun("cria a = [1, 2, 3]\na[1]++\nvolta a[1]") === 3, "update index ++");
  assert(vmRun("cria a = [1, 2, 3]\nvolta a[1]--") === 2, "update index postfix --");
  assert(vmRun("cria a = [1, 2, 3]\nvolta ++a[0]") === 2, "update index prefix ++");

  assert(vmRun("lei X = 10\nvolta X") === 10, "lei declara constante");
  assert(vmRun("lei A = 5\nlei B = 6\nvolta A * B") === 30, "lei multiplicacao");
  assert(
    vmRun("fofoca g = 1\nresolve inc() { g = g + 1 }\ninc()\ninc()\nvolta g") === 3,
    "fofoca global mutavel"
  );
  assert(
    vmRun(
      "fofoca t = 0\nresolve soma2(a, b) { t = t + a + b }\nsoma2(2, 3)\nsoma2(4, 5)\nvolta t"
    ) === 14,
    "fofoca acumulador"
  );
  assert(
    vmRun("lei F = 99\nfofoca g2 = 5\nresolve pega() { volta g2 }\nvolta pega() + F") === 104,
    "lei + fofoca"
  );
  let vmErr = false;
  try {
    vmRun("lei X = 1\nX = 5");
  } catch (e) {
    vmErr = /const/i.test(e.message);
  }
  assert(vmErr, "VM: lei impede reatribuicao");
  vmErr = false;
  try {
    vmRun("lei X = 1\nX++");
  } catch (e) {
    vmErr = /const/i.test(e.message);
  }
  assert(vmErr, "VM: lei impede ++");

  console.log("  VM: OK\n");
}

testVM().catch((e) => {
  console.error(e);
  process.exit(1);
});
