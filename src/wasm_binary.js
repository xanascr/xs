const MAGIC = new Uint8Array([0x00, 0x61, 0x73, 0x6d]);
const VERSION = new Uint8Array([0x01, 0x00, 0x00, 0x00]);

const SECTION = {
  TYPE: 1, IMPORT: 2, FUNC: 3, MEMORY: 5,
  GLOBAL: 6, EXPORT: 7, CODE: 10, DATA: 11,
};

const TYPES = { i32: 0x7f, i64: 0x7e, f32: 0x7d, f64: 0x7c };

function leb128u(value) {
  const bytes = [];
  do {
    let byte = value & 0x7f;
    value >>>= 7;
    if (value !== 0) byte |= 0x80;
    bytes.push(byte);
  } while (value !== 0);
  return bytes;
}

function leb128s(value) {
  const bytes = [];
  let more = true;
  while (more) {
    let byte = value & 0x7f;
    value >>= 7;
    if ((value === 0 && (byte & 0x40) === 0) || (value === -1 && (byte & 0x40) !== 0)) {
      more = false;
    } else {
      byte |= 0x80;
    }
    bytes.push(byte);
  }
  return bytes;
}

function encodeVector(items) {
  const all = [];
  all.push(...leb128u(items.length));
  for (const item of items) {
    all.push(...item);
  }
  return all;
}

class WasmBuilder {
  constructor() {
    this.types = [];
    this.imports = [];
    this.functions = [];
    this.exports = [];
    this.codes = [];
    this.memories = [];
    this.globals = [];
    this.dataSegments = [];
    this.strings = [];
    this.varScopes = [];
    this.funcVars = new Map();
    this.funcMap = new Map();
    this.funcIdx = 0;
    this.importMap = new Map();
  }

  addFuncType(params, results) {
    const bytes = [0x60];
    bytes.push(...leb128u(params.length));
    for (const p of params) bytes.push(TYPES[p] || TYPES.i32);
    bytes.push(...leb128u(results.length));
    for (const r of results) bytes.push(TYPES[r] || TYPES.i32);
    const idx = this.types.length;
    this.types.push(bytes);
    return idx;
  }

  addImport(mod, name, kind, typeIdx) {
    const modBytes = [...leb128u(mod.length), ...[...mod].map(c => c.charCodeAt(0))];
    const nameBytes = [...leb128u(name.length), ...[...name].map(c => c.charCodeAt(0))];
    const kindByte = kind;
    this.imports.push([...modBytes, ...nameBytes, kindByte, ...leb128u(typeIdx)]);
    const idx = this.importMap.size;
    this.importMap.set(name, { idx, module: mod, kind });
    return idx;
  }

  addExport(name, kind, idx) {
    const nameBytes = [...leb128u(name.length), ...[...name].map(c => c.charCodeAt(0))];
    this.exports.push([...nameBytes, kind, ...leb128u(idx)]);
  }

  pushFunc(name) {
    const scope = { vars: new Map(), count: 0, name };
    this.varScopes.push(scope);
    this.funcVars.set(name, scope);
    return scope;
  }

  popFunc() {
    this.varScopes.pop();
  }

  get currentVars() {
    return this.varScopes[this.varScopes.length - 1]?.vars;
  }

  get currentVarCount() {
    return this.varScopes[this.varScopes.length - 1]?.count || 0;
  }

  addVar(name) {
    const scope = this.varScopes[this.varScopes.length - 1];
    if (!scope) return;
    if (!scope.vars.has(name)) {
      scope.vars.set(name, { index: scope.count++, type: "i32" });
    }
    return scope.vars.get(name);
  }

  getVar(name) {
    for (let i = this.varScopes.length - 1; i >= 0; i--) {
      const scope = this.varScopes[i];
      if (scope.vars.has(name)) return scope.vars.get(name);
    }
    return null;
  }

