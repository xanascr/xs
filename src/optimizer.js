import { expandMacros } from "./macros.js";

function collectMacros(node) {
  const macros = new Map();
  if (!node || node.type !== "Program") return macros;
  for (const stmt of node.body) {
    if (stmt.type === "MacroDecl") {
      macros.set(stmt.name, stmt);
    }
  }
  return macros;
}

export function optimize(node) {

  const macros = collectMacros(node);

  if (macros.size > 0) {
    node = expandMacros(node, macros);
  }

  if (!node || typeof node !== "object") return node;

  switch (node.type) {

    case "Program": {
      node.body = node.body.map(s => optimize(s)).filter(Boolean);
      return node;
    }

    case "Block": {
      node.body = node.body.map(s => optimize(s)).filter(Boolean);
      return node;
    }

    case "VarDecl": {
      if (node.init) node.init = optimize(node.init);
      return node;
    }

    case "Assign": {
      node.right = optimize(node.right);
      return node;
    }

    case "IfStmt": {
      node.test = optimize(node.test);
      node.cons = optimize(node.cons);
      if (node.alt) node.alt = optimize(node.alt);
      if (node.test.type === "Bool") {
        if (node.test.value === true) return node.cons;
        if (node.test.value === false) return node.alt || { type: "Nil" };
      }
      return node;
    }

    case "ForStmt": {
      if (node.init) node.init = optimize(node.init);
      node.test = optimize(node.test);
      if (node.update) node.update = optimize(node.update);
      node.body = optimize(node.body);
      return node;
    }

    case "WhileStmt": {
      node.test = optimize(node.test);
      node.body = optimize(node.body);
      return node;
    }

    case "FunctionDecl": {
      node.body = optimize(node.body);
      return node;
    }

    case "ReturnStmt": {
      if (node.arg) node.arg = optimize(node.arg);
      return node;
    }

    case "Ternary": {
      node.test = optimize(node.test);
      node.cons = optimize(node.cons);
      node.alt = optimize(node.alt);
      if (node.test.type === "Bool") {
        return node.test.value ? node.cons : node.alt;
      }
      return node;
    }

    case "Call": {
      node.callee = optimize(node.callee);
      node.args = node.args.map(a => optimize(a));
      return node;
    }

    case "Unary": {
      node.arg = optimize(node.arg);
      if (node.arg.type === "Num" && node.op === "-") {
        return { type: "Num", value: -node.arg.value };
      }
      if (node.arg.type === "Num" && node.op === "~") {
        return { type: "Num", value: ~node.arg.value };
      }
      if (node.arg.type === "Bool" && node.op === "!") {
        return { type: "Bool", value: !node.arg.value };
      }
      return node;
    }

    case "Binary": {
      node.left = optimize(node.left);
      node.right = optimize(node.right);

      const isBothNum = node.left.type === "Num" && node.right.type === "Num";
      const isBothBool = node.left.type === "Bool" && node.right.type === "Bool";

      if (isBothNum) {
        switch (node.op) {
          case "+": return { type: "Num", value: node.left.value + node.right.value };
          case "-": return { type: "Num", value: node.left.value - node.right.value };
          case "*": return { type: "Num", value: node.left.value * node.right.value };
          case "/": return { type: "Num", value: node.left.value / node.right.value };
          case "%": return { type: "Num", value: node.left.value % node.right.value };
          case "==": return { type: "Bool", value: node.left.value === node.right.value };
          case "!=": return { type: "Bool", value: node.left.value !== node.right.value };
          case ">": return { type: "Bool", value: node.left.value > node.right.value };
          case "<": return { type: "Bool", value: node.left.value < node.right.value };
          case ">=": return { type: "Bool", value: node.left.value >= node.right.value };
          case "<=": return { type: "Bool", value: node.left.value <= node.right.value };
          case "|": return { type: "Num", value: node.left.value | node.right.value };
          case "&": return { type: "Num", value: node.left.value & node.right.value };
          case "^": return { type: "Num", value: node.left.value ^ node.right.value };
          case "<<": return { type: "Num", value: node.left.value << node.right.value };
          case ">>": return { type: "Num", value: node.left.value >> node.right.value };
        }
      }

      if (isBothBool) {
        switch (node.op) {
          case "==": return { type: "Bool", value: node.left.value === node.right.value };
          case "!=": return { type: "Bool", value: node.left.value !== node.right.value };
          case "&&": return { type: "Bool", value: node.left.value && node.right.value };
          case "||": return { type: "Bool", value: node.left.value || node.right.value };
        }
      }

      if (node.op === "+" && node.right.type === "Num" && node.right.value === 0) return node.left;
      if (node.op === "+" && node.left.type === "Num" && node.left.value === 0) return node.right;
      if (node.op === "*" && node.right.type === "Num" && node.right.value === 1) return node.left;
      if (node.op === "*" && node.left.type === "Num" && node.left.value === 1) return node.right;
      if (node.op === "*" && (node.right.type === "Num" && node.right.value === 0)) return { type: "Num", value: 0 };
      if (node.op === "*" && (node.left.type === "Num" && node.left.value === 0)) return { type: "Num", value: 0 };

      return node;
    }

    case "Member":
    case "IndexExpr": {
      node.obj = optimize(node.obj);
      if (node.index) node.index = optimize(node.index);
      return node;
    }

    case "ArrayExpr": {
      node.items = node.items.map(i => optimize(i));
      return node;
    }

    case "ObjectExpr": {
      node.props = node.props.map(p => ({ key: p.key, value: optimize(p.value) }));
      return node;
    }

    case "TryCatchStmt": {
      node.tryBlock = optimize(node.tryBlock);
      node.catchBlock = optimize(node.catchBlock);
      return node;
    }

    default: return node;
  }
}
