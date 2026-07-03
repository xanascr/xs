import fs from "fs";
import path from "path";
import { lex } from "./lexer.js";
import { parse } from "./parser.js";
import { optimize } from "./optimizer.js";
import { interpret, AssertionError } from "./interpreter.js";
import { createEnv } from "./runtime.js";
import { setSource, XSError } from "./errors.js";

export async function runTests(dir = ".") {
  const start = Date.now();
  const root = path.resolve(dir);

  console.log("");
  console.log("╔══════════════════════════════════════╗");
  console.log("║       XanaScript Test Runner         ║");
  console.log("╚══════════════════════════════════════╝");
  console.log("");

  const testFiles = findTestFiles(root);

  if (testFiles.length === 0) {
    console.log("  Nenhum arquivo de teste encontrado (*test*.xs)");
    console.log("");
    return;
  }

  console.log(`   ${testFiles.length} arquivo(s) encontrado(s)\n`);

  let totalPassed = 0;
  let totalFailed = 0;
  const failures = [];

  for (const file of testFiles) {
    const relPath = path.relative(root, file);
    console.log(`   ${relPath}`);

    const code = fs.readFileSync(file, "utf-8");
    const results = await runTestFile(code, file);

    for (const r of results) {
      if (r.passed) {
        console.log(`     ${r.name}`);
        totalPassed++;
      } else {
        console.log(`     ${r.name}`);
        console.log(`       ${r.error}`);
        totalFailed++;
        failures.push({ file: relPath, name: r.name, error: r.error });
      }
    }

    if (results.length === 0) {
      console.log(`     Nenhum TESTE encontrado`);
    }

    console.log("");
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log("──────────────────────────────────────");
  console.log(`   ${totalPassed} passaram   ${totalFailed} falharam`);
  console.log(`   ${elapsed}s`);
  console.log("");

  if (failures.length > 0) {
    console.log("  Falhas:");
    for (const f of failures) {
      console.log(`    ${f.file} > ${f.name}: ${f.error}`);
    }
    console.log("");
    process.exit(1);
  }
}

export async function runTestFile(code, filePath) {
  const results = [];
  const env = createEnv(path.dirname(filePath));
  env.__testResults = results;

  env.AFIRMA = (cond) => {
    if (!cond) throw new AssertionError("AFIRMA recebeu falso");
  };
  env.ASSUNTO = (a, b) => {
    if (a != b) throw new AssertionError(`ASSUNTO falhou: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
  };

  try {
    setSource(code, filePath);
    const tokens = lex(code, filePath);
    let ast = parse(tokens);
    ast = optimize(ast);
    await interpret(ast, env);
  } catch (e) {
    if (!(e instanceof AssertionError)) {
      results.push({ name: "Erro no arquivo", passed: false, error: e.message });
    }
  }

  return results;
}

function findTestFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory() && entry.name !== "node_modules" && !entry.name.startsWith(".")) {
      files.push(...findTestFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".xs") && entry.name.toLowerCase().includes("test")) {
      files.push(fullPath);
    }
  }

  return files;
}