  addCode(locals, body) {
    const localsBytes = [];
    localsBytes.push(...leb128u(locals.length));
    for (const [count, type] of locals) {
      localsBytes.push(...leb128u(count), TYPES[type] || TYPES.i32);
    }
    const codeBody = [...localsBytes, ...body];
    const codeBytes = [...leb128u(codeBody.length), ...codeBody];
    this.codes.push(codeBytes);
  }

  addMemory(min, max) {
    if (max !== undefined && max !== min) {
      this.memories = [0x01, ...leb128u(min), ...leb128u(max)];
    } else {
      this.memories = [0x00, ...leb128u(min)];
    }
  }

  addDataSegment(offset, data) {
    const dataBytes = [...data].map(c => c.charCodeAt(0));
    const seg = [0x00, ...leb128u(offset), ...leb128u(dataBytes.length), ...dataBytes];
    this.dataSegments.push(seg);
  }

  build() {
    const sections = [];

    if (this.types.length > 0) {
      const content = encodeVector(this.types);
      sections.push([SECTION.TYPE, ...leb128u(content.length), ...content]);
    }

    if (this.imports.length > 0) {
      const content = encodeVector(this.imports);
      sections.push([SECTION.IMPORT, ...leb128u(content.length), ...content]);
    }

    if (this.functions.length > 0) {
      const content = encodeVector(this.functions.map(f => leb128u(f)));
      sections.push([SECTION.FUNC, ...leb128u(content.length), ...content]);
    }

    if (this.memories.length > 0) {
      const content = [...leb128u(1), ...this.memories];
      sections.push([SECTION.MEMORY, ...leb128u(content.length), ...content]);
    }

    if (this.exports.length > 0) {
      const content = encodeVector(this.exports);
      sections.push([SECTION.EXPORT, ...leb128u(content.length), ...content]);
    }

    if (this.codes.length > 0) {
      const content = encodeVector(this.codes);
      sections.push([SECTION.CODE, ...leb128u(content.length), ...content]);
    }

    if (this.dataSegments.length > 0) {
      const content = encodeVector(this.dataSegments);
      sections.push([SECTION.DATA, ...leb128u(content.length), ...content]);
    }

    const all = [...MAGIC, ...VERSION];
    for (const s of sections) all.push(...s);

    return new Uint8Array(all);
  }
}

const OP = {
  UNREACHABLE: 0x00, NOP: 0x01, BLOCK: 0x02, LOOP: 0x03, IF: 0x04,
  ELSE: 0x05, END: 0x0b, BR: 0x0c, BR_IF: 0x0d, BR_TABLE: 0x0e,
  RETURN: 0x0f, CALL: 0x10, CALL_INDIRECT: 0x11,
  DROP: 0x1a, SELECT: 0x1b,
  LOCAL_GET: 0x20, LOCAL_SET: 0x21, LOCAL_TEE: 0x22,
  GLOBAL_GET: 0x23, GLOBAL_SET: 0x24,
  I32_LOAD: 0x28, I64_LOAD: 0x29, F32_LOAD: 0x2a, F64_LOAD: 0x2b,
  I32_STORE: 0x36, I64_STORE: 0x37, F32_STORE: 0x38, F64_STORE: 0x39,
  MEMORY_SIZE: 0x3f, MEMORY_GROW: 0x40,
  I32_CONST: 0x41, I64_CONST: 0x42, F32_CONST: 0x43, F64_CONST: 0x44,
  I32_EQZ: 0x45, I32_EQ: 0x46, I32_NE: 0x47,
  I32_LT_S: 0x48, I32_LT_U: 0x49, I32_GT_S: 0x4a, I32_GT_U: 0x4b,
  I32_LE_S: 0x4c, I32_LE_U: 0x4d, I32_GE_S: 0x4e, I32_GE_U: 0x4f,
  I32_ADD: 0x6a, I32_SUB: 0x6b, I32_MUL: 0x6c, I32_DIV_S: 0x6d,
  I32_DIV_U: 0x6e, I32_REM_S: 0x6f, I32_REM_U: 0x70,
  I32_AND: 0x71, I32_OR: 0x72, I32_XOR: 0x73, I32_SHL: 0x74,
  I32_SHR_S: 0x75, I32_SHR_U: 0x76, I32_ROTL: 0x77, I32_ROTR: 0x78,
  I32_CLZ: 0x79, I32_CTZ: 0x7a, I32_POPCNT: 0x7b,
};

