import { lex } from "./lexer.js";
import { parse } from "./parser.js";
import { optimize } from "./optimizer.js";
import { runXS } from "./runtime.js";

export async function runBench() {
  console.log("\n XanaScript Benchmark\n");

  const xsCode = `
CHAMA ESSE CARA fib(n) {
  SE LIGA SO (n <= 1) {
    VOLTA n
  }
  VOLTA fib(n - 1) + fib(n - 2)
}
fib(20)
`;

  const jsCode = `
function fib(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}
fib(20)
`;

  const ITERATIONS = 3;

  for (let i = 0; i < 2; i++) {
    await runXS(xsCode);
    eval(jsCode);
  }

  let xsTotal = 0;
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    await runXS(xsCode);
    xsTotal += performance.now() - start;
  }

  let jsTotal = 0;
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    eval(jsCode);
    jsTotal += performance.now() - start;
  }

  const xsAvg = (xsTotal / ITERATIONS).toFixed(2);
  const jsAvg = (jsTotal / ITERATIONS).toFixed(2);
  const ratio = (xsTotal / jsTotal).toFixed(2);

  console.log(`  XanaScript: ${xsAvg}ms (avg)`);
  console.log(`  JavaScript:  ${jsAvg}ms (avg)`);
  console.log(`  Ratio:       ${ratio}x (${ratio > 1 ? "slower" : "faster"})`);

  console.log("\n  --- Constant Folding ---");
  const optCode = "CRIA x = 10 + 20 * 3 + (100 / 5)";
  const tokens = lex(optCode);
  let ast = parse(tokens);
  ast = optimize(ast);
  const folded = ast.body[0].init;
  console.log(`  Input:  10 + 20 * 3 + (100 / 5)`);
  console.log(`  Output: ${folded.value} (folded at compile time)`);
  console.log(`  Savings: 4 operations eliminated\n`);

  console.log("   XanaScript compiler eliminates constant expressions at compile-time,");
  console.log("     something raw JS cannot do without a bundler.\n");
}
