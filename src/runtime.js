import fs from "fs";
import path from "path";
import vm from "vm";
import axios from "axios";

import { lex } from "./lexer.js";
import { parse } from "./parser.js";
import { generate } from "./codegen.js";

const MODULE_CACHE = new Map();
const ALLOWED = new Set(["axios"]);

async function __http(url) {
  const res = await axios.get(url, { timeout: 3000 });
  return res.data;
}

export async function runXS(code, baseDir = process.cwd()) {
  const context = vm.createContext({
    console,
    __http,
    __sleep,  
    __randInt,  
    __env,     
    __require: async (mod) => __require(mod, context, baseDir)
  });

  return execute(code, context, baseDir);
}

function __sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function __randInt(min, max) {
  min = Number(min);
  max = Number(max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error("SORTEIA requer números");
  }
  if (max < min) [min, max] = [max, min];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function __env(key) {
  if (typeof key !== "string") {
    throw new Error("OUVE AQUI requer string");
  }
  return process.env[key] ?? null;
}

async function execute(code, context, baseDir) {
  const tokens = lex(code);
  const ast = parse(tokens);

  const js = `
    (async () => {
      const __exports = {};
      ${generate(ast)}
      return __exports;
    })()
  `;

  const script = new vm.Script(js);
  return script.runInContext(context);
}

async function __require(mod, context, baseDir) {
  const fullPath = path.resolve(baseDir, mod);

  if (MODULE_CACHE.has(fullPath)) {
    return MODULE_CACHE.get(fullPath);
  }

  const code = fs.readFileSync(fullPath, "utf-8");

  const exports = await execute(code, context, path.dirname(fullPath));

  MODULE_CACHE.set(fullPath, exports);

  return exports;
}