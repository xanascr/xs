import fs from "fs";
import path from "path";
import axios from "axios";

import { lex } from "./lexer.js";
import { parse } from "./parser.js";
import { optimize } from "./optimizer.js";
import { interpret } from "./interpreter.js";

const CACHE = new Map();

export async function runXS(code, baseDir = process.cwd()) {
  const tokens = lex(code);

  let ast = parse(tokens);
  ast = optimize(ast);

  const env = createEnv(baseDir);
  return interpret(ast, env);
}

function createEnv(baseDir) {
  return {
    SOLTA_O_GRITO: (...a) => console.log(...a),
    FALA_BAIXO: (...a) => console.warn(...a),
    AGORA_VAI: async url => {
      const res = await axios.get(url, {
        timeout: 3000
      });
      return res.data;
    },
    ESPERA_AI: ms => new Promise(r => setTimeout(r, ms)),
    SORTEIA: (a, b) => Math.floor(Math.random() * (b - a + 1)) + a,
    PARSEIA: JSON.parse,
    OUVE_AQUI: k => process.env[k] ?? null,
    __IMPORT__: async mod => {
      const full = path.resolve(baseDir, mod);
      if (CACHE.has(full)) {
        return CACHE.get(full);
      }
      const code = fs.readFileSync(full, "utf-8");
      const exports = {};
      const env2 = createEnv(path.dirname(full));
      env2.EXPORTA = (name, value) => { exports[name] = value; };
      await runModule(code, env2);
      CACHE.set(full, exports);
      return exports;
    }
  };
}

async function runModule(code, env) {
  const tokens = lex(code);

  let ast = parse(tokens);
  ast = optimize(ast);

  for (const stmt of ast.body) {
    if (stmt.type === "ExportStmt") {
      env.EXPORTA(stmt.name, env[stmt.name]);
      continue;
    }

    await interpret(stmt, env);
  }
}