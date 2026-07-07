import { criarRepositorio } from "./orm.js";
import { XSError, typeMismatch, undefinedVar, notAFunction } from "./errors.js";

export class ReturnSignal {
  constructor(value) {
    this.value = value;
  }
}

export class BreakSignal {}
export class ContinueSignal {}

export class AssertionError extends Error {
  constructor(message) {
    super(message);
    this.name = "AssertionError";
  }
}

let TABELAS = {};

export function setTabelas(t) {
  TABELAS = t;
}

export async function interpret(node, env) {
  switch (node.type) {
    case "Program": {
      let result;
      for (const stmt of node.body) {
        result = await interpret(stmt, env);
      }
      return result;
    }
    case "Block": {
      let result;
      for (const stmt of node.body) {
        result = await interpret(stmt, env);
      }
      return result;
    }
    case "VarDecl": {
      const val = node.init ? await interpret(node.init, env) : undefined;
      env[node.id] = val;
      return val;
    }
    case "Assign": {
      const val = await interpret(node.right, env);
      if (node.left.type === "Member") {
        const obj = await interpret(node.left.obj, env);
        obj[node.left.prop] = val;
      } else if (node.left.type === "IndexExpr") {
        const obj = await interpret(node.left.obj, env);
        const idx = await interpret(node.left.index, env);
        obj[idx] = val;
      } else {
        env[node.left.name] = val;
      }
      return val;
    }
    case "Num":
      return node.value;
    case "Str":
      return node.value;
    case "Bool":
      return node.value;
    case "Nil":
      return null;
    case "Ident": {
      if (!(node.name in env)) {
        const err = undefinedVar(node.name, node.loc);
        throw err;
      }
      return env[node.name];
    }
    case "UpdateExpr": {
      const v = await interpret(node.arg, env);
      const nv = node.op === "++" ? v + 1 : v - 1;
      if (node.arg.type === "Ident") {
        env[node.arg.name] = nv;
      } else if (node.arg.type === "Member") {
        const obj = await interpret(node.arg.obj, env);
        obj[node.arg.prop] = nv;
      } else if (node.arg.type === "IndexExpr") {
        const obj = await interpret(node.arg.obj, env);
        const idx = await interpret(node.arg.index, env);
        obj[idx] = nv;
      }
      return node.prefix ? nv : v;
    }
    case "Unary": {
      const v = await interpret(node.arg, env);
      switch (node.op) {
        case "-": return -v;
        case "!": return !v;
        case "~": return ~v;
      }
      break;
    }
    case "Binary": {
      if (node.op === "&&") {
        const l = await interpret(node.left, env);
        if (!l) return l;
        return interpret(node.right, env);
      }
      if (node.op === "||") {
        const l = await interpret(node.left, env);
        if (l) return l;
        return interpret(node.right, env);
      }
      if (node.op === "~=") {
        const l = String(await interpret(node.left, env));
        const r = String(await interpret(node.right, env));
        return new RegExp(r).test(l);
      }
      const l = await interpret(node.left, env);
      const r = await interpret(node.right, env);
      switch (node.op) {
        case "+": return l + r;
        case "-": return l - r;
        case "*": return l * r;
        case "/": return l / r;
        case "%": return l % r;
        case "==": return l == r;
        case "!=": return l != r;
        case ">": return l > r;
        case "<": return l < r;
        case ">=": return l >= r;
        case "<=": return l <= r;
        case "|": return l | r;
        case "&": return l & r;
        case "^": return l ^ r;
        case "<<": return l << r;
        case ">>": return l >> r;
      }
      break;
    }
    case "IfStmt": {
      const test = await interpret(node.test, env);
      if (test) {
        return interpret(node.cons, env);
      }
      if (node.alt) {
        return interpret(node.alt, env);
      }
      return null;
    }
    case "ForStmt": {
      if (node.init) {
        await interpret(node.init, env);
      }
      while (await interpret(node.test, env)) {
        let continued = false;
        try {
          await interpret(node.body, env);
        } catch (e) {
          if (e instanceof BreakSignal) break;
          if (e instanceof ContinueSignal) { continued = true; }
          else throw e;
        }
        if (node.update) {
          await interpret(node.update, env);
        }
        if (continued) continue;
      }
      return null;
    }
    case "WhileStmt": {
      while (await interpret(node.test, env)) {
        try {
          await interpret(node.body, env);
        } catch (e) {
          if (e instanceof BreakSignal) break;
          if (e instanceof ContinueSignal) continue;
          throw e;
        }
      }
      return null;
    }
    case "FunctionDecl": {
      const fn = async (...args) => {
        const scope = Object.create(env);
        node.params.forEach((p, i) => { scope[p] = args[i]; });
        try {
          return await interpret(node.body, scope);
        } catch (e) {
          if (e instanceof ReturnSignal) {
            return e.value;
          }
          throw e;
        }
      };
      env[node.name] = fn;
      return fn;
    }
    case "ReturnStmt": {
      let val = null;
      if (node.arg) {
        val = await interpret(node.arg, env);
      }
      throw new ReturnSignal(val);
    }
    case "BreakStmt": {
      throw new BreakSignal();
    }
    case "ContinueStmt": {
      throw new ContinueSignal();
    }
    case "Call": {
      const fn = await interpret(node.callee, env);
      const args = [];
      for (const a of node.args) {
        args.push(await interpret(a, env));
      }

      if (node.callee.type === "Ident") {
        const name = node.callee.name;
        if (name === "TAMANHO") return args[0]?.length;
        if (name === "DIVIDE_TEXTO") return args[0]?.split(args[1]);
        if (name === "ENCONTRA") return String(args[0])?.match(new RegExp(args[1]));
        if (name === "DECODIFICA_URL") return decodeURIComponent(args[0]);
        if (name === "JUNTAR") return args[0]?.join(args[1]);
        if (name === "AGORA") return Date.now();
      }

      if (typeof fn !== "function") {
        const err = notAFunction(node.callee.name || "expressão", node.loc);
        throw err;
      }
      return await fn(...args);
    }
    case "Member": {
      const obj = await interpret(node.obj, env);
      return obj[node.prop];
    }
    case "ImportExpr": {
      return await env.__IMPORT__(node.path);
    }
    case "ImportStmt": {
      const mod = await env.__IMPORT__(node.path);
      if (node.alias) {
        env[node.alias] = mod;
      }
      return mod;
    }
    case "ExportStmt":
      return null;
    case "ArrayExpr": {
      const arr = [];
      for (const item of node.items) {
        arr.push(await interpret(item, env));
      }
      return arr;
    }
    case "ObjectExpr": {
      const obj = {};
      for (const p of node.props) {
        obj[p.key] = await interpret(p.value, env);
      }
      return obj;
    }
    case "ArrowFunction": {
      const fn = async (...args) => {
        const scope = Object.create(env);
        node.params.forEach((p, i) => { scope[p] = args[i]; });
        return interpret(node.body, scope);
      };
      return fn;
    }
    case "TryCatchStmt": {
      try {
        return await interpret(node.tryBlock, env);
      } catch (e) {
        if (e instanceof ReturnSignal || e instanceof BreakSignal || e instanceof ContinueSignal) throw e;
        const scope = Object.create(env);
        scope[node.catchParam] = e;
        return interpret(node.catchBlock, scope);
      }
    }
    case "IndexExpr": {
      const obj = await interpret(node.obj, env);
      const index = await interpret(node.index, env);
      return obj[index];
    }
    case "Ternary": {
      const test = await interpret(node.test, env);
      if (test) {
        return interpret(node.cons, env);
      }
      return interpret(node.alt, env);
    }

    case "ClassDecl": {
      const cls = function(...args) {
        const instance = {};
        instance.__proto__ = cls.prototype;
        if (cls.prototype.__constructor) {
          const scope = Object.create(env);
          scope["ISTO"] = instance;
          cls.prototype.params.forEach((p, i) => { scope[p] = args[i]; });
          interpret(cls.prototype.__constructor, scope);
        }
        return instance;
      };
      cls.prototype = {};

      if (node.superClass) {
        const parent = env[node.superClass];
        if (parent) {
          cls.prototype.__proto__ = parent.prototype;
        }
      }

      for (const method of node.methods) {
        if (method.isConstructor) {
          cls.prototype.__constructor = method.body;
          cls.prototype.params = method.params;
        } else {
          cls.prototype[method.name] = async function(...args) {
            const scope = Object.create(env);
            scope["ISTO"] = this;
            method.params.forEach((p, i) => { scope[p] = args[i]; });
            try {
              return await interpret(method.body, scope);
            } catch (e) {
              if (e instanceof ReturnSignal) return e.value;
              throw e;
            }
          };
        }
      }

      env[node.name] = cls;
      return cls;
    }

    case "ThisExpr": {
      if (!("ISTO" in env)) {
        throw new XSError("`ISTO` usado fora de um método", {
          loc: node.loc,
          hint: "ISTO só funciona dentro de METODO ou CONSTRUTOR",
          help: "Use ISTO apenas dentro de métodos de classe",
          code: "E006",
        });
      }
      return env["ISTO"];
    }

    case "NewExpr": {
      const cls = await interpret(node.callee, env);
      if (typeof cls !== "function") {
        throw new XSError("NOVA só funciona com classes", {
          loc: node.loc,
          hint: "O identificador após NOVA deve ser uma CLASSE",
          help: "Defina uma classe com CLASSE antes de usar NOVA",
          code: "E007",
        });
      }
      const args = [];
      for (const a of node.args) {
        args.push(await interpret(a, env));
      }
      return new cls(...args);
    }

    case "SwitchStmt": {
      const test = await interpret(node.test, env);
      for (const c of node.cases) {
        if (c.test === null) {
          return interpret(c.body, env);
        }
        const val = await interpret(c.test, env);
        if (test == val) {
          return interpret(c.body, env);
        }
      }
      return null;
    }

    case "MatchExpr": {
      const test = await interpret(node.test, env);
      for (const c of node.cases) {
        if (c.pattern === null) {
          return interpret(c.body, env);
        }
        const bindings = {};
        if (matchPattern(test, c.pattern, bindings)) {
          const scope = Object.create(env);
          Object.assign(scope, bindings);
          return interpret(c.body, scope);
        }
      }
      return null;
    }

    case "TestStmt": {
      try {
        await interpret(node.body, env);
        env.__testResults.push({ name: node.name, passed: true, error: null });
      } catch (e) {
        if (e instanceof AssertionError) {
          env.__testResults.push({ name: node.name, passed: false, error: e.message });
        } else if (e instanceof ReturnSignal || e instanceof BreakSignal || e instanceof ContinueSignal) {
          throw e;
        } else {
          env.__testResults.push({ name: node.name, passed: false, error: e.message });
        }
      }
      return null;
    }

    case "AssertStmt": {
      const val = await interpret(node.test, env);
      if (!val) {
        throw new AssertionError(`AFIRMA falhou em ${node.loc?.line || "?"}:${node.loc?.column || "?"}`);
      }
      return val;
    }

    case "TaskDecl": {
      env.__tasks = env.__tasks || {};
      env.__tasks[node.name] = async () => {
        return interpret(node.body, env);
      };
      return null;
    }

    case "TableDecl": {
      const repo = criarRepositorio(node.name, node.props, env.__dir || process.cwd());
      TABELAS[node.name] = repo;
      env[node.name] = repo;

      env[`CRIA_${node.name}`] = (dados) => repo.criar(dados);
      env[`LISTA_${node.name.toUpperCase()}`] = () => repo.listar();
      env[`BUSCA_${node.name.toUpperCase()}`] = (id) => repo.buscar(id);
      env[`ATUALIZA_${node.name.toUpperCase()}`] = (id, dados) => repo.atualizar(id, dados);
      env[`DELETA_${node.name.toUpperCase()}`] = (id) => repo.deletar(id);

      return repo;
    }

    case "MacroDecl":
      return null;

    default:
      throw new XSError(`Node não suportado: ${node.type}`, {
        loc: node.loc,
        code: "E999",
      });
  }
}

function matchPattern(value, pattern, bindings) {
  if (!pattern) return false;

  switch (pattern.type) {
    case "PatternLiteral":
      return value === pattern.value;

    case "PatternIdent":
      if (pattern.name === "_") return true;
      bindings[pattern.name] = value;
      return true;

    case "PatternArray": {
      if (!Array.isArray(value)) return false;
      let pi = 0;
      for (const el of pattern.elements) {
        if (el.type === "PatternRest") {
          bindings["..."] = value.slice(pi);
          return true;
        }
        if (pi >= value.length) return false;
        if (!matchPattern(value[pi], el, bindings)) return false;
        pi++;
      }
      return pi === value.length;
    }

    case "PatternObject": {
      if (typeof value !== "object" || value === null) return false;
      for (const prop of pattern.props) {
        if (!(prop.key in value)) return false;
        if (!matchPattern(value[prop.key], prop.pattern, bindings)) return false;
      }
      return true;
    }

    default:
      return false;
  }
}
