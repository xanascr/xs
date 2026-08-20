import fs from "fs";
import path from "path";
import http from "http";
import os from "os";
import crypto from "crypto";
import { createRequire } from "module";
import { fileURLToPath } from "url";

import { lex } from "./lexer.js";
import { parse } from "./parser.js";
import { optimize } from "./optimizer.js";
import { interpret } from "./interpreter.js";
import { setSource, XSError, CATEGORY, buildCode } from "./errors.js";
import { AssertionError } from "./interpreter.js";

const require = createRequire(import.meta.url);
const CACHE = new Map();
const LOADING = new Set();

export async function runXS(code, baseDir = process.cwd(), fileName = "input.xs") {
  setSource(code, fileName);

  const tokens = lex(code, fileName);

  let ast = parse(tokens);
  ast = optimize(ast);

  const env = createEnv(baseDir);
  return interpret(ast, env);
}

export function createEnv(baseDir) {
  const servers = new Set();

  const builtins = {
    "grita-ae": (...a) => console.log(...a),
    sussurra: (...a) => console.warn(...a),

    horinha: () => Date.now(),
    date: (a, b) => {
      if (a != b)
        throw new AssertionError(`date failed: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
    },
    "traduz-ai": String,
    embrulha: (v, espaco) => JSON.stringify(v, null, espaco),
    "data-agora": () => new Date().toISOString(),
    "data-de-ms": (ms) => new Date(ms).toISOString(),
    hash: (s) => {
      const { createHash } = require("crypto");
      return createHash("sha256").update(String(s)).digest("hex");
    },

    tamanho: (v) => (v == null ? 0 : v.length),
    "divide-texto": (s, sep) => String(s).split(sep),
    juntar: (arr, sep) => arr.join(sep),
    "decodifica-url": (s) => decodeURIComponent(String(s)),
    encontra: (s, sub) => String(s).match(new RegExp(sub)),
    url: (s) => encodeURIComponent(String(s)),

    stalkeia: async (url) => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
        return await res.json();
      } catch (e) {
        throw new XSError(`Failed in stalkeia("${url}"): ${e.message}`, {
          hint: "Check that the URL is correct and reachable",
          help: "Make sure the URL starts with http:// or https://",
          code: buildCode(CATEGORY.NET, 1),
        });
      }
    },

    "aguenta-ai": (ms) => new Promise((r) => setTimeout(r, ms)),
    escolhe: (a, b) => Math.floor(Math.random() * (b - a + 1)) + a,
    desembola: JSON.parse,
    bisbilhota: (key) => process.env[key] ?? null,

    escuta: (port, handler) => {
      const server = http.createServer(async (req, res) => {
        const response = {
          enviar: (data, type) => {
            if (type) res.setHeader("Content-Type", type);
            res.end(String(data));
          },
          json: (data) => {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(data));
          },
          status: (code) => {
            res.statusCode = code;
            return response;
          },
          cabecalho: (key, value) => {
            res.setHeader(key, value);
            return response;
          },
        };

        const request = {
          url: req.url,
          metodo: req.method,
          cabecalhos: req.headers,
          corpo: await new Promise((resolve) => {
            let body = "";
            req.on("data", (c) => (body += c));
            req.on("end", () => resolve(body));
          }),
        };

        try {
          await handler(request, response);
        } catch (e) {
          res.statusCode = 500;
          res.end("Internal error: " + e.message);
        }
      });

      server.listen(port, () => {
        console.log(` Server running on http://localhost:${port}`);
      });

      server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          console.error(` Port ${port} is already in use`);
        } else {
          console.error(` Server error: ${err.message}`);
        }
      });

      servers.add(server);
      return server;
    },

    "terminamos!": (server) => {
      server.close();
      servers.delete(server);
      console.log(" Server stopped");
    },

    __IMPORT__: async (mod) => {
      let full;

      if (mod.startsWith(".") || mod.startsWith("/")) {
        full = path.resolve(baseDir, mod);
      } else {
        const stdPath = path.resolve(
          path.dirname(fileURLToPath(import.meta.url)),
          "..",
          "std",
          `${mod}.xs`
        );
        if (fs.existsSync(stdPath)) {
          full = stdPath;
        } else {
          const xsPkgDir = path.join(baseDir, "node_modules", mod);
          const xsPkgFile = path.join(xsPkgDir, "bglh.json");
          const xsCacheDir = path.join(
            process.env.HOME || process.env.USERPROFILE || ".",
            ".xs",
            "packages",
            mod
          );
          const xsCacheFile = path.join(xsCacheDir, "bglh.json");

          const xsPkgRoot = fs.existsSync(xsPkgFile) ? xsPkgDir : fs.existsSync(xsCacheFile) ? xsCacheDir : null;

          if (xsPkgRoot) {
            const pkgMeta = JSON.parse(fs.readFileSync(path.join(xsPkgRoot, "bglh.json"), "utf-8"));
            full = path.resolve(xsPkgRoot, pkgMeta.main || "src/index.xs");
            if (!fs.existsSync(full)) full = path.resolve(xsPkgRoot, "src/index.xs");
          } else {
            try {
              let localPath = path.join(baseDir, "node_modules", mod);
              if (fs.existsSync(localPath)) {
                return await importNodeModule(localPath);
              }

              let currentDir = baseDir;
              while (currentDir !== path.parse(currentDir).root) {
                const nodeModulesPath = path.join(currentDir, "node_modules", mod);
                if (fs.existsSync(nodeModulesPath)) {
                  return await importNodeModule(nodeModulesPath);
                }
                currentDir = path.dirname(currentDir);
              }

              return await importNodeModule(mod);
            } catch (e) {
              throw new XSError(`Failed to import module "${mod}": ${e.message}`, {
                hint: "Check that the package is installed (npm install) or that the path is correct",
                help: `Run \`npm install ${mod}\` or check the module path`,
                code: buildCode(CATEGORY.IMPT, 2),
              });
            }
          }
        }
      }

      if (CACHE.has(full)) {
        return CACHE.get(full);
      }
      if (LOADING.has(full)) {
        throw new XSError(`Circular import detected: ${mod}`, {
          hint: "Two files import each other mutually",
          help: "Break the cycle by extracting shared code into a third module",
          code: buildCode(CATEGORY.IMPT, 1),
        });
      }
      LOADING.add(full);
      try {
        const code = fs.readFileSync(full, "utf-8");
        const exports = {};
        const env2 = createEnv(path.dirname(full));
        env2["manda-ai"] = (name, value) => {
          exports[name] = value;
        };
        await runModule(code, env2);
        CACHE.set(full, exports);
        return exports;
      } finally {
        LOADING.delete(full);
      }
    },
  };
  builtins.__dir = baseDir;

  const jsGlobals = {
    Object,
    Array,
    JSON,
    Math,
    Number,
    String,
    Boolean,
    Date,
    Buffer,
    Uint8Array,
    Int8Array,
    Int16Array,
    Int32Array,
    Uint16Array,
    Uint32Array,
    Float32Array,
    Float64Array,
    ArrayBuffer,
    DataView,
    RegExp,
    Error,
    TypeError,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    decodeURIComponent,
    encodeURIComponent,
    Intl,
    "typeof": (v) => typeof v,
    "eh-numero": (v) => typeof v === "number",
    "eh-palavra": (v) => typeof v === "string",
    "eh-booleano": (v) => typeof v === "boolean",
    "eh-objeto": (v) => v !== null && typeof v === "object" && !Array.isArray(v),
    "eh-array": (v) => Array.isArray(v),
    "eh-nulo": (v) => v === null || v === undefined,
    crypto,
    require,
    "erro-novo": (msg) => {
      throw new XSError(String(msg), {
        code: buildCode(CATEGORY.RUNT, 1),
      });
    },
  };
  for (const [k, v] of Object.entries(jsGlobals)) {
    builtins[k] = v;
  }

  return builtins;
}

