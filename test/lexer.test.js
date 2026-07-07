import { lex } from "../src/lexer.js";

function assert(condition, msg) {
  if (!condition) throw new Error("FAIL: " + msg);
  console.log("  PASS:", msg);
}

function testLexer() {
  console.log("\n=== LEXER ===");

  let tokens = lex("CRIA x = 10");
  assert(tokens.length === 5, "CRIA x = 10 -> 5 tokens");
  assert(tokens[0].type === "CRIA", "token 0 = CRIA");
  assert(tokens[1].type === "IDENT" && tokens[1].value === "x", "token 1 = IDENT x");
  assert(tokens[2].type === "=", "token 2 = =");
  assert(tokens[3].type === "NUMBER" && tokens[3].value === 10, "token 3 = NUMBER 10");
  assert(tokens[4].type === "EOF", "token 4 = EOF");

  tokens = lex('SOLTA O GRITO("eai")');
  assert(tokens.length === 7, "SOLTA O GRITO -> 7 tokens");
  assert(tokens[0].type === "SOLTA", "SOLTA");
  assert(tokens[1].type === "O", "O");
  assert(tokens[2].type === "GRITO", "GRITO");

  tokens = lex("10 + 20 * 3");
  assert(tokens.length === 6, "10 + 20 * 3 -> 6 tokens");

  tokens = lex("VERDADEIRO FALSO NULO");
  assert(tokens[0].type === "VERDADEIRO", "VERDADEIRO");
  assert(tokens[1].type === "FALSO", "FALSO");
  assert(tokens[2].type === "NULO", "NULO");

  tokens = lex("a == b && c || d");
  assert(tokens[1].type === "==", "==");
  assert(tokens[3].type === "&&", "&&");
  assert(tokens[5].type === "||", "||");

  tokens = lex("x += 1");
  assert(tokens[1].type === "+=", "+=");

  tokens = lex("x -= 1");
  assert(tokens[1].type === "-=", "-=");

  tokens = lex("x *= 1");
  assert(tokens[1].type === "*=", "*=");

  tokens = lex("10 % 3");
  assert(tokens[1].type === "%", "%");

  tokens = lex("a ? b : c");
  assert(tokens[1].type === "?", "?");
  assert(tokens[3].type === ":", ":");

  tokens = lex("VOA()");
  assert(tokens[0].type === "VOA", "VOA");

  tokens = lex("CONTINUA()");
  assert(tokens[0].type === "CONTINUA", "CONTINUA");

  tokens = lex('`oi ${nome}`');
  assert(tokens[0].type === "TEMPLATE", "template string");
  assert(tokens[0].parts.length === 3, "template parts = 3");

  tokens = lex("a | b");
  assert(tokens[1].type === "|", "bitwise OR");

  tokens = lex("a & b");
  assert(tokens[1].type === "&", "bitwise AND");

  tokens = lex("a ^ b");
  assert(tokens[1].type === "^", "bitwise XOR");

  tokens = lex("~a");
  assert(tokens[0].type === "~", "bitwise NOT");

  tokens = lex("a << b");
  assert(tokens[1].type === "<<", "left shift");

  tokens = lex("a >> b");
  assert(tokens[1].type === ">>", "right shift");

  tokens = lex("a |= 1");
  assert(tokens[1].type === "|=", "OR assign");

  tokens = lex("a &= 1");
  assert(tokens[1].type === "&=", "AND assign");

  tokens = lex("a ^= 1");
  assert(tokens[1].type === "^=", "XOR assign");

  tokens = lex("a <<= 1");
  assert(tokens[1].type === "<<=", "left shift assign");

  tokens = lex("a >>= 1");
  assert(tokens[1].type === ">>=", "right shift assign");

  console.log("  LEXER: OK\n");
}

testLexer();
