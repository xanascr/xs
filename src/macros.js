import { lex } from "./lexer.js";
import { parse } from "./parser.js";
import * as A from "./ast.js";

export function expandMacros(node, macros) {
  if (!node || typeof node !== "object") return node;
  if (!macros || macros.size === 0) return node;

  switch (node.type) {
    case "Program": {

      const collected = new Map();
      for (const stmt of node.body) {
        if (stmt.type === "MacroDecl") {
          collected.set(stmt.name, stmt);
        }
      }

      return expandInNode({ ...node, body: node.body.map(stmt => {
        if (stmt.type === "MacroDecl") return null;
        return expandInNode(stmt, collected);
      }).filter(Boolean) }, collected);
    }

    case "Block": {
      return { ...node, body: node.body.map(s => expandInNode(s, macros)).filter(Boolean) };
    }

    case "VarDecl": {
      return { ...node, init: expandInNode(node.init, macros) };
    }

    case "Call": {

      if (node.callee.type === "Ident") {
        const macro = macros.get(node.callee.name);
        if (macro) {
          return expandMacroCall(macro, node.args, macros);
        }
      }
      return { ...node, callee: expandInNode(node.callee, macros), args: node.args.map(a => expandInNode(a, macros)) };
    }

    case "Binary":
      return { ...node, left: expandInNode(node.left, macros), right: expandInNode(node.right, macros) };

    case "Unary":
      return { ...node, arg: expandInNode(node.arg, macros) };

    case "Assign":
      return { ...node, right: expandInNode(node.right, macros) };

    case "IfStmt":
      return { ...node, test: expandInNode(node.test, macros), cons: expandInNode(node.cons, macros), alt: node.alt ? expandInNode(node.alt, macros) : null };

    case "ForStmt":
      return { ...node, init: node.init ? expandInNode(node.init, macros) : null, test: expandInNode(node.test, macros), update: node.update ? expandInNode(node.update, macros) : null, body: expandInNode(node.body, macros) };

    case "WhileStmt":
      return { ...node, test: expandInNode(node.test, macros), body: expandInNode(node.body, macros) };

    case "FunctionDecl":
      return { ...node, body: expandInNode(node.body, macros) };

    case "ReturnStmt":
      return { ...node, arg: node.arg ? expandInNode(node.arg, macros) : null };

    case "Ternary":
      return { ...node, test: expandInNode(node.test, macros), cons: expandInNode(node.cons, macros), alt: expandInNode(node.alt, macros) };

    case "ArrayExpr":
      return { ...node, items: node.items.map(i => expandInNode(i, macros)) };

    case "ObjectExpr":
      return { ...node, props: node.props.map(p => ({ ...p, value: expandInNode(p.value, macros) })) };

    case "Member":
      return { ...node, obj: expandInNode(node.obj, macros) };

    case "IndexExpr":
      return { ...node, obj: expandInNode(node.obj, macros), index: expandInNode(node.index, macros) };

    default:
      return node;
  }
}

function expandInNode(node, macros) {
  if (!node || typeof node !== "object") return node;
  return expandMacros(node, macros);
}

function expandMacroCall(macro, args, macros) {
  const paramScope = {};
  macro.params.forEach((p, i) => {
    paramScope[p] = args[i] || A.Nil();
  });

  let expandedBody = replaceIdents(macro.body, paramScope);

  if (expandedBody.type === "Block" && expandedBody.body?.length === 1) {
    expandedBody = expandedBody.body[0];
  }

  return expandMacros(expandedBody, macros);
}

function replaceIdents(node, scope) {
  if (!node || typeof node !== "object") return node;

  if (node.type === "Ident") {
    if (scope[node.name] !== undefined) {
      return scope[node.name];
    }
    return node;
  }

  if (Array.isArray(node.body)) {
    return { ...node, body: node.body.map(s => replaceIdents(s, scope)) };
  }

  const result = { ...node };
  for (const [key, val] of Object.entries(node)) {
    if (key === "type" || key === "loc") continue;
    if (Array.isArray(val)) {
      result[key] = val.map(v => replaceIdents(v, scope));
    } else if (typeof val === "object" && val !== null) {
      result[key] = replaceIdents(val, scope);
    }
  }
  return result;
}
