import { lex } from "../src/lexer.js";
import { parse } from "../src/parser.js";

function assert(condition, msg) {
  if (!condition) throw new Error("FAIL: " + msg);
  console.log("  PASS:", msg);
}

function testParser() {
  console.log("\n=== PARSER ===");

  let ast = parse(lex("PARTIU() SOLTA O GRITO(1) ACABOU()"));
  assert(ast.type === "Program", "Program node");
  assert(ast.body.length === 1, "1 statement");
  assert(ast.body[0].type === "Call", "Call node");

  ast = parse(lex("CRIA x = 10"));
  assert(ast.body[0].type === "VarDecl", "VarDecl");
  assert(ast.body[0].id === "x", "VarDecl id = x");

  ast = parse(lex("SE LIGA SO (a) { }"));
  assert(ast.body[0].type === "IfStmt", "IfStmt");

  ast = parse(lex("SE LIGA SO (a) { } SENAO { }"));
  assert(ast.body[0].alt !== null, "IfStmt with else");

  ast = parse(lex("REPETE NA MORAL (CRIA i = 0; i < 5; i = i + 1) { }"));
  assert(ast.body[0].type === "ForStmt", "ForStmt");

  ast = parse(lex("CHAMA ESSE CARA foo(a, b) { VOLTA a }"));
  assert(ast.body[0].type === "FunctionDecl", "FunctionDecl");
  assert(ast.body[0].name === "foo", "FunctionDecl name");
  assert(ast.body[0].params.length === 2, "FunctionDecl 2 params");

  ast = parse(lex("VOLTA 42"));
  assert(ast.body[0].type === "ReturnStmt", "ReturnStmt");
  assert(ast.body[0].arg.type === "Num", "ReturnStmt arg");

  ast = parse(lex("EXPORTA foo"));
  assert(ast.body[0].type === "ExportStmt", "ExportStmt");

  ast = parse(lex("IMPORTA \"./mod.xs\""));
  assert(ast.body[0].type === "ImportStmt", "ImportStmt as stmt");

  ast = parse(lex("CRIA x = IMPORTA \"./mod.xs\""));
  assert(ast.body[0].init.type === "ImportExpr", "ImportExpr as expr");

  ast = parse(lex("TENTA { } PEGA(e) { }"));
  assert(ast.body[0].type === "TryCatchStmt", "TryCatchStmt");

  ast = parse(lex("REPETE AI (a) { }"));
  assert(ast.body[0].type === "WhileStmt", "WhileStmt");

  ast = parse(lex("VOA()"));
  assert(ast.body[0].type === "BreakStmt", "BreakStmt");

  ast = parse(lex("CONTINUA()"));
  assert(ast.body[0].type === "ContinueStmt", "ContinueStmt");

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

  console.log("  PARSER: OK\n");
}

testParser();