const EMPTY_BLOCK = [OP.BLOCK, 0x40, OP.END];
const EMPTY_LOOP = [OP.LOOP, 0x40, OP.END];

export function compileWasm(ast) {
  const wasm = new WasmBuilder();

  collectWasmDecls(ast, wasm);

  wasm.addMemory(1, 1);

  emitWasmFunctions(ast, wasm);

  const mainInfo = wasm.funcMap.get("main");
  if (!mainInfo) {

    const tIdx = wasm.addFuncType([], ["i32"]);
    wasm.functions.push(tIdx);
    wasm.funcMap.set("main", { typeIdx: tIdx, funcIdx: wasm.funcIdx++, params: [] });
    emitWasmFunc("main", [], "i32", ast, wasm);
  }

  const mainAbsIdx = wasm.importMap.size + wasm.funcMap.get("main").funcIdx;
  wasm.addExport("main", 0, mainAbsIdx);

  return wasm.build();
}

function collectWasmDecls(node, wasm) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { node.forEach(n => collectWasmDecls(n, wasm)); return; }

  if (node.type === "VarDecl") {

  }

  if (node.type === "FunctionDecl") {
    const typeIdx = wasm.addFuncType(
      (node.params || []).map(() => "i32"),
      ["i32"]
    );
    wasm.functions.push(typeIdx);
    wasm.funcMap.set(node.name, {
      typeIdx,
      funcIdx: wasm.funcIdx++,
      params: node.params || [],
    });
  }

  if (node.type === "Call" && node.callee?.type === "Ident") {
    const name = node.callee.name;
    if (["SOLTA_O_GRITO", "FALA_BAIXO", "SORTEIA", "PARSEIA", "AGORA", "TAMANHO"].includes(name)) {
      if (!wasm.importMap.has(name)) {
        const fnType = name === "SORTEIA"
          ? wasm.addFuncType(["i32", "i32"], ["i32"])
          : name === "TAMANHO"
            ? wasm.addFuncType(["i32"], ["i32"])
            : wasm.addFuncType(["i32"], ["i32"]);
        wasm.addImport("env", name, 0, fnType);
      }
    }
  }

  for (const k of Object.keys(node)) {
    if (k === "type") continue;
    collectWasmDecls(node[k], wasm);
  }
}

function emitWasmFunctions(node, wasm) {
  if (!node || typeof node !== "object") return;

  if (node.type === "FunctionDecl") {
    emitWasmFunc(node.name, node.params || [], "i32", node.body, wasm);
    return;
  }

  if (node.type === "Program" || node.type === "Block") {
    (node.body || []).forEach(n => emitWasmFunctions(n, wasm));
    return;
  }

  for (const k of Object.keys(node)) {
    if (k === "type" || k === "loc") continue;
    const val = node[k];
    if (Array.isArray(val)) {
      val.forEach(v => emitWasmFunctions(v, wasm));
    } else if (typeof val === "object" && val !== null) {
      emitWasmFunctions(val, wasm);
    }
  }
}

