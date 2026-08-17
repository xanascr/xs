import * as A from "./ast.js";

const MAX_EXPANSION_DEPTH = 64;

export function expandMacros(node, macros, _depth = 0) {
  if (!node || typeof node !== "object") return node;
  if (!macros || macros.size === 0) return node;
  if (_depth > MAX_EXPANSION_DEPTH) {
    throw new Error(
      `Macro expansion exceeded ${MAX_EXPANSION_DEPTH} levels — possible infinite recursion`
    );
  }

  switch (node.type) {
    case "Program": {
      const collected = new Map();
      for (const stmt of node.body) {
        if (stmt.type === "MacroDecl") collected.set(stmt.name, stmt);
      }
      return expandInNode(
        {
          ...node,
          body: node.body
            .map((stmt) => {
              if (stmt.type === "MacroDecl") return null;
              return expandInNode(stmt, collected, _depth);
            })
            .filter(Boolean),
        },
        collected,
        _depth
      );
    }

    case "Block": {
      return {
        ...node,
        body: node.body.map((s) => expandInNode(s, macros, _depth)).filter(Boolean),
      };
    }

    case "VarDecl": {
      return { ...node, init: expandInNode(node.init, macros, _depth) };
    }

    case "Call": {
      if (node.callee.type === "Ident") {
        const macro = macros.get(node.callee.name);
        if (macro) return expandMacroCall(macro, node.args, macros, _depth);
      }
      return {
        ...node,
        callee: expandInNode(node.callee, macros, _depth),
        args: node.args.map((a) => expandInNode(a, macros, _depth)),
      };
    }

    case "Binary":
      return {
        ...node,
        left: expandInNode(node.left, macros, _depth),
        right: expandInNode(node.right, macros, _depth),
      };

    case "Unary":
      return { ...node, arg: expandInNode(node.arg, macros, _depth) };

    case "Assign":
      return { ...node, right: expandInNode(node.right, macros, _depth) };

    case "IfStmt":
      return {
        ...node,
        test: expandInNode(node.test, macros, _depth),
        cons: expandInNode(node.cons, macros, _depth),
        alt: node.alt ? expandInNode(node.alt, macros, _depth) : null,
      };

    case "ForStmt":
      return {
        ...node,
        init: node.init ? expandInNode(node.init, macros, _depth) : null,
        test: expandInNode(node.test, macros, _depth),
        update: node.update ? expandInNode(node.update, macros, _depth) : null,
        body: expandInNode(node.body, macros, _depth),
      };

    case "WhileStmt":
      return {
        ...node,
        test: expandInNode(node.test, macros, _depth),
        body: expandInNode(node.body, macros, _depth),
      };

    case "FunctionDecl":
      return { ...node, body: expandInNode(node.body, macros, _depth) };

    case "ReturnStmt":
      return { ...node, arg: node.arg ? expandInNode(node.arg, macros, _depth) : null };

    case "Ternary":
      return {
        ...node,
        test: expandInNode(node.test, macros, _depth),
        cons: expandInNode(node.cons, macros, _depth),
        alt: expandInNode(node.alt, macros, _depth),
      };

    case "ArrayExpr":
      return { ...node, items: node.items.map((i) => expandInNode(i, macros, _depth)) };

    case "ObjectExpr":
      return {
        ...node,
        props: node.props.map((p) => ({ ...p, value: expandInNode(p.value, macros, _depth) })),
      };

    case "Member":
      return { ...node, obj: expandInNode(node.obj, macros, _depth) };

    case "IndexExpr":
      return {
        ...node,
        obj: expandInNode(node.obj, macros, _depth),
        index: expandInNode(node.index, macros, _depth),
      };

    default:
      return node;
  }
}

function expandInNode(node, macros, depth) {
  if (!node || typeof node !== "object") return node;
  return expandMacros(node, macros, depth);
}

function expandMacroCall(macro, args, macros, depth) {
  const paramScope = {};
  macro.params.forEach((p, i) => {
    paramScope[p] = args[i] || A.Nil();
  });

  let expandedBody = replaceIdents(macro.body, paramScope);

  if (expandedBody.type === "Block" && expandedBody.body?.length === 1) {
    expandedBody = expandedBody.body[0];
  }

  return expandMacros(expandedBody, macros, depth + 1);
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
    return { ...node, body: node.body.map((s) => replaceIdents(s, scope)) };
  }

  const result = { ...node };
  for (const [key, val] of Object.entries(node)) {
    if (key === "type" || key === "loc") continue;
    if (Array.isArray(val)) {
      result[key] = val.map((v) => replaceIdents(v, scope));
    } else if (typeof val === "object" && val !== null) {
      result[key] = replaceIdents(val, scope);
    }
  }
  return result;
}
