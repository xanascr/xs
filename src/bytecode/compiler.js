import { OP } from "./opcodes.js";

export function compile(ast) {
  const code = [];
  const pending = [];

  emitNode(ast);

  code.push([OP.HALT]);

  for (let i = 0; i < pending.length; i++) {
    const { desc, body } = pending[i];
    desc.start = code.length;
    emitNode(body);
    emit(OP.PUSH, null);
    emit(OP.RETURN);
  }

  return code;

  function emit(op, arg = null) {
    code.push([op, arg]);
  }

  function emitNode(node) {
    switch (node.type) {
      case "TypeDecl":
      case "MacroDecl":
      case "TaskDecl":
        break;
      case "Program":
        node.body.forEach(emitNode);
        break;
      case "Block":
        node.body.forEach(emitNode);
        break;
      case "Num":
      case "Str":
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
        if (node.kind === "const") {
          emit(OP.CONST, node.id);
        } else if (node.kind === "global") {
          emit(OP.GLOBAL, node.id);
        } else {
          emit(OP.STORE, node.id);
        }
        break;
      case "FunctionDecl": {
        const desc = { type: "xs-fn", name: node.name, params: node.params, start: -1 };
        pending.push({ desc, body: node.body });
        emit(OP.PUSH, desc);
        emit(OP.STORE, node.name);
        break;
      }
      case "ReturnStmt": {
        if (node.arg) emitNode(node.arg);
        else emit(OP.PUSH, null);
        emit(OP.RETURN);
        break;
      }
      case "ClassDecl": {
        const methods = [];
        for (const m of node.methods) {
          const desc = {
            type: "xs-fn",
            name: m.name || "constructor",
            params: m.params,
            start: -1,
            isMethod: true,
            isConstructor: m.isConstructor,
          };
          pending.push({ desc, body: m.body });
          methods.push(desc);
        }
        const cls = { type: "xs-class", name: node.name, superClass: node.superClass, methods };
        emit(OP.PUSH, cls);
        emit(OP.CLASS);
        emit(OP.STORE, node.name);
        break;
      }
      case "NewExpr": {
        let clsNode = node.callee;
        let argNodes = node.args;
        if (clsNode.type === "Call") {
          argNodes = clsNode.args;
          clsNode = clsNode.callee;
        }
        for (const a of argNodes) emitNode(a);
        emitNode(clsNode);
        emit(OP.NEW, argNodes.length);
        break;
      }
      case "ThisExpr":
        emit(OP.LOAD, "esse-cara");
        break;
      case "Assign": {
        emitNode(node.right);
        if (node.left.type === "Member") {
          emitNode(node.left.obj);
          emit(OP.PUSH, node.left.prop);
          emit(OP.STORE_MEMBER);
        } else if (node.left.type === "IndexExpr") {
          emitNode(node.left.obj);
          emitNode(node.left.index);
          emit(OP.STORE_INDEX);
        } else {
          emit(OP.STORE, node.left.name);
        }
        break;
      }
      case "UpdateExpr": {
        const op = node.op === "++" ? OP.ADD : OP.SUB;
        const t = node.arg;
        const loadPath = () => {
          if (t.type === "Ident") emit(OP.LOAD, t.name);
          else if (t.type === "Member") {
            emitNode(t.obj);
            emit(OP.PUSH, t.prop);
            emit(OP.INDEX);
          } else if (t.type === "IndexExpr") {
            emitNode(t.obj);
            emitNode(t.index);
            emit(OP.INDEX);
          } else throw new Error(`Unknown update target in bytecode: ${t.type}`);
        };
        const storePath = () => {
          if (t.type === "Ident") emit(OP.STORE, t.name);
          else if (t.type === "Member") {
            emitNode(t.obj);
            emit(OP.PUSH, t.prop);
            emit(OP.STORE_MEMBER);
          } else if (t.type === "IndexExpr") {
            emitNode(t.obj);
            emitNode(t.index);
            emit(OP.STORE_INDEX);
          }
        };
        loadPath();
        if (node.prefix) {
          emit(OP.PUSH, 1);
          emit(op);
          emit(OP.DUP);
          storePath();
        } else {
          emit(OP.DUP);
          emit(OP.PUSH, 1);
          emit(op);
          storePath();
        }
        break;
      }
      case "Binary": {
        if (node.op === "&&") {
          emitNode(node.left);
          emit(OP.DUP);
          const jmpIdx = code.length;
          emit(OP.JMPF, 0);
          emit(OP.POP);
          emitNode(node.right);
          code[jmpIdx][1] = code.length;
          break;
        }
        if (node.op === "||") {
          emitNode(node.left);
          emit(OP.DUP);
          const jmpIdx = code.length;
          emit(OP.JMPT, 0);
          emit(OP.POP);
          emitNode(node.right);
          code[jmpIdx][1] = code.length;
          break;
        }
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
          case "%":
            emit(OP.MOD);
            break;
          case "**":
            emit(OP.POW);
            break;
          case "==":
          case "===":
            emit(OP.EQ);
            break;
          case "!=":
          case "!==":
            emit(OP.NEQ);
            break;
          case "??":
            emit(OP.NULLCO);
            break;
          case "<":
            emit(OP.LT);
            break;
          case ">":
            emit(OP.GT);
            break;
          case "<=":
            emit(OP.LTE);
            break;
          case ">=":
            emit(OP.GTE);
            break;
          case "|":
            emit(OP.BIT_OR);
            break;
          case "&":
            emit(OP.BIT_AND);
            break;
          case "^":
            emit(OP.BIT_XOR);
            break;
          case "<<":
            emit(OP.BIT_SHL);
            break;
          case ">>":
            emit(OP.BIT_SHR);
            break;
          default:
            throw new Error(`Unknown binary operator in bytecode: ${node.op}`);
        }
        break;
      }
      case "Unary":
        emitNode(node.arg);
        if (node.op === "!") emit(OP.NOT);
        if (node.op === "-") {
          emit(OP.PUSH, 0);
          emit(OP.SWAP);
          emit(OP.SUB);
        }
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
        if (node.callee.type === "Ident" && node.callee.name === "grita-ae") {
          for (const arg of node.args) emitNode(arg);
          emit(OP.PRINT, node.args.length);
          break;
        }
        if (node.callee.type === "Ident" && node.callee.name === "sussurra") {
          for (const arg of node.args) emitNode(arg);
          emit(OP.WARN, node.args.length);
          break;
        }
        if (node.callee.type === "Ident" && node.callee.name === "tamanho") {
          for (const arg of node.args) emitNode(arg);
          emit(OP.LEN);
          break;
        }
        if (node.callee.type === "Member") {
          for (const arg of node.args) emitNode(arg);
          emitNode(node.callee.obj);
          emit(OP.PUSH, node.callee.prop);
          emit(OP.CALLMEMBER, node.args.length);
          break;
        }
        for (const arg of node.args) emitNode(arg);
        emitNode(node.callee);
        emit(OP.CALL, node.args.length);
        break;
      }
      case "Member":
        emitNode(node.obj);
        emit(OP.PUSH, node.prop);
        emit(OP.MEMBER);
        break;
      case "OptionalMember":
        emitNode(node.obj);
        emit(OP.PUSH, node.prop);
        emit(OP.OPTMEMBER);
        break;
      case "TypeOf":
        emitNode(node.arg);
        emit(OP.TYPEOF);
        break;
      case "InstanceOf":
        emitNode(node.arg);
        emitNode(node.cls);
        emit(OP.INSTANCEOF);
        break;
      case "MatchExpr": {
        emitNode(node.test);
        const endJumps = [];
        let nextCase = code.length;
        let sawFallback = false;
        for (const c of node.cases) {
          if (c.pattern === null) {
            sawFallback = true;
            emit(OP.POP);
            emitNode(c.body);
            const j = code.length;
            emit(OP.JMP, 0);
            endJumps.push(j);
            break;
          }
          emit(OP.DUP);
          emit(OP.DESTRUCTURE, c.pattern);
          emit(OP.DUP);
          const jmptIdx = code.length;
          emit(OP.JMPT, 0);
          emit(OP.POP);
          emit(OP.JMP, 0);
          const nextJmpIdx = code.length - 1;
          code[jmptIdx][1] = code.length;
          emit(OP.SCOPE_ENTER);
          emit(OP.POP);
          emitNode(c.body);
          emit(OP.SCOPE_EXIT);
          const j = code.length;
          emit(OP.JMP, 0);
          endJumps.push(j);
          nextCase = code.length;
          code[nextJmpIdx][1] = nextCase;
        }
        if (!sawFallback) {
          emit(OP.POP);
          emit(OP.PUSH, null);
        }
        const end = code.length;
        for (const j of endJumps) code[j][1] = end;
        break;
      }
      case "IndexExpr":
        emitNode(node.obj);
        emitNode(node.index);
        emit(OP.INDEX);
        break;
      case "ArrayExpr":
        emit(OP.ARR_INIT);
        for (const item of node.items) {
          if (item.type === "Spread") {
            emitNode(item.arg);
            emit(OP.ARR_SPREAD);
          } else {
            emitNode(item);
            emit(OP.ARR_APPEND);
          }
        }
        emit(OP.ARR_END);
        break;
      case "ObjectExpr":
        emit(OP.OBJ_INIT);
        for (const p of node.props) {
          if (p.spread) {
            emitNode(p.value);
            emit(OP.OBJ_SPREAD);
          } else {
            emit(OP.PUSH, p.key);
            emitNode(p.value);
            emit(OP.OBJ_SET);
          }
        }
        emit(OP.OBJ_END);
        break;
      default:
        throw new Error(`Bytecode compiler: node type "${node.type}" not supported`);
    }
  }
}
