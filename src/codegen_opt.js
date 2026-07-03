export function generateOpt(node, types = {}, opts = {}) {
  const unroll = opts.unroll !== false;

  switch (node.type) {

    case "Program": {
      const body = node.body.filter(s => s.type !== "ExportStmt");
      return body.map(n => {
        sm(n.loc?.start?.line);
        return generateOpt(n, types, opts);
      }).join("\n");
    }

    case "Block":
      return `{\n${node.body.filter(s => s.type !== "ExportStmt").map(n => "  " + generateOpt(n, types, opts)).join("\n")}\n}`;

    case "VarDecl": {
      const init = generateOpt(node.init, types, opts);

      if (node.init?.type === "ArrayExpr" && node.init.items.every(i => i.type === "Num")) {
        const items = node.init.items.map(i => generateOpt(i, types, opts)).join(",");
        return `let ${node.id}=new Float64Array([${items}])`;
      }

      return `let ${node.id}=${init}`;
    }

    case "Assign": {
      if (node.left.type === "Member") {
        return `${generateOpt(node.left.obj, types, opts)}.${node.left.prop}=${generateOpt(node.right, types, opts)}`;
      }
      if (node.left.type === "IndexExpr") {
        return `${generateOpt(node.left.obj, types, opts)}[${generateOpt(node.left.index, types, opts)}]=${generateOpt(node.right, types, opts)}`;
      }
      return `${node.left.name}=${generateOpt(node.right, types, opts)}`;
    }

    case "IfStmt": {
      const t = generateOpt(node.test, types, opts);
      return `if(${t})${generateOpt(node.cons, types, opts)}${node.alt ? `else${generateOpt(node.alt, types, opts)}` : ""}`;
    }

    case "ForStmt": {
      const test = generateOpt(node.test, types, opts);
      const update = node.update ? generateOpt(node.update, types, opts) : "";

      if (unroll && canUnroll(node)) {
        return unrollLoop(node, types, opts);
      }

      if (node.init?.type === "VarDecl") {
        return `for(let ${node.init.id}=${generateOpt(node.init.init, types, opts)};${test};${update})${generateOpt(node.body, types, opts)}`;
      }
      return `for(${node.init ? generateOpt(node.init, types, opts) : ""};${test};${update})${generateOpt(node.body, types, opts)}`;
    }

    case "WhileStmt":
      return `while(${generateOpt(node.test, types, opts)})${generateOpt(node.body, types, opts)}`;

    case "FunctionDecl":
      return `function ${node.name}(${node.params.join(",")})${generateOpt(node.body, types, opts)}`;

    case "ReturnStmt":
      return node.arg ? `return ${generateOpt(node.arg, types, opts)}` : "return";

    case "Call": {
      const args = node.args.map(a => generateOpt(a, types, opts)).join(",");
      const callee = generateOpt(node.callee, types, opts);

      if (callee === "SOLTA_O_GRITO") return `console.log(${args})`;
      if (callee === "FALA_BAIXO") return `console.warn(${args})`;
      if (callee === "AGORA_VAI") return `(await __http(${args}))`;
      if (callee === "ESPERA_AI") return `(await __sleep(${args}))`;
      if (callee === "SORTEIA") return `__randInt(${args})`;
      if (callee === "PARSEIA") return `JSON.parse(${args})`;
      if (callee === "OUVE_AQUI") return `__env(${args})`;
      if (callee === "TAMANHO") return `${args}.length`;
      if (callee === "DIVIDE_TEXTO") return `${args[0]}.split(${args[1]})`;
      if (callee === "ENCONTRA") return `${args[0]}.match(new RegExp(${args[1]}))`;
      if (callee === "DECODIFICA_URL") return `decodeURIComponent(${args[0]})`;
      if (callee === "JUNTAR") return `${args[0]}.join(${args[1]})`;
      if (callee === "AGORA") return `Date.now()`;
      if (callee === "CRIA_SERVIDOR") return `__createServer(${args[0]},${args[1]})`;
      if (callee === "PARA_SERVIDOR") return `__stopServer(${args[0]})`;

      return `${callee}(${args})`;
    }

    case "Member":
      return `${generateOpt(node.obj, types, opts)}.${node.prop}`;

    case "IndexExpr":
      return `${generateOpt(node.obj, types, opts)}[${generateOpt(node.index, types, opts)}]`;

    case "Binary": {
      const l = generateOpt(node.left, types, opts);
      const r = generateOpt(node.right, types, opts);

      const op = { "~=": "~=" }[node.op] || node.op;

      const lt = typeOf(node.left, types);
      const rt = typeOf(node.right, types);

      if (lt === "NUM" && rt === "NUM" && ["+", "-", "*"].includes(op)) {
        return `((${l}${op}${r})|0)`;
      }

      if (op === "~=") return `(new RegExp(${r}).test(${l}))`;

      return `(${l}${op}${r})`;
    }

    case "Unary":
      return `${node.op}${generateOpt(node.arg, types, opts)}`;

    case "Ternary":
      return `(${generateOpt(node.test, types, opts)}?${generateOpt(node.cons, types, opts)}:${generateOpt(node.alt, types, opts)})`;

    case "Ident":
      return node.name;

    case "Num":
      return String(node.value);

    case "Str":
      return JSON.stringify(node.value);

    case "Bool":
      return node.value ? "1" : "0";

    case "Nil":
      return "null";

    case "ArrayExpr":
      return `[${node.items.map(i => generateOpt(i, types, opts)).join(",")}]`;

    case "ObjectExpr":
      return `{${node.props.map(p => `${p.key}:${generateOpt(p.value, types, opts)}`).join(",")}}`;

    case "ImportExpr":
      return `(await __require(${JSON.stringify(node.path)}))`;
    case "ImportStmt":
      return `await __require(${JSON.stringify(node.path)})`;

    case "TryCatchStmt":
      return `try${generateOpt(node.tryBlock, types, opts)}catch(${node.catchParam})${generateOpt(node.catchBlock, types, opts)}`;

    case "BreakStmt":
      return "break";
    case "ContinueStmt":
      return "continue";

    case "ClassDecl": {
      const parent = node.superClass ? ` extends ${node.superClass}` : "";
      const methods = node.methods.map(m => {
        if (m.isConstructor) {
          return `constructor(${m.params.join(",")})${generateOpt(m.body, types, opts)}`;
        }
        return `${m.name}(${m.params.join(",")})${generateOpt(m.body, types, opts)}`;
      }).join("\n");
      return `class ${node.name}${parent}{\n${methods}\n}`;
    }

    case "ThisExpr":
      return "this";

    case "NewExpr": {
      const args = node.args.map(a => generateOpt(a, types, opts)).join(",");
      return `new ${generateOpt(node.callee, types, opts)}(${args})`;
    }

    case "SwitchStmt": {
      const cases = node.cases.map(c => {
        if (c.test === null) return `default:\n  ${generateOpt(c.body, types, opts)}`;
        return `case ${generateOpt(c.test, types, opts)}:\n  ${generateOpt(c.body, types, opts)}`;
      }).join("\n");
      return `switch(${generateOpt(node.test, types, opts)}){\n${cases}\n}`;
    }

    case "MatchExpr": {
      const cases = node.cases.map(c => {
        if (c.pattern === null) return `default:${generateOpt(c.body, types, opts)}`;
        return `case ${patternToJS(c.pattern, generateOpt(node.test, types, opts))}:\n  ${generateOpt(c.body, types, opts)}`;
      }).join("\n");
      return `switch(true){\n${cases}\n}`;
    }

    default:
      return ``;
  }
}

