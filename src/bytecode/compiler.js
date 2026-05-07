import { OP } from "./opcodes.js";

export function compile(ast) {
  const code = [];

  emitNode(ast);

  code.push([OP.HALT]);

  return code;

  function emit(op, arg = null) {
    code.push([op, arg]);
  }

  function emitNode(node) {
    switch (node.type) {

      case "Program":
        node.body.forEach(emitNode);
        break;

      case "Num":
        emit(OP.PUSH, node.value);
        break;

      case "Str":
        emit(OP.PUSH, node.value);
        break;

      case "Ident":
        emit(OP.LOAD, node.name);
        break;

      case "VarDecl":
        emitNode(node.init);
        emit(OP.STORE, node.id);
        break;

      case "Binary":
        emitNode(node.left);
        emitNode(node.right);

        switch (node.op) {
          case "+":
            emit(OP.ADD);
            break;

          case "-":
            emit(OP.SUB);
            break;

          case "*":
            emit(OP.MUL);
            break;

          case "/":
            emit(OP.DIV);
            break;
        }

        break;

      case "Call": {

        // SOLTA O GRITO
        if (
          node.callee.type === "Ident" &&
          node.callee.name === "SOLTA_O_GRITO"
        ) {
          for (const arg of node.args) {
            emitNode(arg);
          }

          emit(OP.PRINT, node.args.length);

          break;
        }

        break;
      }
    }
  }
}