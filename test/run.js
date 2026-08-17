import { spawnSync } from "node:child_process";

const suites = [
  "lexer",
  "parser",
  "optimizer",
  "interpreter",
  "stdlib",
  "vm",
  "typecheck",
  "errors",
  "parity",
  "sourcemap",
  "pkgmgr",
  "cli",
  "lsp",
  "dap",
  "wasm",
  "memory",
  "bench",
];

let failed = false;
for (const s of suites) {
  const res = spawnSync(process.execPath, [`test/${s}.test.js`], {
    stdio: "inherit",
  });
  if (res.status !== 0) {
    console.error(`\n=== SUITE FALHOU: ${s} (exit ${res.status}) ===\n`);
    failed = true;
  }
}

if (failed) {
  console.error("\ntest:all falhou");
  process.exit(1);
}
console.log("\ntest:all: OK (todas as suítes)");
