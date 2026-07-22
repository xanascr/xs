import fs from "fs";
import path from "path";
import http from "http";
import os from "os";
import { createRequire } from 'module';

import { lex } from "./lexer.js";
import { parse } from "./parser.js";
import { optimize } from "./optimizer.js";
import { interpret, TABELAS } from "./interpreter.js";
import { setSource, XSError } from "./errors.js";
import { criarRepositorio } from "./orm.js";

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

    SOLTA_O_GRITO: (...a) => console.log(...a),
    FALA_BAIXO: (...a) => console.warn(...a),

    AGORA: () => Date.now(),
    String: String,

    AGORA_VAI: async url => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
        return await res.json();
      } catch (e) {
        throw new XSError(`Falha em AGORA_VAI("${url}"): ${e.message}`, {
          hint: "Verifique se a URL está correta e acessível",
          code: "E100",
        });
      }
    },

    ESPERA_AI: ms => new Promise(r => setTimeout(r, ms)),
    SORTEIA: (a, b) => Math.floor(Math.random() * (b - a + 1)) + a,
    PARSEIA: JSON.parse,
    OUVE_AQUI: k => process.env[k] ?? null,

    CRIA_SERVIDOR: (port, handler) => {
      const server = http.createServer(async (req, res) => {
        const resposta = {
          enviar: (dados, tipo) => {
            if (tipo) res.setHeader("Content-Type", tipo);
            res.end(String(dados));
          },
          json: (dados) => {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(dados));
          },
          status: (codigo) => {
            res.statusCode = codigo;
            return resposta;
          },
          cabecalho: (chave, valor) => {
            res.setHeader(chave, valor);
            return resposta;
          },
        };

        const requisicao = {
          url: req.url,
          metodo: req.method,
          cabecalhos: req.headers,
          corpo: await new Promise(resolve => {
            let body = "";
            req.on("data", c => body += c);
            req.on("end", () => resolve(body));
          }),
        };

        try {
          await handler(requisicao, resposta);
        } catch (e) {
          res.statusCode = 500;
          res.end("Erro interno: " + e.message);
        }
      });

      server.listen(port, () => {
        console.log(` Servidor rodando em http://localhost:${port}`);
      });

      servers.add(server);
      return server;
    },

    PARA_SERVIDOR: (server) => {
      server.close();
      servers.delete(server);
      console.log(" Servidor parado");
    },

    CRIA_REPOSITORIO: (nomeTabela) => {
      const t = TABELAS[nomeTabela];
      const props = t?.props || [];
      return criarRepositorio(nomeTabela, props);
    },

    __IMPORT__: async mod => {
      let full;
      
      if (mod.startsWith(".") || mod.startsWith("/")) {
        full = path.resolve(baseDir, mod);
      } else {
        const xsPkgDir = path.join(baseDir, "node_modules", mod);
        const xsPkgFile = path.join(xsPkgDir, "xspack.json");
        
        if (fs.existsSync(xsPkgFile)) {
          const pkgMeta = JSON.parse(fs.readFileSync(xsPkgFile, "utf-8"));
          full = path.resolve(xsPkgDir, pkgMeta.main || "src/index.xs");
          if (!fs.existsSync(full)) full = path.resolve(xsPkgDir, "src/index.xs");
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
            throw new XSError(`Falha ao importar módulo "${mod}": ${e.message}`, {
              hint: "Verifique se o pacote está instalado (npm install) ou se o caminho está correto",
              code: "E102",
            });
          }
        }
      }
      
      if (CACHE.has(full)) {
        return CACHE.get(full);
      }
      if (LOADING.has(full)) {
        throw new XSError(`Import cíclico detectado: ${mod}`, {
          hint: "Dois arquivos se importam mutuamente",
          code: "E101",
        });
      }
      LOADING.add(full);
      const code = fs.readFileSync(full, "utf-8");
      const exports = {};
      const env2 = createEnv(path.dirname(full));
      env2.EXPORTA = (name, value) => { exports[name] = value; };
      await runModule(code, env2);
      CACHE.set(full, exports);
      LOADING.delete(full);
      return exports;
    }
  };
  builtins.__dir = baseDir;
  return builtins;
}

async function importNodeModule(name) {
  try {
    let modulePath = name;
    
    if (!name.includes('/') && !name.includes('\\')) {
      try {
        modulePath = require.resolve(name);
      } catch (resolveError) {
        const localPath = path.join(process.cwd(), 'node_modules', name);
        if (fs.existsSync(localPath)) {
          if (fs.statSync(localPath).isDirectory()) {
            const pkgPath = path.join(localPath, 'package.json');
            if (fs.existsSync(pkgPath)) {
              const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
              modulePath = path.join(localPath, pkg.main || 'index.js');
            } else {
              modulePath = path.join(localPath, 'index.js');
            }
          } else {
            modulePath = localPath;
          }
        }
      }
    } else {
      modulePath = path.resolve(name);
      if (fs.existsSync(modulePath) && fs.statSync(modulePath).isDirectory()) {
        const pkgPath = path.join(modulePath, 'package.json');
        if (fs.existsSync(pkgPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
          modulePath = path.join(modulePath, pkg.main || 'index.js');
        } else {
          modulePath = path.join(modulePath, 'index.js');
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
    throw new XSError(`Falha ao importar módulo "${name}": ${e.message}`, {
      hint: "Verifique se o pacote está instalado (npm install) e se o caminho está correto",
      code: "E102",
    });
  }
}

async function runModule(code, env) {
  const tokens = lex(code);

  let ast = parse(tokens);
  ast = optimize(ast);

  for (const stmt of ast.body) {
    if (stmt.type === "ExportStmt") {
      env.EXPORTA(stmt.name, env[stmt.name]);
      continue;
    }
    await interpret(stmt, env);
  }
}