import { createRepository } from "./orm.js";
import { XSError, undefinedVar, notAFunction, CATEGORY, buildCode, XSCallStack } from "./errors.js";

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

export let TABLES = {};

const constScopes = new WeakMap();

function rootEnv(env) {
  let root = env;
  while (root) {
    const proto = Object.getPrototypeOf(root);
    if (proto === null || proto === Object.prototype) return root;
    root = proto;
  }
  return env;
}

function isConst(env, name) {
  let scope = env;
  while (scope) {
    const cs = constScopes.get(scope);
    if (cs && cs.has(name)) return true;
    scope = Object.getPrototypeOf(scope);
  }
  return false;
}

function markConst(env, name) {
  let cs = constScopes.get(env);
  if (!cs) {
    cs = new Set();
    constScopes.set(env, cs);
  }
  cs.add(name);
}

function constError(name, loc) {
  return new XSError(`Cannot reassign const "${name}"`, {
    loc,
    hint: "Const variables are immutable",
    help: "Use `cria` (mutable) if the value needs to change",
    code: buildCode(CATEGORY.NOME, 4),
  });
}

// XanaScript call stack (Fase 3.5)
const callStack = new XSCallStack();

export function getCallStack() {
  return callStack;
}

let debugHook = null;
export function setDebugHook(fn) {
  debugHook = fn;
}

async function maybeDebug(node, env) {
  if (debugHook && node.loc) {
    await debugHook(node, env);
  }
}

function assignVar(env, name, val) {
  let scope = env;
  while (scope && !Object.prototype.hasOwnProperty.call(scope, name)) {
    scope = Object.getPrototypeOf(scope);
  }
  if (scope) {
    scope[name] = val;
  } else {
    env[name] = val;
  }
  return val;
}

function collectEnvNames(env) {
  const names = [];
  let scope = env;
  const seen = new Set();
  while (scope) {
    for (const k of Object.keys(scope)) {
      if (!seen.has(k)) {
        seen.add(k);
        names.push(k);
      }
    }
    scope = Object.getPrototypeOf(scope);
  }
  return names;
}

async function runBlock(node, env) {
  const scope = Object.create(env);
  let result;
  for (const stmt of node.body) {
    await maybeDebug(stmt, scope);
    result = await interpret(stmt, scope);
  }
  return result;
}

