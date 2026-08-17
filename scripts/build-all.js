import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_VERSION = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf-8")
).version;
const ROOT = join(__dirname, "..");

async function main() {
  console.log("╔══════════════════════════════════════╗");
  console.log(`║    XanaScript v${PKG_VERSION.padEnd(5)} Native Build    ║`);
  console.log("╚══════════════════════════════════════╝");

  const distDir = join(ROOT, "dist");
  if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });

  const hasBun = await commandExists("bun");
  const hasPkg = await commandExists("pkg");

  if (!hasBun && !hasPkg) {
    console.log("  Requires bun or pkg:");
    console.log("  npm install -g bun");
    console.log("  npm install -g pkg");
    process.exit(1);
  }

  const entryContent = `import "./src/cli.js";\n`;
  const entryFile = join(ROOT, "_xs_entry.mjs");
  writeFileSync(entryFile, entryContent, "utf-8");

  if (hasBun) {
    console.log("\nBun detected. Generating native binary...\n");

    const plat = process.platform;
    const arch = process.arch;
    const outName = `xs${plat === "win32" ? ".exe" : ""}`;
    const outPath = join(distDir, outName);

    try {
      execSync(
        `bun build "${entryFile}" --compile --target=bun-${plat}-${arch} --outfile "${outPath}"`,
        { stdio: "inherit", cwd: ROOT, timeout: 120000 }
      );
      console.log(`  OK ${outName} (${plat} ${arch})`);
      console.log(`  ${outPath}`);

      console.log(`\n  Testing...`);
      try {
        const helpOut = execSync(`"${outPath}" help`, {
          cwd: ROOT,
          encoding: "utf-8",
          timeout: 5000,
        });
        if (helpOut.includes("XanaScript")) {
          console.log(`  OK binary works!`);
        }
      } catch (e) {
        console.log(`  Test: ${e.message}`);
      }
    } catch (e) {
      console.error(`  ERROR bun build: ${e.message}`);
    }
  }

  if (hasPkg) {
    console.log("\nPkg detected. Generating cross-platform binaries...\n");

    const targets = [
      { target: "node18-win-x64", ext: ".exe", platform: "Windows x64" },
      { target: "node18-linux-x64", ext: "", platform: "Linux x64" },
      { target: "node18-macos-x64", ext: "", platform: "macOS x64" },
      { target: "node18-macos-arm64", ext: "", platform: "macOS ARM64" },
    ];

    for (const t of targets) {
      const outName = `xs-${t.platform.toLowerCase().replace(/\s+/g, "-")}${t.ext}`;
      console.log(`  -> ${t.platform}...`);
      try {
        execSync(
          `npx pkg "${entryFile}" --targets ${t.target} --output "${join(distDir, outName)}"`,
          { stdio: "inherit", cwd: ROOT, timeout: 120000 }
        );
        console.log(`  OK ${outName}`);
      } catch (e) {
        console.error(`  ERROR ${t.platform}: ${e.message}`);
      }
    }
  }

  try {
    execSync(`rm -f "${entryFile}"`, { stdio: "ignore" });
  } catch {}
  try {
    execSync(`del "${entryFile}"`, { stdio: "ignore" });
  } catch {}
  try {
    execSync(`del "${entryFile.replace("/", "\\")}"`, { stdio: "ignore" });
  } catch {}
  try {
    unlinkSync(entryFile);
  } catch {}

  console.log("\nBuild complete!");
  console.log(`  Binaries in: ${distDir}`);
  console.log("");
  console.log("  Usage:");
  console.log(`  ${join(distDir, "xs")} help`);
  console.log(`  ${join(distDir, "xs")} run app.xs`);
  console.log(`  ${join(distDir, "xs")} build --wasm app.xs`);
  console.log(`  ${join(distDir, "xs")} lsp`);
  console.log("");
  console.log("  VS Code: https://github.com/xanascr/xs-vscode");
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
