import fs from "fs";
import path from "path";
import { lex } from "./lexer.js";
import { parse } from "./parser.js";

export async function generateDocs(srcDir = ".", outDir = "docs") {
  const root = path.resolve(srcDir);
  const output = path.resolve(outDir);

  if (!fs.existsSync(output)) {
    fs.mkdirSync(output, { recursive: true });
  }

  console.log(` Gerando documentação de ${root} → ${output}`);

  const files = [];
  collectXSFile(root, files);

  if (files.length === 0) {
    console.log("  Nenhum arquivo .xs encontrado");
    return;
  }

  console.log(`  ${files.length} arquivo(s) encontrado(s)`);

  const allDocs = [];

  for (const file of files) {
    const relPath = path.relative(root, file);
    const code = fs.readFileSync(file, "utf-8");
    const doc = extractDocs(relPath, code);
    if (doc) allDocs.push(doc);
  }

  const html = generateHTML(allDocs);
  const outFile = path.join(output, "index.html");
  fs.writeFileSync(outFile, html, "utf-8");

  console.log(`   Documentação gerada: ${outFile}`);
  console.log(`  Abra no navegador para ver`);
}

function collectXSFile(dir, files) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules" && !entry.name.startsWith(".")) {
      collectXSFile(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith(".xs") && !entry.name.includes("node_modules")) {
      files.push(fullPath);
    }
  }
}

function extractDocs(filePath, code) {
  const lines = code.split("\n");
  const functions = [];
  const classes = [];
  const tests = [];
  const tasks = [];
  const comments = [];

  let currentComment = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("//")) {
      currentComment.push(trimmed.slice(2).trim());
      continue;
    }

    const docStr = currentComment.length > 0 ? currentComment.join("\n") : null;
    currentComment = [];

    if (trimmed.startsWith("CHAMA ESSE CARA ")) {
      const match = trimmed.match(/CHAMA ESSE CARA (\w+)/);
      if (match) {
        functions.push({
          name: match[1],
          doc: docStr,
          line: i + 1,
          code: trimmed,
        });
      }
    }

    if (trimmed.startsWith("CLASSE ")) {
      const match = trimmed.match(/CLASSE (\w+)/);
      if (match) {
        classes.push({
          name: match[1],
          doc: docStr,
          line: i + 1,
          code: trimmed,
        });
      }
    }

    if (trimmed.startsWith("TAREFA ")) {
      const match = trimmed.match(/TAREFA (\w+)/);
      if (match) {
        tasks.push({
          name: match[1],
          doc: docStr,
          line: i + 1,
          code: trimmed,
        });
      }
    }

    if (trimmed.startsWith("TESTE ")) {
      const match = trimmed.match(/TESTE "([^"]+)"/);
      if (match) {
        tests.push({
          name: match[1],
          doc: docStr,
          line: i + 1,
          code: trimmed,
        });
      }
    }

    if (docStr && !trimmed.match(/CHAMA ESSE CARA|CLASSE|TAREFA|TESTE/)) {
      comments.push({ doc: docStr, line: i + 1 });
    }
  }

  if (functions.length === 0 && classes.length === 0 && tests.length === 0 && tasks.length === 0) {
    return null;
  }

  return {
    file: filePath,
    functions,
    classes,
    tests,
    tasks,
    comments,
  };
}

function generateHTML(allDocs) {
  let items = "";
  let navItems = "";

  for (const doc of allDocs) {
    const fileId = doc.file.replace(/[^a-zA-Z0-9]/g, "-");
    navItems += `<a href="#${fileId}">${doc.file}</a>\n`;

    let funcs = "";
    for (const f of doc.functions) {
      funcs += `<div class="item">
        <div class="item-header">
          <span class="tag fn">function</span>
          <code>${f.name}</code>
          <span class="line">linha ${f.line}</span>
        </div>
        ${f.doc ? `<p class="doc">${escapeHtml(f.doc)}</p>` : ""}
        <pre><code>${escapeHtml(f.code)}</code></pre>
      </div>\n`;
    }

    let classes = "";
    for (const c of doc.classes) {
      classes += `<div class="item">
        <div class="item-header">
          <span class="tag cls">class</span>
          <code>${c.name}</code>
          <span class="line">linha ${c.line}</span>
        </div>
        ${c.doc ? `<p class="doc">${escapeHtml(c.doc)}</p>` : ""}
        <pre><code>${escapeHtml(c.code)}</code></pre>
      </div>\n`;
    }

    let tests = "";
    for (const t of doc.tests) {
      tests += `<div class="item">
        <div class="item-header">
          <span class="tag test">test</span>
          <code>${escapeHtml(t.name)}</code>
          <span class="line">linha ${t.line}</span>
        </div>
      </div>\n`;
    }

    let tasks = "";
    for (const t of doc.tasks) {
      tasks += `<div class="item">
        <div class="item-header">
          <span class="tag task">task</span>
          <code>${t.name}</code>
          <span class="line">linha ${t.line}</span>
        </div>
        ${t.doc ? `<p class="doc">${escapeHtml(t.doc)}</p>` : ""}
      </div>\n`;
    }

    items += `<div class="file" id="${fileId}">
      <h2> ${doc.file}</h2>
      ${funcs ? `<h3>Funções</h3>${funcs}` : ""}
      ${classes ? `<h3>Classes</h3>${classes}` : ""}
      ${tests ? `<h3>Testes</h3>${tests}` : ""}
      ${tasks ? `<h3>Tarefas</h3>${tasks}` : ""}
    </div>\n`;
  }

  return `<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>XanaScript Docs</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Inter', -apple-system, sans-serif;
  background: #0d1117; color: #c9d1d9;
  display: flex; min-height: 100vh;
}
nav {
  width: 260px; padding: 24px; background: #161b22;
  border-right: 1px solid #30363d; position: sticky; top: 0; height: 100vh; overflow-y: auto;
}
nav h1 { font-size: 18px; margin-bottom: 16px; }
nav a { display: block; color: #8b949e; text-decoration: none; font-size: 13px; padding: 4px 0; }
nav a:hover { color: #58a6ff; }
.content { flex: 1; padding: 32px; max-width: 900px; }
.file { margin-bottom: 48px; }
.file h2 { font-size: 20px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #30363d; }
h3 { font-size: 16px; margin: 24px 0 12px; color: #8b949e; }
.item { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
.item-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.tag { font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
.tag.fn { background: #1f6feb33; color: #58a6ff; }
.tag.cls { background: #23863633; color: #3fb950; }
.tag.test { background: #9e6a0333; color: #d29922; }
.tag.task { background: #da363333; color: #f85149; }
.line { color: #484f58; font-size: 12px; margin-left: auto; }
.doc { color: #8b949e; font-size: 13px; margin-bottom: 8px; white-space: pre-wrap; }
pre { background: #0d1117; border-radius: 4px; padding: 12px; overflow-x: auto; }
code { font-family: 'JetBrains Mono', monospace; font-size: 13px; }
</style>
</head>
<body>
<nav>
  <h1> XanaScript Docs</h1>
  ${navItems}
</nav>
<div class="content">
  ${items}
</div>
</body>
</html>`;
}

function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
