import { lex } from "../src/lexer.js";
import { parse } from "../src/parser.js";

function assert(condition, msg) {
  if (!condition) throw new Error("FAIL: " + msg);
  console.log("  PASS:", msg);
}

function testParser() {
  console.log("\n=== PARSER ===");

  let ast = parse(lex("grita-ae(1)"));
  assert(ast.type === "Program", "Program node");
  assert(ast.body.length === 1, "1 statement");
  assert(ast.body[0].type === "Call", "Call node");

  ast = parse(lex("cria x = 10"));
  assert(ast.body[0].type === "VarDecl", "VarDecl");
  assert(ast.body[0].id === "x", "VarDecl id = x");

  ast = parse(lex("se-pah (a) { }"));
  assert(ast.body[0].type === "IfStmt", "IfStmt");

  ast = parse(lex("se-pah (a) { } ai { }"));
  assert(ast.body[0].alt !== null, "IfStmt with else");

  ast = parse(lex("repete-na-moral (cria i = 0; i < 5; i = i + 1) { }"));
  assert(ast.body[0].type === "ForStmt", "ForStmt");

  ast = parse(lex("resolve foo(a, b) { volta a }"));
  assert(ast.body[0].type === "FunctionDecl", "FunctionDecl");
  assert(ast.body[0].name === "foo", "FunctionDecl name");
  assert(ast.body[0].params.length === 2, "FunctionDecl 2 params");

  ast = parse(lex("volta 42"));
  assert(ast.body[0].type === "ReturnStmt", "ReturnStmt");
  assert(ast.body[0].arg.type === "Num", "ReturnStmt arg");

  ast = parse(lex("manda-ai foo"));
  assert(ast.body[0].type === "ExportStmt", "ExportStmt");

  ast = parse(lex('traz-ai "./mod.xs"'));
  assert(ast.body[0].type === "ImportStmt", "ImportStmt as stmt");

  ast = parse(lex('cria x = traz-ai "./mod.xs"'));
  assert(ast.body[0].init.type === "ImportExpr", "ImportExpr as expr");

  ast = parse(lex("tenta { } fodeu(e) { }"));
  assert(ast.body[0].type === "TryCatchStmt", "TryCatchStmt");
  assert(ast.body[0].finallyBlock === null, "TryCatchStmt no finally");

  ast = parse(lex("tenta { } fodeu(e) { } no-fim { }"));
  assert(ast.body[0].type === "TryCatchStmt", "TryCatchStmt with finally");
  assert(ast.body[0].finallyBlock !== null, "TryCatchStmt has finally");

  ast = parse(lex("repete-enquanto (a) { }"));
  assert(ast.body[0].type === "WhileStmt", "WhileStmt");

  ast = parse(lex("mete-o-pe()"));
  assert(ast.body[0].type === "BreakStmt", "BreakStmt");

  ast = parse(lex("mete-o-pe"));
  assert(ast.body[0].type === "BreakStmt", "BreakStmt sem parênteses");

  ast = parse(lex("segue-o-baile()"));
  assert(ast.body[0].type === "ContinueStmt", "ContinueStmt");

  ast = parse(lex("segue-o-baile"));
  assert(ast.body[0].type === "ContinueStmt", "ContinueStmt sem parênteses");

  ast = parse(lex("a ? 1 : 2"));
  assert(ast.body[0].type === "Ternary", "Ternary");

  ast = parse(lex("[1, 2, 3]"));
  assert(ast.body[0].type === "ArrayExpr", "ArrayExpr");
  assert(ast.body[0].items.length === 3, "ArrayExpr 3 items");

  ast = parse(lex("{a: 1, b: 2}"));
  assert(ast.body[0].type === "ObjectExpr", "ObjectExpr");
  assert(ast.body[0].props.length === 2, "ObjectExpr 2 props");

  ast = parse(lex("obj.prop"));
  assert(ast.body[0].type === "Member", "Member");

  ast = parse(lex("arr[0]"));
  assert(ast.body[0].type === "IndexExpr", "IndexExpr");

  ast = parse(lex("x += 1"));
  assert(ast.body[0].type === "Assign", "compound += desugars to Assign");
  assert(ast.body[0].right.type === "Binary", "compound += right is Binary");
  assert(ast.body[0].right.op === "+", "compound += op is +");

  ast = parse(lex("x *= 2"));
  assert(ast.body[0].right.op === "*", "compound *= op is *");

  ast = parse(lex("a | b"));
  assert(ast.body[0].type === "Binary" && ast.body[0].op === "|", "bitwise OR");

  ast = parse(lex("a & b"));
  assert(ast.body[0].op === "&", "bitwise AND");

  ast = parse(lex("a ^ b"));
  assert(ast.body[0].op === "^", "bitwise XOR");

  ast = parse(lex("~a"));
  assert(ast.body[0].type === "Unary" && ast.body[0].op === "~", "bitwise NOT");

  ast = parse(lex("a << b"));
  assert(ast.body[0].op === "<<", "left shift");

  ast = parse(lex("a >> b"));
  assert(ast.body[0].op === ">>", "right shift");

  ast = parse(lex("a |= 1"));
  assert(ast.body[0].right.op === "|", "compound |=");

  ast = parse(lex("a <<= 2"));
  assert(ast.body[0].right.op === "<<", "compound <<=");

  ast = parse(lex('crush "nome" { }'));
  assert(ast.body[0].type === "TestStmt", "TestStmt");

  ast = parse(lex('crush("nome") { }'));
  assert(ast.body[0].type === "TestStmt", "TestStmt com parênteses");

  ast = parse(lex("deu-match(x)"));
  assert(ast.body[0].type === "AssertStmt", "AssertStmt");

  ast = parse(lex("date(a, b)"));
  assert(ast.body[0].type === "Call", "date desugars to Call");
  assert(ast.body[0].callee.name === "date", "date callee");

  ast = parse(lex("classe Foo { spawna() { } metodo bar() { } }"));
  assert(ast.body[0].type === "ClassDecl", "ClassDecl");
  assert(ast.body[0].methods.length === 2, "ClassDecl 2 methods");

  ast = parse(lex("vai-de (x) { se-for 1: y = 1 se-nao-der: y = 0 }"));
  assert(ast.body[0].type === "SwitchStmt", "SwitchStmt");

  ast = parse(lex("ve-se (x) { bateu-com 1: y = 1 qualquer-coisa: y = 0 }"));
  assert(ast.body[0].type === "MatchExpr", "MatchExpr");

  ast = parse(lex("DB Usuario { nome: eh-palavra }"));
  assert(ast.body[0].type === "TableDecl", "TableDecl");

  ast = parse(lex("tpm mymacro(x) { }"));
  assert(ast.body[0].type === "MacroDecl", "MacroDecl");

  ast = parse(lex('tarefa("build") { }'));
  assert(ast.body[0].type === "TaskDecl", "TaskDecl");

  console.log("  PARSER: OK\n");
}

testParser();
