export function generateWasm(ast) {
  const ctx = {
    vars: new Map(),
    varCount: 0,
    functions: new Map(),
    funcCount: 0,
    imports: new Map(),
    importCount: 0,
    stringPool: [],
    wasm: [],
    _mainEmitted: false,
  };

  collectDeclarations(ast, ctx);

  ctx.wasm.push(`(module`);

  for (const [name, imp] of ctx.imports) {
    ctx.wasm.push(`  (import "env" "${imp.jsName}" (func $${name} ${imp.params} ${imp.result}))`);
  }

  ctx.wasm.push(`  (memory (export "memory") 1)`);
  ctx.wasm.push(`  (global $__sp (mut i32) (i32.const 0))`);

  if (ctx.stringPool.length > 0) {
    ctx.wasm.push(`  (data (i32.const 0) "${ctx.stringPool.join("")}")`);
  }

  emitFunctions(ast, ctx);

  if (!ctx._mainEmitted) {
    emitWasmFunction("main", [], "i32", ast, ctx);
    ctx._mainEmitted = true;
  }

  ctx.wasm.push(`)`);

  return ctx.wasm.join("\n");
}

function collectDeclarations(node, ctx) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => collectDeclarations(n, ctx));
    return;
  }

  if (node.type === "VarDecl") {
    if (!ctx.vars.has(node.id)) {
      ctx.vars.set(node.id, { index: ctx.varCount++, type: "i32" });
    }
  }

  if (node.type === "FunctionDecl") {
    ctx.functions.set(node.name, { params: node.params || [], hasBody: true });
  }

  if (node.type === "Call" && node.callee?.type === "Ident") {
    const name = node.callee.name;
    if (["grita-ae", "sussurra", "escolhe", "desembola"].includes(name)) {
      if (!ctx.imports.has(name)) {
        const jsMap = {
          "grita-ae": { jsName: "log", params: "(param i32)", result: "(result i32)" },
          sussurra: { jsName: "warn", params: "(param i32)", result: "(result i32)" },
          escolhe: { jsName: "randInt", params: "(param i32)(param i32)", result: "(result i32)" },
          desembola: { jsName: "parseJSON", params: "(param i32)", result: "(result i32)" },
        };
        ctx.imports.set(name, jsMap[name]);
      }
    }
  }

  for (const k of Object.keys(node)) {
    if (k === "type") continue;
    collectDeclarations(node[k], ctx);
  }
}

function emitFunctions(node, ctx) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => emitFunctions(n, ctx));
    return;
  }

  if (node.type === "FunctionDecl") {
    const params = node.params.map(() => "i32").join(" ");
    emitWasmFunction(node.name, node.params, "i32", node.body, ctx);
  }

  if (node.type === "Program") {
    if (!ctx._mainEmitted) {
      emitWasmFunction("main", [], "i32", node, ctx);
      ctx._mainEmitted = true;
    }
  }

  for (const k of Object.keys(node)) {
    if (k === "type" || k === "body") continue;
    emitFunctions(node[k], ctx);
  }

  if (node.type === "Block" || node.type === "Program") {
  }
}

function emitWasmFunction(name, params, result, body, ctx) {
  ctx.wasm.push(
    `  (func $${name} (export "${name}")${params.length ? " (param " + params.map(() => "i32").join(" ") + ")" : ""} (result ${result})`
  );
  ctx.wasm.push(`    (local $__ret i32)`);

  for (const [vname, v] of ctx.vars) {
    ctx.wasm.push(`    (local $${vname} i32)`);
  }

  ctx.wasm.push(`    (block $__exit`);
  emitWasmCode(body, ctx);
  ctx.wasm.push(`    )`);

  ctx.wasm.push(`    local.get $__ret`);

  ctx.wasm.push(`  )`);
}

