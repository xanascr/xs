import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { createInterface } from "readline";
import { createGzip } from "zlib";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

const XS_REGISTRY = process.env.XS_REGISTRY || "https://xanascript.xyz";
const XS_CACHE_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || ".",
  ".xs",
  "packages"
);
const XS_CONFIG_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || ".",
  ".xs"
);
const XS_PACKAGE_FILE = "xspack.json";
const XS_TOKEN_FILE = path.join(XS_CONFIG_DIR, "token.json");

function getToken() {
  try {
    if (fs.existsSync(XS_TOKEN_FILE)) {
      return JSON.parse(fs.readFileSync(XS_TOKEN_FILE, "utf-8"));
    }
  } catch {}
  return null;
}

function saveToken(token, user) {
  if (!fs.existsSync(XS_CONFIG_DIR))
    fs.mkdirSync(XS_CONFIG_DIR, { recursive: true });
  fs.writeFileSync(
    XS_TOKEN_FILE,
    JSON.stringify({ token, user, savedAt: new Date().toISOString() }, null, 2)
  );
}

function clearToken() {
  try {
    if (fs.existsSync(XS_TOKEN_FILE)) fs.unlinkSync(XS_TOKEN_FILE);
  } catch {}
}

async function registryFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token.token}`;
  const res = await fetch(url, { ...options, headers });
  return res;
}

async function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a); }));
}

// ── xs login ────────────────────────────────────────────────────────────

export async function loginUser() {
  const existing = getToken();
  if (existing) {
    console.log(` Already logged in as ${existing.user?.username || "unknown"}`);
    const ans = await prompt(" Logout first? (y/N): ");
    if (ans.toLowerCase() === "y") clearToken();
    else return;
  }

  const username = await prompt(" Username or email: ");
  const password = await prompt(" Password: ");

  try {
    const res = await fetch(`${XS_REGISTRY}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error(` Login failed: ${data.error}`);
      return;
    }
    saveToken(data.token, data.user);
    console.log(` Logged in as ${data.user.username}`);
  } catch (e) {
    console.error(` Connection failed: ${e.message}`);
  }
}

// ── xs whoami ───────────────────────────────────────────────────────────

export function whoami() {
  const token = getToken();
  if (!token || !token.user) {
    console.log(" Not logged in");
    return;
  }
  console.log(` Username: ${token.user.username}`);
  console.log(` Role: ${token.user.role}`);
  if (token.savedAt) console.log(` Token saved: ${token.savedAt}`);
}

// ── xs logout ───────────────────────────────────────────────────────────

export function logoutUser() {
  clearToken();
  console.log(" Logged out");
}

// ── xs init ─────────────────────────────────────────────────────────────

export async function initProject(dir) {
  dir = dir || ".";
  const target = path.resolve(dir);
  if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });

  const pkgFile = path.join(target, XS_PACKAGE_FILE);
  if (fs.existsSync(pkgFile)) {
    console.log(" xspack.json already exists");
    return;
  }

  const name = path.basename(target);
  const pkg = {
    name: name.toLowerCase().replace(/\s+/g, "-"),
    version: "1.0.0",
    description: "",
    main: "src/index.xs",
    dependencies: {},
    xs_version: ">=2.0.0",
  };

  fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + "\n");

  const srcDir = path.join(target, "src");
  if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });

  const indexFile = path.join(srcDir, "index.xs");
  if (!fs.existsSync(indexFile)) {
    fs.writeFileSync(
      indexFile,
      `PARTIU()\nSOLTA O GRITO("Hello from ${pkg.name}!")\nACABOU()\n`
    );
  }

  const gitignore = path.join(target, ".gitignore");
  if (!fs.existsSync(gitignore)) {
    fs.writeFileSync(gitignore, "node_modules/\n.xs-cache/\n");
  }

  console.log(` XanaScript project created at ${target}`);
  console.log(`  ${XS_PACKAGE_FILE}`);
  console.log(`  src/index.xs`);
}

// ── xs publish ──────────────────────────────────────────────────────────

export async function publishPackage() {
  const pkgFile = findPackageFile();
  if (!pkgFile) {
    console.error(" xspack.json not found. Create one with: xs init");
    return;
  }

  const token = getToken();
  if (!token) {
    console.error(" You must be logged in to publish. Run: xs login");
    return;
  }

  const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf-8"));
  console.log(` Publishing ${pkg.name} v${pkg.version}...`);

  // Read README if exists
  let readme = "";
  const readmeFile = findReadme(path.dirname(pkgFile));
  if (readmeFile) readme = fs.readFileSync(readmeFile, "utf-8");

  // Collect source files into a tarball
  const srcDir = path.join(path.dirname(pkgFile), "src");
  const files = [];
  if (fs.existsSync(srcDir)) {
    collectFiles(srcDir, srcDir, files);
  }

  // Create a simple tar.gz
  const tarBuffer = await createTarball(path.dirname(pkgFile), files);

  // Read xspack.json as string for metadata
  const pkgJson = JSON.parse(fs.readFileSync(pkgFile, "utf-8"));

  const formData = new FormData();
  formData.append("name", pkg.name);
  formData.append("version", pkg.version);
  formData.append("description", pkg.description || "");
  formData.append("license", pkg.license || "MIT");
  formData.append("repository", pkg.repository || "");
  formData.append("keywords", JSON.stringify(pkgJson.keywords || []));
  formData.append("readme", readme);
  formData.append("file", new Blob([tarBuffer], { type: "application/gzip" }), `${pkg.name}-${pkg.version}.tar.gz`);

  try {
    const res = await registryFetch(`${XS_REGISTRY}/api/packages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token.token}` },
      body: formData,
    });
    const data = await res.json();
    if (data.ok) {
      console.log(` Package submitted for review!`);
      console.log(` ${data.message}`);
      console.log(` You can check the status at:`);
      console.log(` ${XS_REGISTRY}/packages/dashboard`);
    } else {
      console.error(` Publish failed: ${data.error}`);
    }
  } catch (e) {
    console.error(` Connection failed: ${e.message}`);
  }
}

