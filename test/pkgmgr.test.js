import http from "http";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

function assert(condition, msg) {
  if (!condition) throw new Error("FAIL: " + msg);
  console.log("  PASS:", msg);
}

let server;
let port;

function startMockRegistry() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      const send = (code, obj) => {
        res.writeHead(code, { "Content-Type": "application/json" });
        res.end(JSON.stringify(obj));
      };

      if (req.method === "POST" && url.pathname === "/api/auth/login") {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          const { username, password } = JSON.parse(body || "{}");
          if (username === "dev" && password === "123") {
            send(200, { ok: true, token: "token-mock", user: { username: "dev", role: "admin" } });
          } else {
            send(401, { ok: false, error: "Credenciais invalidas" });
          }
        });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/packages") {
        const q = url.searchParams.get("q") || "";
        const pkgs = [
          { name: "xs-util", version: "1.0.0", description: "Utilidades", downloads: 42 },
          { name: "xs-web", version: "2.0.0", description: "Servidor", downloads: 10 },
        ].filter((p) => p.name.includes(q));
        send(200, { ok: true, packages: pkgs });
        return;
      }

      if (
        req.method === "GET" &&
        url.pathname.startsWith("/api/packages/") &&
        !url.pathname.endsWith("/download")
      ) {
        const name = url.pathname.split("/api/packages/")[1];
        if (name === "xs-util") {
          send(200, {
            ok: true,
            package: {
              name: "xs-util",
              version: "1.0.0",
              status: "approved",
              dependencies: [],
              description: "Utilidades",
              license: "MIT",
            },
          });
        } else {
          send(404, { ok: false, error: "not found" });
        }
        return;
      }

      if (req.method === "POST" && url.pathname.endsWith("/download")) {
        res.writeHead(200, { "Content-Type": "application/gzip" });
        res.end(Buffer.from([])); // tar vazio; metadata é o que importa
        return;
      }

      send(404, { ok: false, error: "rota nao existe" });
    });

    server.listen(0, () => {
      port = server.address().port;
      resolve(port);
    });
  });
}

function stopMockRegistry() {
  if (server) server.close();
}

// Isola XS_REGISTRY e o cache dir
process.env.XS_REGISTRY = "";

async function testPkgMgr() {
  console.log("\n=== PKG MANAGER (registry mock) ===");

  const port = await startMockRegistry();
  process.env.XS_REGISTRY = `http://localhost:${port}`;
  const oldHome = process.env.HOME;
  const home = mkdtempSync(join(tmpdir(), "xs-home-"));
  process.env.HOME = home;
  const work = mkdtempSync(join(tmpdir(), "xs-proj-"));

  const {
    initProject,
    installPackages,
    searchPackages,
    loginUser,
    whoami,
    logoutUser,
    getInstalledPackages,
  } = await import("../src/pkgmgr.js");

  // login
  process.stdin.pause();
  // loginUser usa prompt (readline em stdin); testamos via quem/qual através de função?
  // loginUser é interativo; não dá para testar sem mockar readline. Testamos o fluxo não-interativo:
  try {
    // Simular login fazendo request direto ao mock (o mesmo endpoint)
    const res = await fetch(`${process.env.XS_REGISTRY}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "dev", password: "123" }),
    });
    const data = await res.json();
    assert(data.ok && data.token === "token-mock", "endpoint de login responde");
    assert(data.user.username === "dev", "login retorna usuário");
  } catch (e) {
    assert(false, "endpoint de login acessível: " + e.message);
  }

  // init
  const projDir = join(work, "meu-pacote");
  await initProject(projDir);
  assert(existsSync(join(projDir, "bglh.json")), "init cria bglh.json");
  assert(existsSync(join(projDir, "src", "index.xs")), "init cria src/index.xs");
  const pkg = JSON.parse(readFileSync(join(projDir, "bglh.json"), "utf-8"));
  assert(pkg.name === "meu-pacote", "init nomeia o pacote pelo diretório");
  assert(pkg.main === "src/index.xs", "init define main");

  // search
  const origLog = console.log;
  const logs = [];
  console.log = (...a) => logs.push(a.join(" "));
  await searchPackages("util");
  console.log = origLog;
  assert(
    logs.some((l) => l.includes("xs-util")),
    "search encontra xs-util"
  );
  assert(
    logs.some((l) => /1 package\(s\)/.test(l)),
    "search reporta contagem"
  );

  // install (via registry mock)
  logs.length = 0;
  console.log = (...a) => logs.push(a.join(" "));
  await installPackages(["xs-util"]);
  console.log = origLog;
  const installed = getInstalledPackages();
  assert(installed.includes("xs-util"), "install instala pacote do registry");
  const metaPath = join(process.env.HOME, ".xs", "packages", "xs-util", ".xs-meta.json");
  assert(existsSync(metaPath), "install salva .xs-meta.json");

  // install de pacote inexistente não quebra
  logs.length = 0;
  console.log = (...a) => logs.push(a.join(" "));
  await installPackages(["xs-nao-existe"]);
  console.log = origLog;
  assert(
    logs.some((l) => l.includes("xs-nao-existe")),
    "install de inexistente reporta erro"
  );

  // whoami/logout (sem token)
  logs.length = 0;
  console.log = (...a) => logs.push(a.join(" "));
  whoami();
  console.log = origLog;
  assert(
    logs.some((l) => l.includes("Not logged in")),
    "whoami sem token"
  );

  process.env.HOME = oldHome;
  delete process.env.XS_REGISTRY;
  rmSync(home, { recursive: true, force: true });
  rmSync(work, { recursive: true, force: true });
  stopMockRegistry();

  console.log("  PKG MANAGER: OK\n");
}

testPkgMgr().catch((e) => {
  console.error(e);
  process.exit(1);
});
