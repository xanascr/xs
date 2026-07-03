import { OP } from "./opcodes.js";

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
        stack.push(globals[arg]);
        break;

      case OP.STORE: {
        const val = stack.pop();
        globals[arg] = val;
        last = val;
        break;
      }

      case OP.ADD: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a + b);
        break;
      }

      case OP.SUB: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a - b);
        break;
      }

      case OP.MUL: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a * b);
        break;
      }

      case OP.DIV: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a / b);
        break;
      }

      case OP.MOD: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a % b);
        break;
      }

      case OP.EQ: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a == b);
        break;
      }

      case OP.NEQ: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a != b);
        break;
      }

      case OP.LT: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a < b);
        break;
      }

      case OP.GT: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a > b);
        break;
      }

      case OP.LTE: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a <= b);
        break;
      }

      case OP.GTE: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a >= b);
        break;
      }

      case OP.NOT: {
        const a = stack.pop();
        stack.push(!a);
        break;
      }

      case OP.JMP:
        ip = arg;
        continue;

      case OP.JMPF: {
        const val = stack.pop();
        if (!val) {
          ip = arg;
          continue;
        }
        break;
      }

      case OP.JMPT: {
        const val = stack.pop();
        if (val) {
          ip = arg;
          continue;
        }
        break;
      }

      case OP.SWAP: {
        const a = stack.pop();
        const b = stack.pop();
        stack.push(a);
        stack.push(b);
        break;
      }

      case OP.CALL: {
        const fn = stack.pop();
        const args = [];
        for (let i = 0; i < arg; i++) {
          args.unshift(stack.pop());
        }
        last = fn(...args);
        stack.push(last);
        break;
      }

      case OP.MEMBER: {
        const prop = stack.pop();
        const obj = stack.pop();
        stack.push(obj[prop]);
        break;
      }

      case OP.INDEX: {
        const idx = stack.pop();
        const obj = stack.pop();
        stack.push(obj[idx]);
        break;
      }

      case OP.ARRAY: {
        const arr = [];
        for (let i = 0; i < arg; i++) {
          arr.unshift(stack.pop());
        }
        stack.push(arr);
        break;
      }

      case OP.OBJECT: {
        const total = arg;
        const obj = {};
        const pairs = [];
        for (let i = 0; i < total; i++) {
          pairs.unshift(stack.pop());
        }
        for (let i = 0; i < pairs.length; i += 2) {
          obj[pairs[i]] = pairs[i + 1];
        }
        stack.push(obj);
        break;
      }

      case OP.PRINT: {
        const vals = [];
        for (let i = 0; i < arg; i++) {
          vals.unshift(stack.pop());
        }
        console.log(...vals);
        break;
      }

      case OP.WARN: {
        const vals = [];
        for (let i = 0; i < arg; i++) {
          vals.unshift(stack.pop());
        }
        console.warn(...vals);
        break;
      }

      case OP.HALT:
        return last;
    }

    ip++;
  }
}