// ── xs install ──────────────────────────────────────────────────────────

export async function installPackages(packages) {
  if (!fs.existsSync(XS_CACHE_DIR))
    fs.mkdirSync(XS_CACHE_DIR, { recursive: true });

  if (packages.length === 0) {
    const pkgFile = findPackageFile();
    if (!pkgFile) {
      console.log(" No xspack.json found. Run: xs init");
      return;
    }
    const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf-8"));
    packages = Object.keys(pkg.dependencies || {});
    if (packages.length === 0) {
      console.log(" No dependencies to install");
      return;
    }
  }

  for (const pkgName of packages) {
    const [name, version] = pkgName.includes("@")
      ? pkgName.split("@")
      : [pkgName, "latest"];

    console.log(` Installing ${name}...`);

    try {
      const installed = await installFromRegistry(name, version);
      if (installed) {
        const pkgFile = findPackageFile();
        if (pkgFile) {
          const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf-8"));
          if (!pkg.dependencies) pkg.dependencies = {};
          pkg.dependencies[name] = version;
          fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + "\n");
        }
        console.log(`   ${name}@${version}`);
      }
    } catch (e) {
      console.error(`   ${name}: ${e.message}`);
    }
  }
}

async function installFromRegistry(name, version) {
  const distDir = path.join(XS_CACHE_DIR, name);
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

  // Try the XanaScript registry first (only approved packages)
  try {
    const infoRes = await fetch(`${XS_REGISTRY}/api/packages/${name}`);
    if (infoRes.ok) {
      const info = await infoRes.json();
      if (info.ok && info.package && info.package.status === "approved") {
        const dlRes = await fetch(
          `${XS_REGISTRY}/api/packages/${name}/download`,
          { method: "POST" }
        );
        if (dlRes.ok && dlRes.headers.get("Content-Type")?.includes("gzip")) {
          const buffer = Buffer.from(await dlRes.arrayBuffer());
          // Extract the tarball
          await extractTarball(buffer, distDir);
          return true;
        }
        // Save metadata even without file
        const pkgMeta = info.package;
        fs.writeFileSync(
          path.join(distDir, XS_PACKAGE_FILE),
          JSON.stringify(
            {
              name: pkgMeta.name,
              version: pkgMeta.version,
              description: pkgMeta.description,
              license: pkgMeta.license,
              main: "src/index.xs",
            },
            null,
            2
          )
        );
        return true;
      }
    }
  } catch {}

  // Fallback: GitHub search
  return installFromGitHub(name, version, distDir);
}

async function installFromGitHub(name, version, distDir) {
  const searchUrl = `https://api.github.com/search/repositories?q=${name}+language:xs`;
  try {
    const res = await fetch(searchUrl, {
      headers: { Accept: "application/vnd.github.v3+json" },
    });
    if (!res.ok) throw new Error(`GitHub API: ${res.status}`);

    const data = await res.json();
    const repo = data.items?.find(
      (r) =>
        r.name.toLowerCase() === name.toLowerCase() ||
        r.full_name.toLowerCase() === name.toLowerCase()
    );
    if (!repo) return installFromNpm(name, version);

    const pkgUrl = `https://raw.githubusercontent.com/${repo.full_name}/main/xspack.json`;
    const pkgRes = await fetch(pkgUrl);
    if (pkgRes.ok) {
      const pkgData = await pkgRes.json();
      fs.writeFileSync(
        path.join(distDir, XS_PACKAGE_FILE),
        JSON.stringify(pkgData, null, 2)
      );
    }

    const srcUrl = `https://raw.githubusercontent.com/${repo.full_name}/main/src/index.xs`;
    const srcRes = await fetch(srcUrl);
    if (srcRes.ok) {
      const code = await srcRes.text();
      const srcDir = path.join(distDir, "src");
      if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, "index.xs"), code);
    }

    return true;
  } catch (e) {
    return installFromNpm(name, version);
  }
}

