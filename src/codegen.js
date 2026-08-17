export function generate(node) {
  switch (node.type) {
    case "TypeDecl":
      return "";
    case "FunctionDecl":
      return `function ${node.name}(${node.params.join(",")}) ${generate(node.body)}`;
    case "ReturnStmt":
      return node.arg ? `return ${generate(node.arg)};` : `return;`;
    case "Program":
      return node.body.map(generate).join("\n");
    case "Block":
      return `{\n${node.body.map(generate).join("\n")}\n}`;
    case "VarDecl":
      return `${node.kind === "const" ? "const" : node.kind === "global" ? "var" : "let"} ${node.id} = ${generate(node.init)};`;
    case "ExportStmt":
      return `__exports["${node.name}"] = ${node.name};`;
    case "IfStmt":
      return (
        `if (${generate(node.test)}) ${generate(node.cons)}` +
        (node.alt ? ` else ${generate(node.alt)}` : "")
      );
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
      if (callee === "grita-ae") {
        return `console.log(${args});`;
      }
      if (callee === "sussurra") {
        return `console.warn(${args});`;
      }
      if (callee === "stalkeia") {
        return `await __http(${args})`;
      }
      if (callee === "aguenta-ai") {
        return `await __sleep(${args})`;
      }
      if (callee === "escolhe") {
        return `__randInt(${args})`;
      }
      if (callee === "desembola") {
        return `JSON.parse(${args})`;
      }
      if (callee === "bisbilhota") {
        return `__env(${args})`;
      }
      if (callee === "__IMPORT__") {
        return `await __require(${args})`;
      }
      if (callee === "tamanho") return `${args[0]}.length`;
      if (callee === "divide-texto") return `${args[0]}.split(${args[1]})`;
      if (callee === "encontra") return `${args[0]}.match(new RegExp(${args[1]}))`;
      if (callee === "decodifica-url") return `decodeURIComponent(${args[0]})`;
      if (callee === "juntar") return `${args[0]}.join(${args[1]})`;
      if (callee === "horinha") return `Date.now()`;
      if (callee === "traduz-ai") return `String(${args[0]})`;
      return `${callee}(${args})`;
    }
    case "Member":
      return `${generate(node.obj)}.${node.prop}`;
    case "OptionalMember":
      return `${generate(node.obj)}?.${node.prop}`;
    case "TypeOf":
      return `__typeOf(${generate(node.arg)})`;
    case "InstanceOf":
      return `(${generate(node.arg)} instanceof ${generate(node.cls)})`;
    case "Spread":
      return `...${generate(node.arg)}`;
    case "Ident":
      if (node.name === "grita-ae") return "console.log";
      if (node.name === "sussurra") return "console.warn";
      return node.name;
    case "Num":
      return String(node.value);
    case "Str":
      return JSON.stringify(node.value);
    case "Bool":
      return node.value ? "true" : "false";
    case "Nil":
      return "null";
    case "ArrayExpr":
      return `[${node.items.map(generate).join(",")}]`;
    case "ObjectExpr":
      return `{${node.props.map((p) => (p.spread ? `...${generate(p.value)}` : `${p.key}:${generate(p.value)}`)).join(",")}}`;
    case "IndexExpr":
      return `${generate(node.obj)}[${generate(node.index)}]`;
    case "ImportExpr":
      return `await __require(${JSON.stringify(node.path)})`;
    case "ImportStmt":
      return `await __require(${JSON.stringify(node.path)});`;
    case "TryCatchStmt":
      return `try ${generate(node.tryBlock)} catch(${node.catchParam}) ${generate(node.catchBlock)}`;
    case "WhileStmt":
      return `while(${generate(node.test)}) ${generate(node.body)}`;
    case "BreakStmt":
      return `break;`;
    case "ContinueStmt":
      return `continue;`;
    case "Ternary":
      return `(${generate(node.test)}?${generate(node.cons)}:${generate(node.alt)})`;
    case "ThisExpr":
      return `this`;
    default:
      throw new Error("Unsupported node: " + node.type);
  }
}

function genForInit(init) {
  if (!init) return "";
  if (init.type === "VarDecl") {
    return `let ${init.id} = ${generate(init.init)}`.replace(/;$/, "");
  }
  return generate(init);
}
