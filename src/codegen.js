export function generate(node) {
  switch (node.type) {
    case "FunctionDecl":
      return `function ${node.name}(${node.params.join(",")}) ${generate(node.body)}`;
    case "ReturnStmt":
      return node.arg
        ? `return ${generate(node.arg)};`
        : `return;`;
    case "Program":
      return node.body.map(generate).join("\n");
    case "Block":
      return `{\n${node.body.map(generate).join("\n")}\n}`;
    case "VarDecl":
      return `let ${node.id} = ${generate(node.init)};`;
    case "ExportStmt":
      return `__exports["${node.name}"] = ${node.name};`;
    case "IfStmt":
      return `if (${generate(node.test)}) ${generate(node.cons)}`
        + (node.alt ? ` else ${generate(node.alt)}` : "");
    case "ForStmt":
      return `for (${genForInit(node.init)}; ${generate(node.test)}; ${generate(node.update)}) ${generate(node.body)}`;
    case "Assign":
      return `${generate(node.left)} = ${generate(node.right)}`;
    case "Binary":
      return `(${generate(node.left)} ${node.op} ${generate(node.right)})`;
    case "Unary":
      return `(${node.op}${generate(node.arg)})`;
    case "Call": {
      const callee = generate(node.callee);
      const args = node.args.map(generate).join(",");

      if (callee === "SOLTA_O_GRITO") {
        return `console.log(${args});`;
      }

      if (callee === "FALA_BAIXO") {
        return `console.warn(${args});`;
      }

      if (callee === "AGORA_VAI") {
        return `await __http(${args})`;
      }

      if (callee === "ESPERA_AI") {
        return `await __sleep(${args})`;
      }

      if (callee === "SORTEIA") {
        return `__randInt(${args})`;
      }

      if (callee === "PARSEIA") {
        return `JSON.parse(${args})`;
      }

      if (callee === "OUVE_AQUI") {
        return `__env(${args})`;
      }

      if (callee === "__IMPORT__") {
        return `await __require(${args})`;
      }

      return `${callee}(${args})`;
    }
    case "Member":
      return `${generate(node.obj)}.${node.prop}`;
    case "Ident":
      if (node.name === "SOLTA" || node.name === "FALA") { }
      return node.name;
    case "Num":
      return String(node.value);
    case "Str":
      return JSON.stringify(node.value);
    default:
      throw new Error("Node não suportado: " + node.type);
  }
}

function genForInit(init) {
  if (!init) return "";
  if (init.type === "VarDecl") {
    return `let ${init.id} = ${generate(init.init)}`.replace(/;$/, "");
  }
  return generate(init);
}