async function importNodeModule(name) {
  try {
    let modulePath = name;

    if (!name.includes("/") && !name.includes("\\")) {
      try {
        modulePath = require.resolve(name);
      } catch (resolveError) {
        const localPath = path.join(process.cwd(), "node_modules", name);
        if (fs.existsSync(localPath)) {
          if (fs.statSync(localPath).isDirectory()) {
            const pkgPath = path.join(localPath, "package.json");
            if (fs.existsSync(pkgPath)) {
              const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
              modulePath = path.join(localPath, pkg.main || "index.js");
            } else {
              modulePath = path.join(localPath, "index.js");
            }
          } else {
            modulePath = localPath;
          }
        }
      }
    } else {
      modulePath = path.resolve(name);
      if (fs.existsSync(modulePath) && fs.statSync(modulePath).isDirectory()) {
        const pkgPath = path.join(modulePath, "package.json");
        if (fs.existsSync(pkgPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
          modulePath = path.join(modulePath, pkg.main || "index.js");
        } else {
          modulePath = path.join(modulePath, "index.js");
        }
      }
    }

    try {
      const mod = require(modulePath);
      return mod.default || mod;
    } catch (requireError) {
      const mod = await import(`file://${modulePath}`);
      return mod.default || mod;
    }
  } catch (e) {
    throw new XSError(`Failed to import module "${name}": ${e.message}`, {
      hint: "Check that the package is installed (npm install) and that the path is correct",
      help: `Run \`npm install ${name}\` or check the module path`,
      code: buildCode(CATEGORY.IMPT, 2),
    });
  }
}

async function runModule(code, env) {
  const tokens = lex(code);

  let ast = parse(tokens);
  ast = optimize(ast);

  for (const stmt of ast.body) {
    if (stmt.type === "ExportStmt") {
      env["manda-ai"](stmt.name, env[stmt.name]);
      continue;
    }
    await interpret(stmt, env);
  }
}