function emitWasmFunc(name, params, resultType, body, wasm) {
  const funcInfo = wasm.funcMap.get(name);
  const funcIdx = funcInfo ? funcInfo.funcIdx : 0;

  const scope = wasm.pushFunc(name);
  for (const p of params) {
    scope.vars.set(p, { index: scope.count++, type: "i32" });
  }

  const localVars = new Set();
  countLocals(body, wasm, localVars);
  for (const vname of localVars) {
    wasm.addVar(vname);
  }

  const localCount = scope.count - params.length;
  const locals = [];
  if (params.length > 0) {
    locals.push([params.length, "i32"]);
  }
  if (localCount > 0) {
    locals.push([localCount, "i32"]);
  }

  const bodyBytes = [];
  bodyBytes.push(OP.BLOCK, 0x40);
  emitWasmStmt(body, bodyBytes, wasm, name);
  bodyBytes.push(OP.END);
  bodyBytes.push(OP.I32_CONST, 0);
  bodyBytes.push(OP.END);

  wasm.addCode(locals, bodyBytes);
  wasm.popFunc();
}

function countLocals(node, wasm, vars) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { node.forEach(n => countLocals(n, wasm, vars)); return; }

  if (node.type === "VarDecl") {
    if (!wasm.getVar(node.id)) {
      vars.add(node.id);
    }
  }

  for (const k of Object.keys(node)) {
    if (k === "type" || k === "loc") continue;
    const val = node[k];
    if (Array.isArray(val)) {
      val.forEach(v => countLocals(v, wasm, vars));
    } else if (typeof val === "object" && val !== null) {
      countLocals(val, wasm, vars);
    }
  }
}

function emitWasmStmt(node, bytes, wasm, funcName) {
  if (!node || typeof node !== "object") return;

  switch (node.type) {
    case "Program":
      (node.body || []).forEach(n => emitWasmStmt(n, bytes, wasm, funcName));
      break;

    case "Block":
      (node.body || []).forEach(n => emitWasmStmt(n, bytes, wasm, funcName));
      break;

    case "VarDecl": {
      emitWasmExpr(node.init, bytes, wasm, funcName);
      const v = wasm.getVar(node.id) || wasm.addVar(node.id);
      if (v) {
        bytes.push(OP.LOCAL_SET, v.index);
      }
      break;
    }

    case "Assign": {
      if (node.left?.type === "Ident") {
        emitWasmExpr(node.right, bytes, wasm, funcName);
        const v = wasm.getVar(node.left.name);
        if (v) {
          bytes.push(OP.LOCAL_SET, v.index);
        }
      }
      break;
    }

    case "ReturnStmt": {
      if (node.arg) {
        emitWasmExpr(node.arg, bytes, wasm, funcName);
      } else {
        bytes.push(OP.I32_CONST, 0);
      }
      bytes.push(OP.RETURN);
      break;
    }

    case "IfStmt": {
      emitWasmExpr(node.test, bytes, wasm, funcName);
      bytes.push(OP.IF, 0x40);
      emitWasmStmt(node.cons, bytes, wasm, funcName);
      if (node.alt) {
        bytes.push(OP.ELSE);
        emitWasmStmt(node.alt, bytes, wasm, funcName);
      }
      bytes.push(OP.END);
      break;
    }

    case "ForStmt": {
      if (node.init) emitWasmStmt(node.init, bytes, wasm, funcName);

      bytes.push(OP.BLOCK, 0x40);
      bytes.push(OP.LOOP, 0x40);
      emitWasmExpr(node.test, bytes, wasm, funcName);
      bytes.push(OP.I32_EQZ);
      bytes.push(OP.BR_IF, 1);
      emitWasmStmt(node.body, bytes, wasm, funcName);
      if (node.update) emitWasmStmt(node.update, bytes, wasm, funcName);
      bytes.push(OP.BR, 0);
      bytes.push(OP.END);
      bytes.push(OP.END);
      break;
    }

    case "WhileStmt": {
      bytes.push(OP.BLOCK, 0x40);
      bytes.push(OP.LOOP, 0x40);
      emitWasmExpr(node.test, bytes, wasm, funcName);
      bytes.push(OP.I32_EQZ);
      bytes.push(OP.BR_IF, 0);
      emitWasmStmt(node.body, bytes, wasm, funcName);
      bytes.push(OP.BR, 1);
      bytes.push(OP.END);
      bytes.push(OP.END);
      break;
    }

    case "BreakStmt":
      bytes.push(OP.BR, 1);
      break;

    case "ContinueStmt":
      bytes.push(OP.BR, 0);
      break;

    case "Call": {
      if (node.callee?.type === "Ident") {
        const name = node.callee.name;
        const imp = wasm.importMap.get(name);
        if (imp) {
          for (const arg of node.args) emitWasmExpr(arg, bytes, wasm, funcName);
          bytes.push(OP.CALL, ...leb128u(imp.idx));
        } else {
          const func = wasm.funcMap.get(name);
          if (func) {
            for (const arg of node.args) emitWasmExpr(arg, bytes, wasm, funcName);
            bytes.push(OP.CALL, ...leb128u(func.funcIdx + wasm.importMap.size));
          }
        }
      }
      break;
    }

    case "ExpressionStmt": {
      emitWasmExpr(node.expression, bytes, wasm, funcName);
      bytes.push(OP.DROP);
      break;
    }
  }
}