function patternToJS(pattern, valueExpr) {
  switch (pattern.type) {
    case "PatternLiteral":
      return `(${valueExpr}===${JSON.stringify(pattern.value)})`;
    case "PatternIdent":
      if (pattern.name === "_") return `true`;
      return `(${valueExpr}!==undefined&&true)`;
    case "PatternArray":
      return `(Array.isArray(${valueExpr})&&${pattern.elements.map((el, i) => {
        if (el.type === "PatternRest") return `${valueExpr}.length>=${i}`;
        return patternToJS(el, `${valueExpr}[${i}]`);
      }).join("&&")})`;
    case "PatternObject":
      return `(typeof ${valueExpr}==="object"&&${valueExpr}!==null&&${pattern.props.map(p =>
        `(${p.key} in ${valueExpr})&&${patternToJS(p.pattern, `${valueExpr}.${p.key}`)}`
      ).join("&&")})`;
    default:
      return `true`;
  }
}

function canUnroll(forNode) {
  if (!forNode.test || forNode.test.type !== "Binary") return false;
  if (forNode.test.left?.type !== "Ident") return false;
  if (forNode.test.right?.type !== "Num") return false;
  const limit = forNode.test.right.value;
  return typeof limit === "number" && limit >= 1 && limit <= 8;
}

