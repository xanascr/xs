









import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_VERSION = "2.0.0";
const ROOT = join(__dirname, "..");

async function main() {
  console.log("╔══════════════════════════════════════╗");
  console.log(`║  XanaScript v${PKG_VERSION.padEnd(5)} Native Build   ║`);
  console.log("╚══════════════════════════════════════╝");

  const distDir = join(ROOT, "dist");
  if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });

  const hasBun = await commandExists("bun");
  const hasPkg = await commandExists("pkg");

  if (!hasBun && !hasPkg) {
    console.log("✗ Precisa de bun ou pkg:");
    console.log("  npm install -g bun");
    console.log("  npm install -g pkg");
    process.exit(1);
  }

  
  
  

  const entryContent = `
import "./src/cli.js";
`;
  const entryFile = join(ROOT, "_xs_entry.mjs");
  writeFileSync(entryFile, entryContent, "utf-8");

  
  
  

  if (hasBun) {
    console.log("\n🐰 Bun detectado. Gerando binário nativo...\n");

    const plat = process.platform;
    const arch = process.arch;
    const outName = `xs${plat === "win32" ? ".exe" : ""}`;
    const outPath = join(distDir, outName);

    try {
      execSync(
        `bun build "${entryFile}" --compile --target=bun-${plat}-${arch} --outfile "${outPath}"`,
        {
          stdio: "inherit",
          cwd: ROOT,
          timeout: 120000,
        }
      );
      console.log(`  ✓ ${outName} (${plat} ${arch})`);
      console.log(`  📁 ${outPath}`);

      
      console.log(`\n  Testando...`);
      try {
        const helpOut = execSync(`"${outPath}" help`, { cwd: ROOT, encoding: "utf-8", timeout: 5000 });
        if (helpOut.includes("XanaScript")) {
          console.log(`  ✓ Binário funcional!`);
        }
      } catch (e) {
        console.log(`  ⚠ Teste: ${e.message}`);
      }
    } catch (e) {
      console.error(`  ✗ bun build: ${e.message}`);
    }
  }

  
  
  

  if (hasPkg) {
    console.log("\n📦 Pkg detectado. Gerando binários multiplataforma...\n");

    const targets = [
      { target: "node18-win-x64", ext: ".exe", platform: "Windows x64" },
      { target: "node18-linux-x64", ext: "", platform: "Linux x64" },
      { target: "node18-macos-x64", ext: "", platform: "macOS x64" },
      { target: "node18-macos-arm64", ext: "", platform: "macOS ARM64" },
    ];

    for (const t of targets) {
      const outName = `xs-${t.platform.toLowerCase().replace(/\s+/g, "-")}${t.ext}`;
      console.log(`  → ${t.platform}...`);
      try {
        execSync(
          `npx pkg "${entryFile}" --targets ${t.target} --output "${join(distDir, outName)}"`,
          { stdio: "inherit", cwd: ROOT, timeout: 120000 }
        );
        console.log(`  ✓ ${outName}`);
      } catch (e) {
        console.error(`  ✗ ${t.platform}: ${e.message}`);
      }
    }
  }

  
  
  

  try { execSync(`rm -f "${entryFile}"`, { stdio: "ignore" }); } catch {}
  try { execSync(`del "${entryFile}"`, { stdio: "ignore" }); } catch {}
  try { execSync(`del "${entryFile.replace("/", "\\")}"`, { stdio: "ignore" }); } catch {}
  
  try { require("fs").unlinkSync(entryFile); } catch {}

  console.log("\n✅ Build concluído!");
  console.log(`  Binários em: ${distDir}`);
  console.log("");
  console.log("  Uso:");
  console.log(`  ${join(distDir, "xs")} help`);
  console.log(`  ${join(distDir, "xs")} run app.xs`);
  console.log(`  ${join(distDir, "xs")} build --wasm app.xs`);
  console.log(`  ${join(distDir, "xs")} lsp`);
  console.log("");
  console.log("  VS Code: instale vscode-xs/ como extensão local");
}

async function commandExists(cmd) {
  try {
    execSync(cmd + " --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

main().catch(console.error);