function emitWasmCode(node, ctx) {
  if (!node || typeof node !== "object") return;

  switch (node.type) {
    case "Program":
      node.body.forEach((n) => emitWasmCode(n, ctx));
      break;

    case "Block":
      node.body.forEach((n) => emitWasmCode(n, ctx));
      break;

    case "VarDecl": {
      emitWasmCode(node.init, ctx);
      ctx.wasm.push(`    local.set $${node.id}`);
      break;
    }

    case "Assign": {
      if (node.left?.type === "Ident") {
        emitWasmCode(node.right, ctx);
        ctx.wasm.push(`    local.set $${node.left.name}`);
      }
      break;
    }

    case "Num": {
      ctx.wasm.push(`    i32.const ${node.value | 0}`);
      break;
    }

    case "Ident": {
      if (ctx.vars.has(node.name)) {
        ctx.wasm.push(`    local.get $${node.name}`);
      } else if (node.name === "verdadeiro") {
        ctx.wasm.push(`    i32.const 1`);
      } else if (node.name === "falso") {
        ctx.wasm.push(`    i32.const 0`);
      } else {
        ctx.wasm.push(`    unreachable`);
        ctx.wasm.push(`    i32.const 0`);
      }
      break;
    }

    case "Binary": {
      emitWasmCode(node.left, ctx);
      emitWasmCode(node.right, ctx);

      if (node.op === "&&") {
        ctx.wasm.push(`    if (result i32)`);
        emitWasmCode(node.left, ctx);
        ctx.wasm.push(`    else`);
        ctx.wasm.push(`      i32.const 0`);
        ctx.wasm.push(`    end`);
        ctx.wasm.push(`    if (result i32)`);
        emitWasmCode(node.right, ctx);
        ctx.wasm.push(`    else`);
        ctx.wasm.push(`      i32.const 0`);
        ctx.wasm.push(`    end`);
        break;
      }
      if (node.op === "||") {
        emitWasmCode(node.left, ctx);
        ctx.wasm.push(`    if (result i32)`);
        emitWasmCode(node.left, ctx);
        ctx.wasm.push(`    else`);
        emitWasmCode(node.right, ctx);
        ctx.wasm.push(`    end`);
        break;
      }

      const opMap = {
        "+": "i32.add",
        "-": "i32.sub",
        "*": "i32.mul",
        "/": "i32.div_s",
        "%": "i32.rem_s",
        "==": "i32.eq",
        "!=": "i32.ne",
        ">": "i32.gt_s",
        "<": "i32.lt_s",
        ">=": "i32.ge_s",
        "<=": "i32.le_s",
        "|": "i32.or",
        "&": "i32.and",
        "^": "i32.xor",
        "<<": "i32.shl",
        ">>": "i32.shr_s",
      };

      if (opMap[node.op]) {
        ctx.wasm.push(`    ${opMap[node.op]}`);
      }
      break;
    }

    case "Unary": {
      emitWasmCode(node.arg, ctx);
      if (node.op === "-") {
        ctx.wasm.push(`    i32.const -1`);
        ctx.wasm.push(`    i32.mul`);
      }
      if (node.op === "!") {
        ctx.wasm.push(`    i32.eqz`);
      }
      if (node.op === "~") {
        ctx.wasm.push(`    i32.const -1`);
        ctx.wasm.push(`    i32.xor`);
      }
      break;
    }

    case "IfStmt": {
      emitWasmCode(node.test, ctx);
      ctx.wasm.push(`    if`);
      emitWasmCode(node.cons, ctx);
      if (node.alt) {
        ctx.wasm.push(`    else`);
        emitWasmCode(node.alt, ctx);
      }
      ctx.wasm.push(`    end`);
      break;
    }

    case "ForStmt": {
      if (node.init) emitWasmCode(node.init, ctx);
      ctx.wasm.push(`    block $__break`);
      ctx.wasm.push(`    loop $__continue`);
      emitWasmCode(node.test, ctx);
      ctx.wasm.push(`    i32.eqz`);
      ctx.wasm.push(`    br_if $__break`);
      emitWasmCode(node.body, ctx);
      if (node.update) emitWasmCode(node.update, ctx);
      ctx.wasm.push(`    br $__continue`);
      ctx.wasm.push(`    end`);
      ctx.wasm.push(`    end`);
      break;
    }

    case "WhileStmt": {
      ctx.wasm.push(`    block $__break`);
      ctx.wasm.push(`    loop $__continue`);
      emitWasmCode(node.test, ctx);
      ctx.wasm.push(`    i32.eqz`);
      ctx.wasm.push(`    br_if $__break`);
      emitWasmCode(node.body, ctx);
      ctx.wasm.push(`    br $__continue`);
      ctx.wasm.push(`    end`);
      ctx.wasm.push(`    end`);
      break;
    }

    case "ReturnStmt": {
      if (node.arg) {
        emitWasmCode(node.arg, ctx);
        ctx.wasm.push(`    local.set $__ret`);
      }
      ctx.wasm.push(`    br $__exit`);
      break;
    }

    case "BreakStmt":
      ctx.wasm.push(`    br $__break`);
      break;

    case "ContinueStmt":
      ctx.wasm.push(`    br $__continue`);
      break;

    case "Call": {
      if (node.callee?.type === "Ident") {
        const name = node.callee.name;

        if (ctx.imports.has(name)) {
          for (const arg of node.args) emitWasmCode(arg, ctx);
          ctx.wasm.push(`    call $${name}`);
          break;
        }

        if (ctx.functions.has(name)) {
          for (const arg of node.args) emitWasmCode(arg, ctx);
          ctx.wasm.push(`    call $${name}`);
          break;
        }
      }
      break;
    }

    case "Ternary": {
      emitWasmCode(node.test, ctx);
      ctx.wasm.push(`    if (result i32)`);
      emitWasmCode(node.cons, ctx);
      ctx.wasm.push(`    else`);
      emitWasmCode(node.alt, ctx);
      ctx.wasm.push(`    end`);
      break;
    }

    case "Bool":
      ctx.wasm.push(`    i32.const ${node.value ? 1 : 0}`);
      break;

    case "Nil":
      ctx.wasm.push(`    i32.const 0`);
      break;
  }
}

