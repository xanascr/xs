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

      case "Block":
        node.body.forEach(emitNode);
        break;

      case "Num":
        emit(OP.PUSH, node.value);
        break;

      case "Str":
        emit(OP.PUSH, node.value);
        break;

      case "Bool":
        emit(OP.PUSH, node.value);
        break;

      case "Nil":
        emit(OP.PUSH, null);
        break;

      case "Ident":
        emit(OP.LOAD, node.name);
        break;

      case "VarDecl":
        emitNode(node.init);
        emit(OP.STORE, node.id);
        break;

      case "Assign":
        emitNode(node.right);
        emit(OP.STORE, node.left.name);
        break;

      case "Binary":
        emitNode(node.left);
        emitNode(node.right);

        switch (node.op) {
          case "+": emit(OP.ADD); break;
          case "-": emit(OP.SUB); break;
          case "*": emit(OP.MUL); break;
          case "/": emit(OP.DIV); break;
          case "%": emit(OP.MOD); break;
          case "==": emit(OP.EQ); break;
          case "!=": emit(OP.NEQ); break;
          case "<": emit(OP.LT); break;
          case ">": emit(OP.GT); break;
          case "<=": emit(OP.LTE); break;
          case ">=": emit(OP.GTE); break;
          case "|": emit(OP.BIT_OR); break;
          case "&": emit(OP.BIT_AND); break;
          case "^": emit(OP.BIT_XOR); break;
          case "<<": emit(OP.BIT_SHL); break;
          case ">>": emit(OP.BIT_SHR); break;
          default: throw new Error(`Operador binário desconhecido no bytecode: ${node.op}`);
        }

        break;

      case "Unary":
        emitNode(node.arg);
        if (node.op === "!") emit(OP.NOT);
        if (node.op === "-") { emit(OP.PUSH, 0); emit(OP.SWAP); emit(OP.SUB); }
        if (node.op === "~") emit(OP.BIT_NOT);
        break;

      case "IfStmt": {
        emitNode(node.test);
        const jmpfIdx = code.length;
        emit(OP.JMPF, 0);
        emitNode(node.cons);
        if (node.alt) {
          const jmpIdx = code.length;
          emit(OP.JMP, 0);
          code[jmpfIdx][1] = code.length;
          emitNode(node.alt);
          code[jmpIdx][1] = code.length;
        } else {
          code[jmpfIdx][1] = code.length;
        }
        break;
      }

      case "ForStmt": {
        if (node.init) emitNode(node.init);
        const loopStart = code.length;
        emitNode(node.test);
        const jmpfIdx = code.length;
        emit(OP.JMPF, 0);
        emitNode(node.body);
        if (node.update) emitNode(node.update);
        emit(OP.JMP, loopStart);
        code[jmpfIdx][1] = code.length;
        break;
      }

      case "WhileStmt": {
        const loopStart = code.length;
        emitNode(node.test);
        const jmpfIdx = code.length;
        emit(OP.JMPF, 0);
        emitNode(node.body);
        emit(OP.JMP, loopStart);
        code[jmpfIdx][1] = code.length;
        break;
      }

      case "Call": {
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

        if (
          node.callee.type === "Ident" &&
          node.callee.name === "FALA_BAIXO"
        ) {
          for (const arg of node.args) {
            emitNode(arg);
          }
          emit(OP.WARN, node.args.length);
          break;
        }

        for (const arg of node.args) {
          emitNode(arg);
        }
        emitNode(node.callee);
        emit(OP.CALL, node.args.length);
        break;
      }

      case "Member": {
        emitNode(node.obj);
        emit(OP.PUSH, node.prop);
        emit(OP.MEMBER);
        break;
      }

      case "IndexExpr": {
        emitNode(node.obj);
        emitNode(node.index);
        emit(OP.INDEX);
        break;
      }

      case "ArrayExpr": {
        for (const item of node.items) {
          emitNode(item);
        }
        emit(OP.PUSH, node.items.length);
        emit(OP.ARRAY);
        break;
      }

      case "ObjectExpr": {
        for (const p of node.props) {
          emit(OP.PUSH, p.key);
          emitNode(p.value);
        }
        emit(OP.PUSH, node.props.length * 2);
        emit(OP.OBJECT);
        break;
      }
    default:
        throw new Error(`Bytecode compiler: node type "${node.type}" não suportado`);
    }
  }
}
