import { OP } from "./opcodes.js";

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

export function run(code) {
  const stack = [];
  const globals = {};
  let ip = 0;
  let last = null;

  while (ip < code.length) {
    const instr = code[ip];
    const op = instr[0];
    const arg = instr[1];

    switch (op) {

      case OP.PUSH:
        stack.push(arg);
        break;

      case OP.LOAD:
        if (!(arg in globals)) throw new VMError(`Variável "${arg}" não declarada`);
        stack.push(globals[arg]);
        break;

      case OP.STORE: {
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
        if (typeof fn !== "function") throw new VMError(`Chamada a não-função: ${typeof fn}`);
        last = fn(...args);
        stack.push(last);
        break;
      }

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
        throw new VMError(`Opcode desconhecido: ${op}`);
    }

    ip++;
  }
}
