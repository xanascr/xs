import { runBench } from "../src/bench.js";

function assert(condition, msg) {
  if (!condition) throw new Error("FAIL: " + msg);
  console.log("  PASS:", msg);
}

async function testBench() {
  console.log("\n=== BENCH (multi-backend) ===");

  const metrics = await runBench({ iterations: 2 });

  assert(typeof metrics.interp === "number" && metrics.interp > 0, "interpreter medido em ms");
  assert(typeof metrics.vm === "number" && metrics.vm > 0, "VM medido em ms");
  assert(typeof metrics.js === "number" && metrics.js > 0, "JavaScript medido em ms");
  assert(typeof metrics.wasm === "number" && metrics.wasm > 0, "WebAssembly medido em ms");
  assert(metrics.wasm < metrics.interp, "wasm mais rápido que o interpreter");
  assert(metrics.consistent === true, "interp/js/wasm produzem o mesmo resultado");

  console.log("  BENCH: OK\n");
}

testBench().catch((e) => {
  console.error(e);
  process.exit(1);
});