function unrollLoop(forNode, types, opts) {
  const varName = forNode.test.left.name;
  const limit = forNode.test.right.value;
  const body = forNode.body;

  const stmts = [];
  for (let i = 0; i < limit; i++) {
    const iterStmts = [];
    for (const stmt of body.body) {
      iterStmts.push(expandStmt(stmt, varName, i, types, opts));
    }

    stmts.push("{\n" + iterStmts.map(s => "    " + s).join("\n") + "\n  }");
  }
  return `{\n${stmts.map(s => "  " + s).join("\n")}\n}`;
}

function expandStmt(node, varName, value, types, opts) {
  const replace = (n) => {
    if (!n || typeof n !== "object") return n;
    if (n.type === "Ident" && n.name === varName) {
      return { type: "Num", value };
    }
    const clone = { ...n };
    for (const k of Object.keys(clone)) {
      if (k === "type") continue;
      if (Array.isArray(clone[k])) {
        clone[k] = clone[k].map(ell => replace(ell));
      } else if (typeof clone[k] === "object" && clone[k] !== null) {
        clone[k] = replace(clone[k]);
      }
    }
    return clone;
  };
  return generateOpt(replace(node), types, opts) + ";";
}

function countNodes(node) {
  if (!node || typeof node !== "object") return 0;
  let count = 1;
  for (const k of Object.keys(node)) {
    if (k === "type") continue;
    if (Array.isArray(node[k])) {
      for (const el of node[k]) count += countNodes(el);
    } else if (typeof node[k] === "object" && node[k] !== null) {
      count += countNodes(node[k]);
    }
  }
  return count;
}

export function inferTypes(ast) {
  const types = {};
  walkTypes(ast, types);
  return types;
}

function walkTypes(node, types) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { node.forEach(n => walkTypes(n, types)); return; }

  if (node.type === "VarDecl") {
    if (node.typeHint) {
      types[node.id] = node.typeHint;
    } else if (node.init) {
      const t = typeOf(node.init, types);
      if (t) types[node.id] = t;
    }
  }

  if (node.type === "Assign") {
    if (node.left.type === "Ident") {
      const t = typeOf(node.right, types);
      if (t) types[node.left.name] = t;
    }
  }

  for (const key of Object.keys(node)) {
    if (key === "type") continue;
    walkTypes(node[key], types);
  }
}

function typeOf(node, types) {
  switch (node.type) {
    case "Num": return "NUM";
    case "Str": return "STR";
    case "Bool": return "BOOL";
    case "Nil": return "NIL";
    case "ArrayExpr": return "ARR";
    case "ObjectExpr": return "OBJ";
    case "Ident":
      if (node.name in types) return types[node.name];
      return null;
    case "Binary": {
      const lt = typeOf(node.left, types);
      const rt = typeOf(node.right, types);
      if (lt === "NUM" && rt === "NUM") return "NUM";
      if (node.op === "+" && (lt === "STR" || rt === "STR")) return "STR";
      if (["==", "!=", "~=", ">", "<", ">=", "<=", "&&", "||"].includes(node.op)) return "BOOL";
      return null;
    }
    case "Unary": {
      if (node.op === "!") return "BOOL";
      if (node.op === "-") return "NUM";
      return null;
    }
    case "Call": {
      if (node.callee.type === "Ident") {
        if (node.callee.name === "SORTEIA") return "NUM";
        if (node.callee.name === "PARSEIA") return "OBJ";
        if (node.callee.name === "AGORA_VAI") return "OBJ";
        if (node.callee.name === "OUVE_AQUI") return "STR";
        if (node.callee.name === "TAMANHO") return "NUM";
        if (node.callee.name === "ENCONTRA") return "OBJ";
        if (node.callee.name === "JUNTAR") return "STR";
        if (node.callee.name === "AGORA") return "NUM";
      }
      return null;
    }
    case "Ternary": {
      const ct = typeOf(node.cons, types);
      const at = typeOf(node.alt, types);
      if (ct && ct === at) return ct;
      return null;
    }
    case "Member": return "OBJ";
    case "IndexExpr": return "OBJ";
    default: return null;
  }
}
