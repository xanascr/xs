#!/usr/bin/env node
import fs from "fs";
import { runXS } from "./runtime.js";

const [, , cmd, file] = process.argv;
if (!cmd || !file) {
  console.log(`uso: xs run arquivo.xs or xs vm arquivo.xs`);
  process.exit(1);
}

const code = fs.readFileSync(file, "utf-8");
(async () => {
  try {
    if (cmd === "run") {
      await runXS(code);
      return;
    }

    if (cmd === "vm") {
      const { lex } = await import("./lexer.js");
      const { parse } = await import("./parser.js");
      const { optimize } = await import("./optimizer.js");
      const { compile } = await import("./bytecode/compiler.js");
      const { run } = await import("./bytecode/vm.js");

      const tokens = lex(code);

      let ast = parse(tokens);
      ast = optimize(ast);

      const bytecode = compile(ast);

      console.log("BYTECODE:");
      console.log(bytecode);

      console.log("\nRESULT:");
      console.log(run(bytecode));
      return;
    }

    console.log("comando inválido");
  } catch (e) {
    console.error("erro:", e.message);
  }
})();