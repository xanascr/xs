import { OP } from "./opcodes.js";
import { createEnv } from "../runtime.js";

class VMError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "VMError";
  }
}

function pop(stack) {
  if (stack.length === 0) throw new VMError("VM stack underflow");
  return stack.pop();
}

function popN(stack, n) {
  const vals = [];
  for (let i = 0; i < n; i++) vals.unshift(pop(stack));
  return vals;
}

function matchPattern(value, pattern, bindings) {
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

export function run(code, baseDir = process.cwd()) {
  const stack = [];
  const globals = Object.assign({}, createEnv(baseDir));
  const frames = [];
  const scopeStack = [];
  const constScopes = new Map();
  let scope = globals;
  let ip = 0;
  let last = null;

  const findConst = (name) => {
    let s = scope;
    while (s) {
      const cs = constScopes.get(s);
      if (cs && cs.has(name)) return true;
      s = Object.getPrototypeOf(s);
    }
    return false;
  };

  const markConst = (name) => {
    let cs = constScopes.get(scope);
    if (!cs) {
      cs = new Set();
      constScopes.set(scope, cs);
    }
    cs.add(name);
  };

  while (ip < code.length) {
    const instr = code[ip];
    const op = instr[0];
    const arg = instr[1];

    switch (op) {
      case OP.PUSH:
        if (arg && typeof arg === "object" && arg.type === "xs-fn") {
          stack.push({ ...arg, closure: scope });
        } else {
          stack.push(arg);
        }
        break;
      case OP.LOAD:
        if (!(arg in scope)) throw new VMError(`Variable "${arg}" not declared`);
        stack.push(scope[arg]);
        break;
      case OP.STORE: {
        const val = pop(stack);
        if (findConst(arg)) throw new VMError(`Cannot reassign const "${arg}"`);
        let s = scope;
        while (s && !Object.prototype.hasOwnProperty.call(s, arg)) s = Object.getPrototypeOf(s);
        if (s) s[arg] = val;
        else scope[arg] = val;
        last = val;
        break;
      }
      case OP.CONST: {
        const val = pop(stack);
        markConst(arg);
        scope[arg] = val;
        last = val;
        break;
      }
      case OP.GLOBAL: {
        const val = pop(stack);
        globals[arg] = val;
        last = val;
        break;
      }
      case OP.ADD: {
        const b = pop(stack);
        const a = pop(stack);
        stack.push(a + b);
        break;
      }
      case OP.SUB: {
        const b = pop(stack);
        const a = pop(stack);
        stack.push(a - b);
        break;
      }
      case OP.MUL: {
        const b = pop(stack);
        const a = pop(stack);
        stack.push(a * b);
        break;
      }
      case OP.DIV: {
        const b = pop(stack);
        const a = pop(stack);
        stack.push(a / b);
        break;
      }
      case OP.MOD: {
        const b = pop(stack);
        const a = pop(stack);
        stack.push(a % b);
        break;
      }
      case OP.EQ: {
        const b = pop(stack);
        const a = pop(stack);
        stack.push(a === b);
        break;
      }
      case OP.NEQ: {
        const b = pop(stack);
        const a = pop(stack);
        stack.push(a !== b);
        break;
      }
      case OP.LT: {
        const b = pop(stack);
        const a = pop(stack);
        stack.push(a < b);
        break;
      }
      case OP.GT: {
        const b = pop(stack);
        const a = pop(stack);
        stack.push(a > b);
        break;
      }
      case OP.LTE: {
        const b = pop(stack);
        const a = pop(stack);
        stack.push(a <= b);
        break;
      }
      case OP.GTE: {
        const b = pop(stack);
        const a = pop(stack);
        stack.push(a >= b);
        break;
      }
      case OP.NOT: {
        const a = pop(stack);
        stack.push(!a);
        break;
      }
      case OP.BIT_OR: {
        const b = pop(stack);
        const a = pop(stack);
        stack.push(a | b);
        break;
      }
      case OP.BIT_AND: {
        const b = pop(stack);
        const a = pop(stack);
        stack.push(a & b);
        break;
      }
      case OP.BIT_XOR: {
        const b = pop(stack);
        const a = pop(stack);
        stack.push(a ^ b);
        break;
      }
      case OP.BIT_SHL: {
        const b = pop(stack);
        const a = pop(stack);
        stack.push(a << b);
        break;
      }
      case OP.BIT_SHR: {
        const b = pop(stack);
        const a = pop(stack);
        stack.push(a >> b);
        break;
      }
      case OP.BIT_NOT: {
        const a = pop(stack);
        stack.push(~a);
        break;
      }
      case OP.POW: {
        const b = pop(stack);
        const a = pop(stack);
        stack.push(a ** b);
        break;
      }
      case OP.NULLCO: {
        const b = pop(stack);
        const a = pop(stack);
        stack.push(a !== null && a !== undefined ? a : b);
        break;
      }
      case OP.OPTMEMBER: {
        const prop = pop(stack);
        const obj = pop(stack);
        if (obj == null) {
          stack.push(undefined);
          break;
        }
        stack.push(obj[prop]);
        break;
      }
      case OP.TYPEOF: {
        const v = pop(stack);
        if (v === null || v === undefined) {
          stack.push("eh-nada");
          break;
        }
        if (Array.isArray(v)) {
          stack.push("sus");
          break;
        }
        switch (typeof v) {
          case "number":
            stack.push("eh-numero");
            break;
          case "string":
            stack.push("eh-palavra");
            break;
          case "boolean":
            stack.push("vdd?");
            break;
          case "function":
            stack.push("faz-ai");
            break;
          case "object":
            stack.push("bagulho");
            break;
          default:
            stack.push("sla");
        }
        break;
      }
      case OP.INSTANCEOF: {
        const cls = pop(stack);
        const val = pop(stack);
        if (cls && cls.type === "xs-class") {
          let proto = Object.getPrototypeOf(val);
          let ok = false;
          while (proto) {
            if (proto === cls.prototype) {
              ok = true;
              break;
            }
            proto = Object.getPrototypeOf(proto);
          }
          stack.push(ok);
          break;
        }
        stack.push(val instanceof cls);
        break;
      }
      case OP.ARR_INIT:
        stack.push([]);
        break;
      case OP.ARR_APPEND: {
        const v = pop(stack);
        const arr = pop(stack);
        arr.push(v);
        stack.push(arr);
        break;
      }
      case OP.ARR_SPREAD: {
        const v = pop(stack);
        const arr = pop(stack);
        if (Array.isArray(v)) arr.push(...v);
        stack.push(arr);
        break;
      }
      case OP.ARR_END:
        break;
      case OP.OBJ_INIT:
        stack.push({});
        break;
      case OP.OBJ_SET: {
        const v = pop(stack);
        const key = pop(stack);
        const obj = pop(stack);
        obj[key] = v;
        stack.push(obj);
        break;
      }
      case OP.OBJ_SPREAD: {
        const v = pop(stack);
        const obj = pop(stack);
        if (v && typeof v === "object") Object.assign(obj, v);
        stack.push(obj);
        break;
      }
      case OP.OBJ_END:
        break;
      case OP.JMP:
        ip = arg;
        continue;
      case OP.JMPF: {
        const val = pop(stack);
        if (!val) {
          ip = arg;
          continue;
        }
        break;
      }
      case OP.JMPT: {
        const val = pop(stack);
        if (val) {
          ip = arg;
          continue;
        }
        break;
      }
      case OP.SWAP: {
        const a = pop(stack);
        const b = pop(stack);
        stack.push(a);
        stack.push(b);
        break;
      }
      case OP.CALL: {
        const fn = pop(stack);
        const args = popN(stack, arg);
        if (fn && fn.type === "xs-fn") {
          frames.push({ scope, retIp: ip + 1 });
          scope = Object.create(fn.closure || scope);
          fn.params.forEach((p, i) => {
            scope[p] = args[i];
          });
          ip = fn.start;
          continue;
        }
        if (typeof fn !== "function") throw new VMError(`Call to non-function: ${typeof fn}`);
        last = fn(...args);
        stack.push(last);
        break;
      }
      case OP.CALLMEMBER: {
        const prop = pop(stack);
        const obj = pop(stack);
        const args = popN(stack, arg);
        const fn = obj == null ? undefined : obj[prop];
        if (fn && fn.type === "xs-fn") {
          frames.push({ scope, retIp: ip + 1 });
          scope = Object.create(fn.closure || scope);
          scope["esse-cara"] = obj;
          fn.params.forEach((p, i) => {
            scope[p] = args[i];
          });
          ip = fn.start;
          continue;
        }
        if (typeof fn !== "function") throw new VMError(`Property "${prop}" is not a function`);
        last = fn.call(obj, ...args);
        stack.push(last);
        break;
      }
      case OP.NEW: {
        const cls = pop(stack);
        const args = popN(stack, arg);
        if (!cls || cls.type !== "xs-class") throw new VMError(`novo only works with classes`);
        const instance = {};
        instance.__proto__ = cls.prototype;
        const ctor = cls.prototype.__constructor;
        if (ctor) {
          frames.push({ scope, retIp: ip + 1, ctorInstance: instance });
          scope = Object.create(ctor.closure || cls.closure || scope);
          scope["esse-cara"] = instance;
          ctor.params.forEach((p, i) => {
            scope[p] = args[i];
          });
          ip = ctor.start;
          continue;
        }
        stack.push(instance);
        last = instance;
        break;
      }
      case OP.CLASS: {
        const desc = pop(stack);
        if (!desc || desc.type !== "xs-class")
          throw new VMError(`CLASS expected a class descriptor`);
        const cls = {
          type: "xs-class",
          name: desc.name,
          superClass: desc.superClass,
          prototype: {},
          closure: scope,
        };
        const parent = desc.superClass ? scope[desc.superClass] : null;
        if (parent && parent.prototype) cls.prototype.__proto__ = parent.prototype;
        for (const m of desc.methods) {
          if (m.isConstructor) {
            cls.prototype.__constructor = { ...m, closure: scope };
            cls.prototype.params = m.params;
          } else {
            cls.prototype[m.name] = { ...m, closure: scope };
          }
        }
        stack.push(cls);
        last = cls;
        break;
      }
      case OP.RETURN: {
        const val = stack.length > 0 ? pop(stack) : null;
        const frame = frames.pop();
        if (!frame) {
          last = val;
          ip = code.length;
          continue;
        }
        scope = frame.scope;
        ip = frame.retIp;
        if (frame.ctorInstance !== undefined) {
          stack.push(frame.ctorInstance);
          last = frame.ctorInstance;
        } else {
          stack.push(val);
          last = val;
        }
        continue;
      }
      case OP.STORE_MEMBER: {
        const prop = pop(stack);
        const obj = pop(stack);
        const val = pop(stack);
        if (obj == null) throw new VMError(`Cannot set property of ${obj}`);
        obj[prop] = val;
        last = val;
        break;
      }
      case OP.STORE_INDEX: {
        const idx = pop(stack);
        const obj = pop(stack);
        const val = pop(stack);
        if (obj == null) throw new VMError(`Cannot index ${obj}`);
        obj[idx] = val;
        last = val;
        break;
      }
      case OP.LEN: {
        const v = pop(stack);
        stack.push(v == null ? 0 : v.length);
        break;
      }
      case OP.DUP: {
        const v = pop(stack);
        stack.push(v);
        stack.push(v);
        break;
      }
      case OP.POP:
        pop(stack);
        break;
      case OP.DESTRUCTURE: {
        const value = pop(stack);
        const bindings = Object.create(scope);
        if (matchPattern(value, arg, bindings)) {
          stack.push(bindings);
        } else {
          stack.push(null);
        }
        break;
      }
      case OP.SCOPE_ENTER: {
        const bindings = pop(stack);
        scopeStack.push(scope);
        scope = bindings;
        break;
      }
      case OP.SCOPE_EXIT:
        scope = scopeStack.pop();
        break;
      case OP.MEMBER: {
        const prop = pop(stack);
        const obj = pop(stack);
        if (obj == null) throw new VMError(`Cannot access property of ${obj}`);
        stack.push(obj[prop]);
        break;
      }
      case OP.INDEX: {
        const idx = pop(stack);
        const obj = pop(stack);
        if (obj == null) throw new VMError(`Cannot index ${obj}`);
        stack.push(obj[idx]);
        break;
      }
      case OP.ARRAY: {
        const arr = [];
        for (let i = 0; i < arg; i++) {
          arr.unshift(pop(stack));
        }
        stack.push(arr);
        break;
      }
      case OP.OBJECT: {
        const total = arg;
        const obj = {};
        const pairs = [];
        for (let i = 0; i < total; i++) {
          pairs.unshift(pop(stack));
        }
        for (let i = 0; i < pairs.length; i += 2) {
          obj[pairs[i]] = pairs[i + 1];
        }
        stack.push(obj);
        break;
      }
      case OP.PRINT: {
        const vals = popN(stack, arg);
        console.log(...vals);
        break;
      }
      case OP.WARN: {
        const vals = popN(stack, arg);
        console.warn(...vals);
        break;
      }
      case OP.HALT:
        return last;
      default:
        throw new VMError(`Unknown opcode: ${op}`);
    }
    ip++;
  }

  return last;
}