export async function interpret(node, env) {
  switch (node.type) {
    case "Program": {
      let result;
      for (const stmt of node.body) {
        await maybeDebug(stmt, env);
        result = await interpret(stmt, env);
      }
      return result;
    }
    case "Block": {
      return runBlock(node, env);
    }
    case "VarDecl": {
      const val = node.init ? await interpret(node.init, env) : undefined;
      if (node.kind === "global") {
        rootEnv(env)[node.id] = val;
      } else {
        if (node.kind === "const") markConst(env, node.id);
        env[node.id] = val;
      }
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
        if (isConst(env, node.left.name)) {
          throw constError(node.left.name, node.loc);
        }
        assignVar(env, node.left.name, val);
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
        const candidates = collectEnvNames(env);
        const err = undefinedVar(node.name, node.loc, candidates);
        throw err;
      }
      return env[node.name];
    }
    case "UpdateExpr": {
      const v = await interpret(node.arg, env);
      const nv = node.op === "++" ? v + 1 : v - 1;
      if (node.arg.type === "Ident") {
        if (isConst(env, node.arg.name)) {
          throw constError(node.arg.name, node.loc);
        }
        assignVar(env, node.arg.name, nv);
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
        case "-":
          return -v;
        case "!":
          return !v;
        case "~":
          return ~v;
        default:
          throw new XSError(`Unknown unary operator: ${node.op}`, node.loc);
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
        try {
          return new RegExp(r).test(l);
        } catch {
          throw new XSError(`Invalid regular expression: ${r}`, node.loc);
        }
      }
      if (node.op === "??") {
        const l = await interpret(node.left, env);
        if (l !== null && l !== undefined) return l;
        return interpret(node.right, env);
      }
      const l = await interpret(node.left, env);
      const r = await interpret(node.right, env);
      switch (node.op) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          return l / r;
        case "%":
          return l % r;
        case "**":
          return l ** r;
        case "==":
          return l == r;
        case "!=":
          return l != r;
        case "===":
          return l === r;
        case "!==":
          return l !== r;
        case ">":
          return l > r;
        case "<":
          return l < r;
        case ">=":
          return l >= r;
        case "<=":
          return l <= r;
        case "|":
          return l | r;
        case "&":
          return l & r;
        case "^":
          return l ^ r;
        case "<<":
          return l << r;
        case ">>":
          return l >> r;
        default:
          throw new XSError(`Unknown binary operator: ${node.op}`, node.loc);
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
          if (e instanceof ContinueSignal) {
            continued = true;
          } else throw e;
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
        node.params.forEach((p, i) => {
          scope[p] = args[i];
        });
        callStack.push(node.name, node.loc);
        try {
          return await interpret(node.body, scope);
        } catch (e) {
          if (e instanceof ReturnSignal) {
            return e.value;
          }
          if (e instanceof XSError && !e.frames) {
            e.frames = callStack.frames.slice().reverse();
          }
          throw e;
        } finally {
          callStack.pop();
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
      if (node.callee.type === "Ident") {
        const name = node.callee.name;
        if (name === "tamanho") {
          const args = [];
          for (const a of node.args) args.push(await interpret(a, env));
          return args[0]?.length;
        }
        if (name === "divide-texto") {
          const args = [];
          for (const a of node.args) args.push(await interpret(a, env));
          return args[0]?.split(args[1]);
        }
        if (name === "encontra") {
          const args = [];
          for (const a of node.args) args.push(await interpret(a, env));
          try {
            return String(args[0])?.match(new RegExp(args[1]));
          } catch {
            throw new XSError(`Invalid regular expression: ${args[1]}`, node.loc);
          }
        }
        if (name === "decodifica-url") {
          const args = [];
          for (const a of node.args) args.push(await interpret(a, env));
          return decodeURIComponent(args[0]);
        }
        if (name === "juntar") {
          const args = [];
          for (const a of node.args) args.push(await interpret(a, env));
          return args[0]?.join(args[1]);
        }
        if (name === "horinha") return Date.now();
      }

      if (node.callee.type === "Member") {
        const obj = await interpret(node.callee.obj, env);
        const fn = obj[node.callee.prop];
        const args = [];
        for (const a of node.args) {
          args.push(await interpret(a, env));
        }
        if (typeof fn === "function") return fn.call(obj, ...args);
      }

      const fn = await interpret(node.callee, env);
      const args = [];
      for (const a of node.args) {
        args.push(await interpret(a, env));
      }

      if (typeof fn !== "function") {
        const name = node.callee.type === "Ident" ? node.callee.name : "expression";
        const err = notAFunction(name, node.loc);
        throw err;
      }
      return await fn(...args);
    }
    case "Member": {
      const obj = await interpret(node.obj, env);
      return obj[node.prop];
    }
    case "OptionalMember": {
      const obj = await interpret(node.obj, env);
      if (obj === null || obj === undefined) return null;
      return obj[node.prop];
    }
    case "ImportExpr": {
      return await env.__IMPORT__(node.path);
    }
    case "ImportStmt": {
      const mod = await env.__IMPORT__(node.path);
      if (node.alias) {
        env[node.alias] = mod;
      } else {
        Object.assign(env, mod);
      }
      return mod;
    }
    case "ExportStmt":
      return null;
    case "ArrayExpr": {
      const arr = [];
      for (const item of node.items) {
        if (item.type === "Spread") {
          const spread = await interpret(item.arg, env);
          if (spread && typeof spread[Symbol.iterator] === "function") {
            arr.push(...spread);
          } else {
            arr.push(spread);
          }
        } else {
          arr.push(await interpret(item, env));
        }
      }
      return arr;
    }
    case "ObjectExpr": {
      const obj = {};
      for (const p of node.props) {
        if (p.spread) {
          const spread = await interpret(p.value, env);
          if (spread && typeof spread === "object") {
            Object.assign(obj, spread);
          }
        } else {
          obj[p.key] = await interpret(p.value, env);
        }
      }
      return obj;
    }
    case "TypeOf": {
      const v = await interpret(node.arg, env);
      if (v === null) return "eh-nada";
      if (Array.isArray(v)) return "sus";
      switch (typeof v) {
        case "number":
          return "eh-numero";
        case "string":
          return "eh-palavra";
        case "boolean":
          return "vdd?";
        case "function":
          return "faz-ai";
        case "object":
          return "bagulho";
        default:
          return "sla";
      }
    }
    case "InstanceOf": {
      const v = await interpret(node.arg, env);
      const cls = await interpret(node.cls, env);
      if (typeof cls === "function" && v instanceof cls) return true;
      return false;
    }
    case "ArrowFunction": {
      const fn = async (...args) => {
        const scope = Object.create(env);
        node.params.forEach((p, i) => {
          scope[p] = args[i];
        });
        callStack.push("(arrow)", node.loc);
        try {
          return await interpret(node.body, scope);
        } catch (e) {
          if (e instanceof ReturnSignal) {
            return e.value;
          }
          if (e instanceof XSError && !e.frames) {
            e.frames = callStack.frames.slice().reverse();
          }
          throw e;
        } finally {
          callStack.pop();
        }
      };
      return fn;
    }
    case "TryCatchStmt": {
      let error = null;
      let result;
      try {
        result = await interpret(node.tryBlock, env);
      } catch (e) {
        if (e instanceof ReturnSignal || e instanceof BreakSignal || e instanceof ContinueSignal) {
          if (node.finallyBlock) {
            await interpret(node.finallyBlock, env);
          }
          throw e;
        }
        error = e;
        const scope = Object.create(env);
        if (node.catchParam) {
          scope[node.catchParam] = e;
          result = await interpret(node.catchBlock, scope);
        } else {
          result = await interpret(node.catchBlock, scope);
        }
      }
      if (node.finallyBlock) {
        await interpret(node.finallyBlock, env);
      }
      return result;
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
      const cls = function (...args) {
        const instance = {};
        instance.__proto__ = cls.prototype;
        if (cls.prototype.__constructor) {
          const scope = Object.create(env);
          scope["esse-cara"] = instance;
          cls.prototype.params.forEach((p, i) => {
            scope[p] = args[i];
          });
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
          cls.prototype[method.name] = async function (...args) {
            const scope = Object.create(env);
            scope["esse-cara"] = this;
            method.params.forEach((p, i) => {
              scope[p] = args[i];
            });
            callStack.push(method.name, method.loc);
            try {
              return await interpret(method.body, scope);
            } catch (e) {
              if (e instanceof ReturnSignal) return e.value;
              if (e instanceof XSError && !e.frames) {
                e.frames = callStack.frames.slice().reverse();
              }
              throw e;
            } finally {
              callStack.pop();
            }
          };
        }
      }

      env[node.name] = cls;
      return cls;
    }

    case "ThisExpr": {
      if (!("esse-cara" in env)) {
        throw new XSError("`esse-cara` used outside a method", {
          loc: node.loc,
          hint: "esse-cara only works inside metodo or spawna",
          help: "Use esse-cara only inside class methods",
          code: buildCode(CATEGORY.NOME, 3),
        });
      }
      return env["esse-cara"];
    }

    case "NewExpr": {
      let clsNode = node.callee;
      let argsNodes = node.args;
      if (clsNode.type === "Call") {
        argsNodes = clsNode.args;
        clsNode = clsNode.callee;
      }
      const cls = await interpret(clsNode, env);
      if (typeof cls !== "function") {
        throw new XSError("novo only works with classes", {
          loc: node.loc,
          hint: "The identifier after novo must be a class",
          help: "Define a class with classe before using novo",
          code: buildCode(CATEGORY.RUNT, 1),
        });
      }
      const args = [];
      for (const a of argsNodes) {
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
      if (!env.__testResults) env.__testResults = [];
      try {
        await interpret(node.body, env);
        env.__testResults.push({ name: node.name, passed: true, error: null });
      } catch (e) {
        if (e instanceof AssertionError) {
          env.__testResults.push({ name: node.name, passed: false, error: e.message });
        } else if (
          e instanceof ReturnSignal ||
          e instanceof BreakSignal ||
          e instanceof ContinueSignal
        ) {
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
        throw new AssertionError(
          `deu-match failed at ${node.loc?.line || "?"}:${node.loc?.column || "?"}`
        );
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
      const repo = createRepository(node.name, node.props, env.__dir || process.cwd());
      TABLES[node.name] = repo;
      env[node.name] = repo;
      return repo;
    }

    case "MacroDecl":
      return null;

    case "TypeDecl":
      return null;

    default:
      throw new XSError(`Unsupported node: ${node.type}`, {
        loc: node.loc,
        code: buildCode(CATEGORY.RUNT, 99),
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
