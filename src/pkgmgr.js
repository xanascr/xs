import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const XS_PACKAGE_REGISTRY = "https://api.xanascript.dev/packages";
const XS_CACHE_DIR = path.join(process.env.HOME || process.env.USERPROFILE || ".xs", ".xs", "packages");
const XS_PACKAGE_FILE = "xspack.json";

export async function initProject(dir) {
  dir = dir || ".";
  const target = path.resolve(dir);
  if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });

  const pkgFile = path.join(target, XS_PACKAGE_FILE);
  if (fs.existsSync(pkgFile)) {
    console.log(" xspack.json já existe");
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
    fs.writeFileSync(indexFile, `PARTIU()
SOLTA O GRITO("Olá do pacote ${pkg.name}!")
ACABOU()
`);
  }

  const gitignore = path.join(target, ".gitignore");
  if (!fs.existsSync(gitignore)) {
    fs.writeFileSync(gitignore, "node_modules/\n.xs-cache/\n");
  }

  console.log(` Projeto XanaScript criado em ${target}`);
  console.log(`  ${XS_PACKAGE_FILE}`);
  console.log(`  src/index.xs`);
  console.log("");
  console.log("  Para instalar dependências:");
  console.log("    xs install");
  console.log("  Para publicar:");
  console.log("    xs publish");
}

export async function installPackages(packages) {
  if (!fs.existsSync(XS_CACHE_DIR)) {
    fs.mkdirSync(XS_CACHE_DIR, { recursive: true });
  }

  if (packages.length === 0) {

    const pkgFile = findPackageFile();
    if (!pkgFile) {
      console.log(" Nenhum xspack.json encontrado");
      return;
    }
    const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf-8"));
    packages = Object.keys(pkg.dependencies || {});
    if (packages.length === 0) {
      console.log(" Nenhuma dependência para instalar");
      return;
    }
  }

  for (const pkgName of packages) {
    const [name, version] = pkgName.includes("@")
      ? pkgName.split("@")
      : [pkgName, "latest"];

    console.log(` Instalando ${name}...`);

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

  const searchUrl = `https://api.github.com/search/repositories?q=${name}+language:xs`;

  try {
    const res = await fetch(searchUrl, {
      headers: { "Accept": "application/vnd.github.v3+json" }
    });

    if (!res.ok) throw new Error(`GitHub API: ${res.status}`);

    const data = await res.json();
    const repo = data.items?.find(r =>
      r.name.toLowerCase() === name.toLowerCase() ||
      r.full_name.toLowerCase() === name.toLowerCase()
    );

    if (!repo) {

      return installFromNpm(name, version);
    }

    const distDir = path.join(XS_CACHE_DIR, name);
    if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

    const pkgUrl = `https://raw.githubusercontent.com/${repo.full_name}/main/xspack.json`;
    const pkgRes = await fetch(pkgUrl);

    if (pkgRes.ok) {
      const pkgData = await pkgRes.json();
      fs.writeFileSync(path.join(distDir, XS_PACKAGE_FILE), JSON.stringify(pkgData, null, 2));
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

    if (!res.ok) throw new Error(`Pacote ${name} não encontrado`);

    const data = await res.json();
    const ver = version === "latest" ? data["dist-tags"]?.latest : version;
    const pkgVersion = data.versions?.[ver];

    if (!pkgVersion) throw new Error(`Versão ${ver} não encontrada`);

    const distDir = path.join(XS_CACHE_DIR, name);
    if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

    fs.writeFileSync(path.join(distDir, XS_PACKAGE_FILE), JSON.stringify({
      name, version: ver,
      description: pkgVersion.description || "",
      main: "src/index.xs",
    }, null, 2));

    if (pkgVersion.dist?.tarball) {
      const tarballRes = await fetch(pkgVersion.dist.tarball);

      console.log(`   npm package: ${pkgVersion.dist.tarball}`);
    }

    return true;
  } catch (e) {
    throw new Error(`Pacote não encontrado em nenhum registro: ${name}`);
  }
}

export async function publishPackage() {
  const pkgFile = findPackageFile();
  if (!pkgFile) {
    console.log(" xspack.json não encontrado");
    console.log("  Crie um com: xs init");
    return;
  }

  const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf-8"));
  console.log(` Publicando ${pkg.name} v${pkg.version}...`);
  console.log("");
  console.log("  Para publicar seu pacote XanaScript:");
  console.log("  1. Crie um repositório no GitHub");
  console.log("  2. Adicione o tópico 'xanascript-package'");
  console.log("  3. Commit seu código na branch main");
  console.log("");
  console.log("  Estrutura esperada:");
  console.log("    xspack.json");
  console.log("    src/index.xs      ← entry point");
  console.log("    README.xs.md      ← documentação");
  console.log("");
  console.log("  Exemplo de xspack.json:");
  console.log("    {");
  console.log(`      "name": "${pkg.name}",`);
  console.log(`      "version": "${pkg.version}",`);
  console.log('      "description": "...",');
  console.log('      "main": "src/index.xs",');
  console.log('      "dependencies": {}');
  console.log("    }");
  console.log("");
  console.log("  Após publicar no GitHub, outros devs podem instalar com:");
  console.log(`    xs install ${pkg.name}`);
}

export async function searchPackages(query) {
  console.log(` Buscando pacotes XanaScript...`);

  try {
  const searchUrl = `https://api.github.com/search/repositories?q=${name}+language:xs`;

    const res = await fetch(searchUrl, {
      headers: { "Accept": "application/vnd.github.v3+json" }
    });

    if (!res.ok) throw new Error(`GitHub API: ${res.status}`);

    const data = await res.json();

    if (data.items?.length > 0) {
      console.log(`\n  ${data.items.length} pacote(s) encontrado(s):\n`);
      for (const repo of data.items.slice(0, 20)) {
        console.log(`   ${repo.full_name}`);
        console.log(`      ⭐ ${repo.stargazers_count}  |  ${repo.description || "Sem descrição"}`);
        console.log(`      ${repo.html_url}`);
        console.log("");
      }
    } else {
      console.log("  Nenhum pacote encontrado.");
      console.log("  Dica: crie um repositório GitHub e adicione");
      console.log("  o tópico 'xanascript-package'");
    }
  } catch (e) {
    console.error(`   Erro na busca: ${e.message}`);
  }
}

function findPackageFile() {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    const pkgFile = path.join(dir, XS_PACKAGE_FILE);
    if (fs.existsSync(pkgFile)) return pkgFile;
    dir = path.dirname(dir);
  }
  return null;
}

export function getInstalledPackages() {
  if (!fs.existsSync(XS_CACHE_DIR)) return [];
  return fs.readdirSync(XS_CACHE_DIR).filter(d => {
    const pkgFile = path.join(XS_CACHE_DIR, d, XS_PACKAGE_FILE);
    return fs.existsSync(pkgFile);
  });
}
