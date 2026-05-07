import { OP } from "./opcodes.js";

export function run(code) {
  const stack = [];

  const globals = {};

  let ip = 0;

  let last = null;

  while (ip < code.length) {
    const [op, arg] = code[ip];

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

      case OP.PRINT: {
        const vals = [];

        for (let i = 0; i < arg; i++) {
          vals.unshift(stack.pop());
        }

        console.log(...vals);

        break;
      }

      case OP.HALT:
        return last;
    }

    ip++;
  }
}