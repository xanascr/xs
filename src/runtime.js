import fs from "fs";
import path from "path";
import http from "http";
import axios from "axios";

import { lex } from "./lexer.js";
import { parse } from "./parser.js";
import { optimize } from "./optimizer.js";
import { interpret, setTabelas } from "./interpreter.js";
import { setSource, XSError, formatError } from "./errors.js";
import { criarRepositorio } from "./orm.js";

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

    AGORA_VAI: async url => {
      try {
        const res = await axios.get(url, { timeout: 3000 });
        return res.data;
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
        full = mod;
        return await importNodeModule(mod);
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
  return builtins;
}

async function importNodeModule(name) {
  try {
    const mod = await import(name);
    return mod.default || mod;
  } catch (e) {
    throw new XSError(`Falha ao importar módulo "${name}": ${e.message}`, {
      hint: "Verifique se o pacote está instalado (npm install)",
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