async function installFromNpm(name, version) {
  try {
    const npmUrl = `https://registry.npmjs.org/xanascript-${name}/latest`;
    const res = await fetch(npmUrl);
    if (!res.ok) throw new Error(`Package ${name} not found`);

    const data = await res.json();
    const ver = version === "latest" ? data["dist-tags"]?.latest : version;
    const pkgVersion = data.versions?.[ver];
    if (!pkgVersion) throw new Error(`Version ${ver} not found`);

    const distDir = path.join(XS_CACHE_DIR, name);
    if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

    fs.writeFileSync(
      path.join(distDir, XS_PACKAGE_FILE),
      JSON.stringify(
        {
          name,
          version: ver,
          description: pkgVersion.description || "",
          main: "src/index.xs",
        },
        null,
        2
      )
    );

    return true;
  } catch (e) {
    throw new Error(`Package not found in any registry: ${name}`);
  }
}

// ── xs search ───────────────────────────────────────────────────────────

export async function searchPackages(query) {
  console.log(` Searching for "${query}"...`);

  try {
    const res = await fetch(
      `${XS_REGISTRY}/api/packages?q=${encodeURIComponent(query)}`
    );
    const data = await res.json();
    if (data.ok && data.packages?.length > 0) {
      console.log(`\n ${data.packages.length} package(s) found:\n`);
      for (const pkg of data.packages.slice(0, 20)) {
        console.log(`   ${pkg.name}@${pkg.version}`);
        console.log(`      ${pkg.description || "No description"}`);
        console.log(`      ${pkg.downloads || 0} downloads`);
        console.log("");
      }
    } else {
      console.log(" No packages found.");
    }
  } catch (e) {
    console.error(` Search failed: ${e.message}`);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function findPackageFile() {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    const pkgFile = path.join(dir, XS_PACKAGE_FILE);
    if (fs.existsSync(pkgFile)) return pkgFile;
    dir = path.dirname(dir);
  }
  return null;
}

function findReadme(dir) {
  for (const name of ["README.xs.md", "README.md", "README.md.xs"]) {
    const f = path.join(dir, name);
    if (fs.existsSync(f)) return f;
  }
  return null;
}

function collectFiles(baseDir, dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(baseDir, full);
    if (entry.isDirectory()) {
      collectFiles(baseDir, full, files);
    } else {
      files.push({ path: rel, content: fs.readFileSync(full) });
    }
  }
}

async function createTarball(baseDir, files) {
  // Simple tar format without compression (we'll gzip the result)
  const chunks = [];
  for (const file of files) {
    const name = file.path;
    const content = file.content;
    const nameBuf = Buffer.from(name);
    const size = content.length;

    // Tar header (512 bytes)
    const header = Buffer.alloc(512);
    header.write(name, 0, 100, "utf-8"); // name (100 bytes)
    header.write("000644 ", 100, 7, "utf-8"); // mode
    header.write("0000000 ", 108, 8, "utf-8"); // uid
    header.write("0000000 ", 116, 8, "utf-8"); // gid
    const sizeStr = size.toString(8).padStart(11, "0");
    header.write(sizeStr, 124, 11, "utf-8"); // size
    const mtime = Math.floor(Date.now() / 1000)
      .toString(8)
      .padStart(11, "0");
    header.write(mtime, 136, 11, "utf-8"); // mtime

    // Checksum
    let checksum = 0;
    for (let i = 0; i < 512; i++) checksum += header[i];
    const checksumStr = checksum.toString(8).padStart(6, "0");
    header.write(checksumStr, 148, 6, "utf-8");
    header[155] = 0x20; // space after checksum

    chunks.push(header);
    chunks.push(content);

    // Pad to 512 bytes
    const pad = (512 - (size % 512)) % 512;
    if (pad > 0) chunks.push(Buffer.alloc(pad));
  }

  // Two zero-filled 512-byte blocks mark end of tar
  chunks.push(Buffer.alloc(1024));

  const tarBuffer = Buffer.concat(chunks);
  const gzipped = await new Promise((resolve, reject) => {
    const gzip = createGzip();
    const bufs = [];
    gzip.on("data", (c) => bufs.push(c));
    gzip.on("end", () => resolve(Buffer.concat(bufs)));
    gzip.on("error", reject);
    gzip.end(tarBuffer);
  });

  return gzipped;
}

async function extractTarball(buffer, destDir) {
  // For simplicity, save the tarball and extract metadata
  // In production, you'd use a proper tar extraction library
  const tgzPath = path.join(destDir, "package.tar.gz");
  fs.writeFileSync(tgzPath, buffer);
  console.log(`   Saved to ${tgzPath}`);

  // Try to extract with system tar if available
  try {
    execSync(`tar -xzf "${tgzPath}" -C "${destDir}"`, { stdio: "ignore" });
  } catch {
    // tar not available, just keep the archive
  }
}

export function getInstalledPackages() {
  if (!fs.existsSync(XS_CACHE_DIR)) return [];
  return fs
    .readdirSync(XS_CACHE_DIR)
    .filter((d) => {
      const pkgFile = path.join(XS_CACHE_DIR, d, XS_PACKAGE_FILE);
      return fs.existsSync(pkgFile);
    });
}