const STRING_BASE = 0x4000;
let WASM_MEMORY = null;
let MEMORY_SIZE = 0;

export function setWasmMemory(mem) {
  WASM_MEMORY = mem;
  MEMORY_SIZE = mem ? mem.buffer.byteLength : 0;
}

function isStringPtr(n) {
  return typeof n === "number" && n >= STRING_BASE && n < MEMORY_SIZE;
}

export function readMemString(ptr) {
  if (!WASM_MEMORY) return "";
  const view = new Uint8Array(WASM_MEMORY.buffer);
  let end = ptr;
  while (end < MEMORY_SIZE && end < view.length && view[end] !== 0) end++;
  return new TextDecoder().decode(view.subarray(ptr, end));
}

export function getWasmRuntime() {
  const log = (n) => {
    console.log(isStringPtr(n) ? readMemString(n) : n);
    return n;
  };
  const warn = (n) => {
    console.warn(isStringPtr(n) ? readMemString(n) : n);
    return n;
  };
  const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const parseJSON = (s) => {
    try {
      const str = isStringPtr(s) ? readMemString(s) : s;
      return Number(JSON.parse(str));
    } catch {
      return 0;
    }
  };
  const horinha = () => Date.now();
  const pow = (a, b) => Math.pow(a, b);
  const tamanho = (n) =>
    isStringPtr(n) ? readMemString(n).length : typeof n === "number" ? n : (n?.length ?? 0);
  return {
    log,
    warn,
    randInt,
    parseJSON,
    horinha,
    pow,
    tamanho,
    "grita-ae": log,
    sussurra: warn,
    escolhe: randInt,
    desembola: parseJSON,
  };
}

export function getDefaultExports() {
  return {
    env: getWasmRuntime(),
  };
}