function emitWasmExpr(node, bytes, wasm, funcName) {
  if (!node || typeof node !== "object") return;

  switch (node.type) {
    case "Num": {
      const val = node.value | 0;
      if (val >= 0 && val < 128) {
        bytes.push(OP.I32_CONST, val);
      } else {
        bytes.push(OP.I32_CONST, ...leb128s(val));
      }
      break;
    }

    case "Bool":
      bytes.push(OP.I32_CONST, node.value ? 1 : 0);
      break;

    case "Nil":
      bytes.push(OP.I32_CONST, 0);
      break;

    case "Ident": {
      const v = wasm.getVar(node.name);
      if (v) {
        bytes.push(OP.LOCAL_GET, v.index);
      } else {
        bytes.push(OP.I32_CONST, 0);
      }
      break;
    }

    case "Binary": {
      const opMap = {
        "+": OP.I32_ADD, "-": OP.I32_SUB, "*": OP.I32_MUL,
        "/": OP.I32_DIV_S, "%": OP.I32_REM_S,
        "==": OP.I32_EQ, "!=": OP.I32_NE,
        ">": OP.I32_GT_S, "<": OP.I32_LT_S,
        ">=": OP.I32_GE_S, "<=": OP.I32_LE_S,
        "&&": OP.I32_AND, "||": OP.I32_OR,
      };
      emitWasmExpr(node.left, bytes, wasm, funcName);
      emitWasmExpr(node.right, bytes, wasm, funcName);
      if (opMap[node.op]) {
        bytes.push(opMap[node.op]);
      }
      break;
    }

    case "Unary": {
      emitWasmExpr(node.arg, bytes, wasm, funcName);
      if (node.op === "-") {
        bytes.push(OP.I32_CONST, 0, OP.I32_SUB);
      }
      if (node.op === "!") {
        bytes.push(OP.I32_EQZ);
      }
      break;
    }

    case "Ternary": {
      emitWasmExpr(node.test, bytes, wasm, funcName);
      bytes.push(OP.IF, 0x7f);
      emitWasmExpr(node.cons, bytes, wasm, funcName);
      bytes.push(OP.ELSE);
      emitWasmExpr(node.alt, bytes, wasm, funcName);
      bytes.push(OP.END);
      break;
    }

    case "Call": {
      if (node.callee?.type === "Ident") {
        const name = node.callee.name;
        const imp = wasm.importMap.get(name);
        if (imp) {
          for (const arg of node.args) emitWasmExpr(arg, bytes, wasm, funcName);
          bytes.push(OP.CALL, ...leb128u(imp.idx));
        } else {
          const func = wasm.funcMap.get(name);
          if (func) {
            for (const arg of node.args) emitWasmExpr(arg, bytes, wasm, funcName);
            bytes.push(OP.CALL, ...leb128u(func.funcIdx + wasm.importMap.size));
          }
        }
      }
      break;
    }
  }
}

export { generateWasm, getWasmRuntime, getDefaultExports } from "./codegen_wasm.js";
