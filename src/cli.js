#!/usr/bin/env node
import fs from "fs";
import { runXS } from "./runtime.js";

const [, , cmd, file] = process.argv;

if (cmd !== "run" || !file) {
  console.log("uso: xs run arquivo.xs");
  process.exit(1);
}

const code = fs.readFileSync(file, "utf-8");
runXS(code)
  .catch(e => console.error("erro:", e.message));