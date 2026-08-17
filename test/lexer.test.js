import { lex } from "../src/lexer.js";

function assert(condition, msg) {
  if (!condition) throw new Error("FAIL: " + msg);
  console.log("  PASS:", msg);
}

function testLexer() {
  console.log("\n=== LEXER ===");

  let tokens = lex("cria x = 10");
  assert(tokens.length === 5, "cria x = 10 -> 5 tokens");
  assert(tokens[0].type === "cria", "token 0 = cria");
  assert(tokens[1].type === "IDENT" && tokens[1].value === "x", "token 1 = IDENT x");
  assert(tokens[2].type === "=", "token 2 = =");
  assert(tokens[3].type === "NUMBER" && tokens[3].value === 10, "token 3 = NUMBER 10");
  assert(tokens[4].type === "EOF", "token 4 = EOF");

  tokens = lex('grita-ae("eai")');
  assert(tokens.length === 5, "grita-ae -> 5 tokens");
  assert(tokens[0].type === "grita-ae", "grita-ae");

  tokens = lex("10 + 20 * 3");
  assert(tokens.length === 6, "10 + 20 * 3 -> 6 tokens");

  tokens = lex("verdadeiro falso nulo");
  assert(tokens[0].type === "verdadeiro", "verdadeiro");
  assert(tokens[1].type === "falso", "falso");
  assert(tokens[2].type === "nulo", "nulo");

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

  tokens = lex("mete-o-pe()");
  assert(tokens[0].type === "mete-o-pe", "mete-o-pe");

  tokens = lex("segue-o-baile()");
  assert(tokens[0].type === "segue-o-baile", "segue-o-baile");

  tokens = lex("se-pah (x) {}");
  assert(tokens[0].type === "se-pah", "se-pah");

  tokens = lex("repete-na-moral (cria i = 0; i < 5; i++) {}");
  assert(tokens[0].type === "repete-na-moral", "repete-na-moral");

  tokens = lex("repete-enquanto (x) {}");
  assert(tokens[0].type === "repete-enquanto", "repete-enquanto");

  tokens = lex("aguenta-ai(1000)");
  assert(tokens[0].type === "aguenta-ai", "aguenta-ai");

  tokens = lex("terminamos!(server)");
  assert(tokens[0].type === "terminamos!", "terminamos!");

  tokens = lex("Usuario.quantos?()");
  assert(tokens[0].type === "IDENT" && tokens[0].value === "Usuario", "Usuario");
  assert(tokens[2].type === "IDENT" && tokens[2].value === "quantos?", "quantos?");

  tokens = lex("Usuario.vê()");
  assert(tokens[2].type === "IDENT" && tokens[2].value === "vê", "vê");

  tokens = lex("a - b");
  assert(tokens[1].type === "-", "minus operator com espacos");

  tokens = lex("`oi ${nome}`");
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
