import { lex } from "../src/lexer.js";
import { parse } from "../src/parser.js";
import { checkTypes } from "../src/typecheck.js";

function assert(condition, msg) {
  if (!condition) throw new Error("FAIL: " + msg);
  console.log("  PASS:", msg);
}

function check(src) {
  return checkTypes(parse(lex(src)));
}

function testTypes() {
  console.log("\n=== TYPECHECK ===");

  let errors = check("cria x: eh-numero = 10");
  assert(errors.length === 0, "anotacao eh-numero ok");

  errors = check('cria x: eh-numero = "oops"');
  assert(errors.length === 1, "anotacao eh-numero + string erro");

  errors = check(
    "resolve soma(a: eh-numero, b: eh-numero): eh-numero { volta a + b } cria r = soma(1, 2)"
  );
  assert(errors.length === 0, "funcao tipada ok");

  errors = check('resolve soma(a: eh-numero): eh-numero { volta a } cria r = soma("x")');
  assert(errors.length === 1, "argumento de tipo errado");

  errors = check("cria x = 1 resolve f(): eh-numero { volta x }");
  assert(errors.length === 0, "inferencia variavel ok");

  errors = check("resolve id<T>(x: T): T { volta x } cria n = id(42)");
  assert(errors.length === 0, "generico T ok");

  errors = check(
    'tipo Usuario { nome: eh-palavra, idade: eh-numero } cria u: Usuario = { nome: "Ana", idade: 25 }'
  );
  assert(errors.length === 0, "struct ok");

  errors = check("tipo Usuario { nome: eh-palavra } cria u: Usuario = { nome: 42 }");
  assert(errors.length === 1, "struct prop errada");

  errors = check("cria x: sepah<eh-palavra> = nulo");
  assert(errors.length === 0, "sepah aceita nulo");

  errors = check("cria x: sus<eh-numero> = [1, 2, 3]");
  assert(errors.length === 0, "sus<eh-numero> ok");

  errors = check('cria x: sus<eh-numero> = ["a", "b"]');
  assert(errors.length === 1, "sus<eh-numero> com string erro");

  errors = check("tipo ID = eh-numero cria x: ID = 5");
  assert(errors.length === 0, "alias tipo ok");

  errors = check('tipo A = eh-numero | eh-palavra cria x: A = "oi"');
  assert(errors.length === 0, "union aceita membro");

  errors = check("tipo Cb = (erro: eh-palavra) => nah");
  assert(errors.length === 0, "function type decl");

  errors = check('cria x: crush<eh-numero, eh-palavra> = [1, "um"]');
  assert(errors.length === 0, "tupla crush ok");

  errors = check('cria x: crush<eh-numero, eh-numero> = [1, "um"]');
  assert(errors.length === 1, "tupla crush posicao errada");

  errors = check("cria x: sus<eh-numero> = [1, 2]");
  assert(errors.length === 0, "array homogeneo como sus");

  errors = check("resolve f(): promessa<eh-numero> { volta 1 }");
  assert(errors.length === 0, "promessa declarada");

  errors = check(
    'DB Usuario { nome: eh-palavra, idade: eh-numero } cria u: Usuario = { nome: "Ana", idade: 30 }'
  );
  assert(errors.length === 0, "DB + objeto tipado ok");

  errors = check("DB Usuario { nome: eh-palavra } cria u: Usuario = { nome: 42 }");
  assert(errors.length === 1, "DB campo errado");

  errors = check(
    'DB Usuario { nome: eh-palavra, idade: eh-numero } Usuario.bota-ai({ nome: "Ana", idade: 30 })'
  );
  assert(errors.length === 0, "bota-ai ok");

  errors = check('DB Usuario { nome: eh-palavra } Usuario.alterakkkk(1, { nome: "Ana" })');
  assert(errors.length === 0, "alterakkkk ok (alias de altera)");

  errors = check(
    "DB Usuario { nome: eh-palavra, idade: eh-numero } Usuario.bota-ai({ nome: 42, idade: 30 })"
  );
  assert(errors.length === 1, "bota-ai campo errado");

  errors = check(
    "DB Usuario { nome: eh-palavra } cria lista = Usuario.vê() cria n = lista[0].nome"
  );
  assert(errors.length === 0, "vê() retorna sus<Usuario> e member ok");

  errors = check("DB Usuario { nome: eh-palavra } cria q: eh-numero = Usuario.quantos?()");
  assert(errors.length === 0, "quantos?() eh-numero");

  errors = check("cria x: eh-palavra = 1 + 2");
  assert(errors.length === 1, "numero em eh-palavra erro");

  errors = check("resolve f(): vdd? { volta verdadeiro }");
  assert(errors.length === 0, "bool return ok");

  errors = check("resolve f(): vdd? { volta 5 }");
  assert(errors.length === 1, "bool return errado");

  errors = check("cria y = 5 cria y: eh-numero = 3");
  assert(errors.length === 0, "redecl com anotacao ok");

  errors = check("cria x: vdd? = 1 === 1");
  assert(errors.length === 0, "=== retorna vdd? ok");

  errors = check("cria x: eh-palavra = 1 === 1");
  assert(errors.length === 1, "=== em eh-palavra erro");

  errors = check('cria x = nulo cria y = x ?? "fallback" cria z: eh-palavra = y');
  assert(errors.length === 0, "?? fallback ok");

  errors = check("cria x: eh-numero = 2 ** 10");
  assert(errors.length === 0, "** retorna eh-numero ok");

  errors = check(
    'tipo U { nome: eh-palavra } cria u: U = { nome: "Ana" } cria n: eh-palavra = u?.nome'
  );
  assert(errors.length === 0, "?. member tipado ok");

  errors = check("cria x = [1, 2] cria y = [...x, 3] cria n: eh-numero = y[0]");
  assert(errors.length === 0, "spread array ok");

  errors = check("cria b = { a: 1 } cria c = { ...b, x: 2 } cria n: eh-numero = c.a");
  assert(errors.length === 0, "spread objeto ok");

  errors = check("cria t: eh-palavra = tipo-de(5)");
  assert(errors.length === 0, "tipo-de retorna eh-palavra ok");

  errors = check(
    "classe Animal { spawna() {} } cria a = novo Animal cria b: vdd? = instancia-de(a, Animal)"
  );
  assert(errors.length === 0, "instancia-de retorna vdd? ok");

  errors = check("lei X = 10 cria y = X + 1");
  assert(errors.length === 0, "lei declara const ok");
  errors = check("lei X = 10 X = 5");
  assert(errors.length === 1, "lei impede reatribuicao no typecheck");
  errors = check("fofoca g = 1 resolve inc() { g = g + 1 } inc()");
  assert(errors.length === 0, "fofoca global mutavel ok");

  console.log("  TYPECHECK: OK\n");
}

testTypes();
