import { setWasmMemory as _setWasmMemory } from "./codegen_wasm.js";
import { XSError, buildCode, CATEGORY } from "./errors.js";

const MAGIC = new Uint8Array([0x00, 0x61, 0x73, 0x6d]);
const VERSION = new Uint8Array([0x01, 0x00, 0x00, 0x00]);

const SECTION = {
  TYPE: 1,
  IMPORT: 2,
  FUNC: 3,
  MEMORY: 5,
  GLOBAL: 6,
  EXPORT: 7,
  CODE: 10,
  DATA: 11,
};

const TYPES = { i32: 0x7f, i64: 0x7e, f32: 0x7d, f64: 0x7c };

const STRING_BASE = 0x4000;

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

function f64ConstBytes(value) {
  const buf = new ArrayBuffer(8);
  const dv = new DataView(buf);
  dv.setFloat64(0, value, true);
  return Array.from(new Uint8Array(buf));
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
    this.globalVars = new Map();
    this.dataSegments = [];
    this.stringMap = new Map();
    this.stringOffsets = [];
    this.varScopes = [];
    this.funcVars = new Map();
    this.funcMap = new Map();
    this.funcIdx = 0;
    this.importMap = new Map();
    this.funcResultTypes = new Map();
    this.labelDepth = 0;
    this.loopStack = [];
  }

  openLabel() {
    return this.labelDepth++;
  }

  closeLabel() {
    this.labelDepth--;
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

  addImport(mod, name, kind, typeIdx, paramCount) {
    const modBytes = [...leb128u(mod.length), ...[...mod].map((c) => c.charCodeAt(0))];
    const nameBytes = [...leb128u(name.length), ...[...name].map((c) => c.charCodeAt(0))];
    const kindByte = kind;
    this.imports.push([...modBytes, ...nameBytes, kindByte, ...leb128u(typeIdx)]);
    const idx = this.importMap.size;
    this.importMap.set(name, { idx, module: mod, kind, paramCount: paramCount ?? 1 });
    return idx;
  }

  addExport(name, kind, idx) {
    const nameBytes = [...leb128u(name.length), ...[...name].map((c) => c.charCodeAt(0))];
    this.exports.push([...nameBytes, kind, ...leb128u(idx)]);
  }

  registerString(str) {
    if (this.stringMap.has(str)) return this.stringMap.get(str);
    const byteLen = new TextEncoder().encode(str).length;
    const offset = STRING_BASE + this.stringOffsets.reduce((a, b) => a + b + 1, 0);
    this.stringMap.set(str, offset);
    this.stringOffsets.push(byteLen);
    return offset;
  }

  pushFunc(name) {
    const scope = { vars: new Map(), count: 0, name, tempIdx: 0, tempCounter: 0 };
    this.varScopes.push(scope);
    this.funcVars.set(name, scope);
    return scope;
  }

  allocTemp() {
    const scope = this.varScopes[this.varScopes.length - 1];
    if (!scope) return 0;
    const idx = scope.tempIdx + scope.tempCounter;
    scope.tempCounter++;
    return idx;
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

  addVar(name, type) {
    const scope = this.varScopes[this.varScopes.length - 1];
    if (!scope) return null;
    if (!scope.vars.has(name)) {
      scope.vars.set(name, { index: scope.count++, type: type || "i32" });
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

  addGlobal(name, type) {
    if (!this.globalVars.has(name)) {
      this.globalVars.set(name, { index: this.globalVars.size, type: localWasmType(type) });
    }
    return this.globalVars.get(name);
  }

  getGlobal(name) {
    return this.globalVars.get(name) || null;
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
    const dataBytes = [...new TextEncoder().encode(data)];
    const seg = [
      0x00,
      OP.I32_CONST,
      ...leb128s(offset),
      OP.END,
      ...leb128u(dataBytes.length),
      ...dataBytes,
    ];
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
      const content = encodeVector(this.functions.map((f) => leb128u(f)));
      sections.push([SECTION.FUNC, ...leb128u(content.length), ...content]);
    }

    if (this.memories.length > 0) {
      const content = [...leb128u(1), ...this.memories];
      sections.push([SECTION.MEMORY, ...leb128u(content.length), ...content]);
    }

    if (this.globalVars.size > 0) {
      const globalsList = [...this.globalVars.values()].sort((a, b) => a.index - b.index);
      const content = [];
      content.push(...leb128u(globalsList.length));
      for (const g of globalsList) {
        content.push(TYPES[g.type] || TYPES.i32, 0x01);
        if (g.type === "f64") {
          content.push(OP.F64_CONST, ...f64ConstBytes(0));
        } else {
          content.push(OP.I32_CONST, 0);
        }
        content.push(OP.END);
      }
      sections.push([SECTION.GLOBAL, ...leb128u(content.length), ...content]);
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
  UNREACHABLE: 0x00,
  NOP: 0x01,
  BLOCK: 0x02,
  LOOP: 0x03,
  IF: 0x04,
  ELSE: 0x05,
  END: 0x0b,
  BR: 0x0c,
  BR_IF: 0x0d,
  BR_TABLE: 0x0e,
  RETURN: 0x0f,
  CALL: 0x10,
  CALL_INDIRECT: 0x11,
  DROP: 0x1a,
  SELECT: 0x1b,
  LOCAL_GET: 0x20,
  LOCAL_SET: 0x21,
  LOCAL_TEE: 0x22,
  GLOBAL_GET: 0x23,
  GLOBAL_SET: 0x24,
  I32_LOAD: 0x28,
  I64_LOAD: 0x29,
  F32_LOAD: 0x2a,
  F64_LOAD: 0x2b,
  I32_STORE: 0x36,
  I64_STORE: 0x37,
  F32_STORE: 0x38,
  F64_STORE: 0x39,
  MEMORY_SIZE: 0x3f,
  MEMORY_GROW: 0x40,
  I32_CONST: 0x41,
  I64_CONST: 0x42,
  F32_CONST: 0x43,
  F64_CONST: 0x44,
  I32_EQZ: 0x45,
  I32_EQ: 0x46,
  I32_NE: 0x47,
  I32_LT_S: 0x48,
  I32_LT_U: 0x49,
  I32_GT_S: 0x4a,
  I32_GT_U: 0x4b,
  I32_LE_S: 0x4c,
  I32_LE_U: 0x4d,
  I32_GE_S: 0x4e,
  I32_GE_U: 0x4f,
  I32_ADD: 0x6a,
  I32_SUB: 0x6b,
  I32_MUL: 0x6c,
  I32_DIV_S: 0x6d,
  I32_DIV_U: 0x6e,
  I32_REM_S: 0x6f,
  I32_REM_U: 0x70,
  I32_AND: 0x71,
  I32_OR: 0x72,
  I32_XOR: 0x73,
  I32_SHL: 0x74,
  I32_SHR_S: 0x75,
  I32_SHR_U: 0x76,
  I32_ROTL: 0x77,
  I32_ROTR: 0x78,
  I32_CLZ: 0x79,
  I32_CTZ: 0x7a,
  I32_POPCNT: 0x7b,
  F64_EQ: 0x61,
  F64_NE: 0x62,
  F64_LT: 0x63,
  F64_GT: 0x64,
  F64_LE: 0x65,
  F64_GE: 0x66,
  I32_TRUNC_F64_S: 0xaa,
  F64_CONVERT_I32_S: 0xb7,
  F64_ABS: 0x99,
  F64_NEG: 0x9a,
  F64_ADD: 0xa0,
  F64_SUB: 0xa1,
  F64_MUL: 0xa2,
  F64_DIV: 0xa3,
};

const EXPR_STMTS = new Set([
  "Call",
  "Num",
  "Str",
  "Ident",
  "Binary",
  "Unary",
  "Ternary",
  "Bool",
  "Nil",
  "ArrayExpr",
  "ObjectExpr",
  "UpdateExpr",
]);

const COMPARE_OPS = new Set(["==", "!=", ">", "<", ">=", "<=", "===", "!=="]);

function isExprStmt(node) {
  return node && typeof node === "object" && EXPR_STMTS.has(node.type);
}

const WASM_BUILTINS = new Set([
  "grita-ae",
  "sussurra",
  "escolhe",
  "desembola",
  "horinha",
  "tamanho",
]);

function validateWasmBuiltins(node, wasm) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => validateWasmBuiltins(n, wasm));
    return;
  }
  if (node.type === "Call" && node.callee?.type === "Ident") {
    const name = node.callee.name;
    if (!WASM_BUILTINS.has(name) && !wasm.funcMap.has(name)) {
      throw new XSError(`Builtin "${name}" is not supported by the WebAssembly backend yet`, {
        hint: "Only grita-ae, sussurra, escolhe, desembola, horinha and tamanho are available in wasm",
        help: "Use `xana run` or `xana build` (JavaScript) for full builtin support",
        code: buildCode(CATEGORY.RUNT, 1),
      });
    }
  }
  for (const k of Object.keys(node)) {
    if (k === "type" || k === "loc") continue;
    validateWasmBuiltins(node[k], wasm);
  }
}

export function compileWasm(ast) {
  const wasm = new WasmBuilder();

  collectWasmDecls(ast, wasm);
  collectStrings(ast, wasm);
  wasm.registerString("true");
  wasm.registerString("false");
  validateWasmBuiltins(ast, wasm);

  wasm.addMemory(1, 1);

  for (const [name, str] of wasm.stringMap) {
    wasm.addDataSegment(str, name + "\0");
  }

  if (!wasm.funcMap.has("main")) {
    wasm.funcMap.set("main", { funcIdx: wasm.funcIdx++, params: [], body: ast });
  }

  for (const [name, info] of wasm.funcMap) {
    const scope = wasm.pushFunc(name);
    for (const p of info.params || []) {
      scope.vars.set(p, { index: scope.count++, type: "i32" });
    }
    const localVars = new Map();
    countLocals(info.body, wasm, localVars);
    for (const [vname, vtype] of localVars) {
      wasm.addVar(vname, vtype);
    }
    const resultType = funcResultType(info.body, wasm);
    info.resultType = resultType;
    info.typeIdx = wasm.addFuncType(
      (info.params || []).map(() => "i32"),
      [resultType]
    );
    wasm.functions.push(info.typeIdx);
    wasm.popFunc();
  }

  emitWasmFunctions(ast, wasm);

  const userMain = findFunctionDecl(ast, "main");
  if (!userMain) {
    emitWasmFunc("main", [], wasm.funcMap.get("main").resultType, ast, wasm);
  } else {
    const globals = (ast.body || []).filter((s) => s.type === "VarDecl" && s.kind === "global");
    const mainInfo = wasm.funcMap.get("main");
    const body =
      globals.length > 0
        ? { ...mainInfo.body, body: [...globals, ...(mainInfo.body.body || [mainInfo.body])] }
        : mainInfo.body;
    emitWasmFunc("main", mainInfo.params || [], mainInfo.resultType, body, wasm);
  }

  const mainAbsIdx = wasm.importMap.size + wasm.funcMap.get("main").funcIdx;
  wasm.addExport("main", 0, mainAbsIdx);
  wasm.addExport("memory", 2, 0);

  return wasm.build();
}

function findFunctionDecl(node, name) {
  if (!node || typeof node !== "object") return null;
  if (node.type === "FunctionDecl" && node.name === name) return node;
  if (node.type === "Program" || node.type === "Block") {
    for (const n of node.body || []) {
      const found = findFunctionDecl(n, name);
      if (found) return found;
    }
  }
  return null;
}

function collectStrings(node, wasm) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => collectStrings(n, wasm));
    return;
  }
  if (node.type === "Str") {
    wasm.registerString(node.value);
  }
  for (const k of Object.keys(node)) {
    if (k === "type" || k === "loc") continue;
    collectStrings(node[k], wasm);
  }
}

function collectWasmDecls(node, wasm) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => collectWasmDecls(n, wasm));
    return;
  }

  if (node.type === "FunctionDecl") {
    if (!wasm.funcMap.has(node.name)) {
      wasm.funcMap.set(node.name, {
        funcIdx: wasm.funcIdx++,
        params: node.params || [],
        body: node.body,
      });
    }
  }

  if (node.type === "Call" && node.callee?.type === "Ident") {
    const name = node.callee.name;
    if (["grita-ae", "sussurra", "escolhe", "desembola", "horinha", "tamanho"].includes(name)) {
      if (!wasm.importMap.has(name)) {
        let fnType;
        let paramCount = 1;
        if (name === "escolhe") {
          fnType = wasm.addFuncType(["i32", "i32"], ["i32"]);
          paramCount = 2;
        } else if (name === "horinha") {
          fnType = wasm.addFuncType([], ["i32"]);
          paramCount = 0;
        } else if (name === "grita-ae" || name === "sussurra") {
          fnType = wasm.addFuncType(["f64"], ["f64"]);
        } else {
          fnType = wasm.addFuncType(["i32"], ["i32"]);
        }
        const impIdx = wasm.addImport("env", name, 0, fnType, paramCount);
        wasm.importMap.get(name).paramCount = paramCount;
      }
    }
  }

  if (node.type === "Binary" && node.op === "**") {
    if (!wasm.importMap.has("pow")) {
      const fnType = wasm.addFuncType(["f64", "f64"], ["f64"]);
      wasm.addImport("env", "pow", 0, fnType, 2);
      wasm.importMap.get("pow").paramCount = 2;
    }
  }

  for (const k of Object.keys(node)) {
    if (k === "type") continue;
    collectWasmDecls(node[k], wasm);
  }
}

function funcResultType(node, wasm) {
  if (!node || typeof node !== "object") return "i32";
  if (node.type === "ReturnStmt" && node.arg) {
    if (exprType(node.arg, wasm) === "f64") return "f64";
  }
  if (node.type === "Program" || node.type === "Block") {
    const body = node.body || [];
    let f64 = false;
    for (const stmt of body) {
      if (stmt.type === "ReturnStmt" && stmt.arg && exprType(stmt.arg, wasm) === "f64") f64 = true;
    }
    if (body.length > 0 && isExprStmt(body[body.length - 1])) {
      if (exprType(body[body.length - 1], wasm) === "f64") f64 = true;
    }
    return f64 ? "f64" : "i32";
  }
  for (const k of Object.keys(node)) {
    if (k === "type" || k === "loc") continue;
    const t = funcResultType(node[k], wasm);
    if (t === "f64") return "f64";
  }
  return "i32";
}

function exprType(node, wasm) {
  if (!node || typeof node !== "object") return "i32";
  switch (node.type) {
    case "Num":
      return Number.isInteger(node.value) ? "i32" : "f64";
    case "Str":
      return "str";
    case "Bool":
      return "bool";
    case "Nil":
      return "i32";
    case "Ident": {
      const g = wasm.getGlobal(node.name);
      if (g) return g.type === "f64" ? "f64" : "i32";
      const v = wasm.getVar(node.name);
      if (v && v.type === "f64") return "f64";
      if (v && v.type === "bool") return "bool";
      return "i32";
    }
    case "Unary": {
      if (node.op === "-") return exprType(node.arg, wasm) === "f64" ? "f64" : "i32";
      if (node.op === "!") return "bool";
      return "i32";
    }
    case "UpdateExpr": {
      return exprType({ type: "Ident", name: node.target?.name }, wasm);
    }
    case "Binary": {
      if (COMPARE_OPS.has(node.op)) return "bool";
      if (node.op === "&&" || node.op === "||") return "i32";
      const lt = exprType(node.left, wasm);
      const rt = exprType(node.right, wasm);
      if (lt === "str" || rt === "str") return "str";
      if (node.op === "/") return "f64";
      if (node.op === "**") return "f64";
      if (lt === "f64" || rt === "f64") return "f64";
      return "i32";
    }
    case "Ternary": {
      const ct = exprType(node.cons, wasm);
      const at = exprType(node.alt, wasm);
      if (ct === "bool" && at === "bool") return "bool";
      if (ct === "f64" || at === "f64") return "f64";
      return "i32";
    }
    case "Call": {
      const name = node.callee?.type === "Ident" ? node.callee.name : null;
      if (name === "grita-ae" || name === "sussurra") return "f64";
      return "i32";
    }
    default:
      return "i32";
  }
}

function localWasmType(t) {
  return t === "f64" ? "f64" : "i32";
}

function emitWasmFunctions(node, wasm) {
  if (!node || typeof node !== "object") return;

  if (node.type === "FunctionDecl") {
    if (node.name === "main") return;
    const resultType = wasm.funcResultTypes.get(node.name) || "i32";
    emitWasmFunc(node.name, node.params || [], resultType, node.body, wasm);
    return;
  }

  if (node.type === "Program" || node.type === "Block") {
    (node.body || []).forEach((n) => emitWasmFunctions(n, wasm));
    return;
  }

  for (const k of Object.keys(node)) {
    if (k === "type" || k === "loc") continue;
    const val = node[k];
    if (Array.isArray(val)) {
      val.forEach((v) => emitWasmFunctions(v, wasm));
    } else if (typeof val === "object" && val !== null) {
      emitWasmFunctions(val, wasm);
    }
  }
}

function emitWasmFunc(name, params, resultType, body, wasm) {
  const funcInfo = wasm.funcMap.get(name);
  const funcIdx = funcInfo ? funcInfo.funcIdx : 0;
  const rt = resultType || funcInfo?.resultType || "i32";

  const scope = wasm.pushFunc(name);
  for (const p of params) {
    scope.vars.set(p, { index: scope.count++, type: "i32" });
  }

  const localVars = new Map();
  countLocals(body, wasm, localVars);
  for (const [vname, vtype] of localVars) {
    wasm.addVar(vname, vtype);
  }

  const localCount = scope.count - params.length;
  const locals = [];
  const tempCount = countBoolOps(body);
  if (tempCount > 0) {
    scope.tempIdx = scope.count;
    scope.count += tempCount;
  }
  if (localCount + tempCount > 0) {
    const localTypes = new Map();
    for (const [, v] of scope.vars) {
      if (v.index >= params.length) localTypes.set(v.index, v.type);
    }
    let lastType = null;
    let groupCount = 0;
    const flush = () => {
      if (groupCount > 0) locals.push([groupCount, lastType]);
      groupCount = 0;
    };
    for (let i = params.length; i < scope.count; i++) {
      const t = localWasmType(localTypes.get(i) || "i32");
      if (t !== lastType) {
        flush();
        lastType = t;
      }
      groupCount++;
    }
    flush();
  }

  const bodyBytes = [];
  wasm.labelDepth = 0;
  wasm.loopStack = [];
  const stmts = body.type === "Block" || body.type === "Program" ? body.body || [] : [body];
  const tailExpr =
    stmts.length > 0 && isExprStmt(stmts[stmts.length - 1]) ? stmts[stmts.length - 1] : null;

  wasm.openLabel();
  bodyBytes.push(OP.BLOCK, 0x40);
  for (let i = 0; i < stmts.length; i++) {
    if (i === stmts.length - 1 && tailExpr) continue;
    emitWasmStmt(stmts[i], bodyBytes, wasm, name);
  }
  bodyBytes.push(OP.END);
  wasm.closeLabel();

  if (tailExpr) {
    emitWasmExpr(tailExpr, bodyBytes, wasm, name);
    if (resultType === "f64" && exprType(tailExpr, wasm) === "i32") {
      bodyBytes.push(OP.F64_CONVERT_I32_S);
    }
  } else {
    if (resultType === "f64") {
      bodyBytes.push(OP.F64_CONST, ...f64ConstBytes(0));
    } else {
      bodyBytes.push(OP.I32_CONST, 0);
    }
  }
  bodyBytes.push(OP.END);

  wasm.addCode(locals, bodyBytes);
  wasm.popFunc();
}

function countLocals(node, wasm, vars) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => countLocals(n, wasm, vars));
    return;
  }

  if (node.type === "VarDecl") {
    if (node.kind === "global") {
      wasm.addGlobal(node.id, exprType(node.init, wasm));
    } else if (!wasm.getVar(node.id)) {
      vars.set(node.id, exprType(node.init, wasm));
    }
  }

  for (const k of Object.keys(node)) {
    if (k === "type" || k === "loc") continue;
    const val = node[k];
    if (Array.isArray(val)) {
      val.forEach((v) => countLocals(v, wasm, vars));
    } else if (typeof val === "object" && val !== null) {
      countLocals(val, wasm, vars);
    }
  }
}

function coerceToF64(bytes, from) {
  if (from === "f64" || from === "str") return;
  bytes.push(OP.F64_CONVERT_I32_S);
}

function countBoolOps(node) {
  if (!node || typeof node !== "object") return 0;
  let n = 0;
  if (Array.isArray(node)) {
    for (const v of node) n += countBoolOps(v);
    return n;
  }
  if (node.type === "Binary" && (node.op === "&&" || node.op === "||" || node.op === "??")) n += 1;
  for (const k of Object.keys(node)) {
    if (k === "type" || k === "loc") continue;
    const val = node[k];
    if (Array.isArray(val)) {
      for (const v of val) n += countBoolOps(v);
    } else if (typeof val === "object" && val !== null) {
      n += countBoolOps(val);
    }
  }
  return n;
}

function coerceToI32(bytes, from) {
  if (from !== "f64") return;
  bytes.push(OP.I32_TRUNC_F64_S);
}

function emitWasmStmt(node, bytes, wasm, funcName) {
  if (!node || typeof node !== "object") return;

  switch (node.type) {
    case "Program":
      (node.body || []).forEach((n) => emitWasmStmt(n, bytes, wasm, funcName));
      break;

    case "Block":
      (node.body || []).forEach((n) => emitWasmStmt(n, bytes, wasm, funcName));
      break;

    case "VarDecl": {
      if (node.kind === "global") {
        const g = wasm.getGlobal(node.id) || wasm.addGlobal(node.id, exprType(node.init, wasm));
        emitWasmExpr(node.init, bytes, wasm, funcName);
        const initType = exprType(node.init, wasm);
        if (g.type === "f64" && initType === "i32") {
          coerceToF64(bytes, "i32");
        } else if (g.type === "i32" && initType === "f64") {
          coerceToI32(bytes, "f64");
        }
        bytes.push(OP.GLOBAL_SET, g.index);
        break;
      }
      const v = wasm.getVar(node.id) || wasm.addVar(node.id, "i32");
      emitWasmExpr(node.init, bytes, wasm, funcName);
      if (v.type === "f64" && exprType(node.init, wasm) === "i32") {
        coerceToF64(bytes, "i32");
      } else if (v.type === "i32" && exprType(node.init, wasm) === "f64") {
        coerceToI32(bytes, "f64");
      }
      if (v) {
        bytes.push(OP.LOCAL_SET, v.index);
      }
      break;
    }

    case "Assign": {
      if (node.left?.type === "Ident") {
        const g = wasm.getGlobal(node.left.name);
        if (g) {
          emitWasmExpr(node.right, bytes, wasm, funcName);
          const initType = exprType(node.right, wasm);
          if (g.type === "f64" && initType === "i32") {
            coerceToF64(bytes, "i32");
          } else if (g.type === "i32" && initType === "f64") {
            coerceToI32(bytes, "f64");
          }
          bytes.push(OP.GLOBAL_SET, g.index);
          break;
        }
        const v = wasm.getVar(node.left.name);
        emitWasmExpr(node.right, bytes, wasm, funcName);
        if (v) {
          if (v.type === "f64" && exprType(node.right, wasm) === "i32") {
            coerceToF64(bytes, "i32");
          } else if (v.type === "i32" && exprType(node.right, wasm) === "f64") {
            coerceToI32(bytes, "f64");
          }
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
      wasm.openLabel();
      bytes.push(OP.IF, 0x40);
      emitWasmStmt(node.cons, bytes, wasm, funcName);
      if (node.alt) {
        bytes.push(OP.ELSE);
        emitWasmStmt(node.alt, bytes, wasm, funcName);
      }
      bytes.push(OP.END);
      wasm.closeLabel();
      break;
    }

    case "ForStmt": {
      if (node.init) emitWasmStmt(node.init, bytes, wasm, funcName);

      const blockD = wasm.openLabel();
      bytes.push(OP.BLOCK, 0x40);
      const loopD = wasm.openLabel();
      bytes.push(OP.LOOP, 0x40);
      wasm.loopStack.push({ block: blockD, loop: loopD });
      emitWasmExpr(node.test, bytes, wasm, funcName);
      bytes.push(OP.I32_EQZ);
      bytes.push(OP.BR_IF, 1);
      emitWasmStmt(node.body, bytes, wasm, funcName);
      if (node.update) emitWasmStmt(node.update, bytes, wasm, funcName);
      bytes.push(OP.BR, 0);
      bytes.push(OP.END);
      wasm.closeLabel();
      wasm.loopStack.pop();
      bytes.push(OP.END);
      wasm.closeLabel();
      break;
    }

    case "WhileStmt": {
      const blockD = wasm.openLabel();
      bytes.push(OP.BLOCK, 0x40);
      const loopD = wasm.openLabel();
      bytes.push(OP.LOOP, 0x40);
      wasm.loopStack.push({ block: blockD, loop: loopD });
      emitWasmExpr(node.test, bytes, wasm, funcName);
      bytes.push(OP.I32_EQZ);
      bytes.push(OP.BR_IF, 1);
      emitWasmStmt(node.body, bytes, wasm, funcName);
      bytes.push(OP.BR, 0);
      bytes.push(OP.END);
      wasm.closeLabel();
      wasm.loopStack.pop();
      bytes.push(OP.END);
      wasm.closeLabel();
      break;
    }

    case "BreakStmt": {
      const top = wasm.loopStack[wasm.loopStack.length - 1];
      if (top) {
        bytes.push(OP.BR, wasm.labelDepth - 1 - top.block);
      } else {
        bytes.push(OP.UNREACHABLE);
      }
      break;
    }

    case "ContinueStmt": {
      const top = wasm.loopStack[wasm.loopStack.length - 1];
      if (top) {
        bytes.push(OP.BR, wasm.labelDepth - 1 - top.loop);
      } else {
        bytes.push(OP.UNREACHABLE);
      }
      break;
    }

    default:
      if (isExprStmt(node)) {
        emitWasmExpr(node, bytes, wasm, funcName);
        bytes.push(OP.DROP);
      }
  }
}

function emitPrintArg(node, bytes, wasm, funcName) {
  if (exprType(node, wasm) === "bool") {
    emitWasmExpr(node, bytes, wasm, funcName);
    wasm.openLabel();
    bytes.push(OP.IF, 0x7f);
    bytes.push(OP.I32_CONST, ...leb128s(wasm.stringMap.get("true") || 0));
    bytes.push(OP.ELSE);
    bytes.push(OP.I32_CONST, ...leb128s(wasm.stringMap.get("false") || 0));
    bytes.push(OP.END);
    wasm.closeLabel();
    return "i32";
  }
  emitWasmExpr(node, bytes, wasm, funcName);
  return exprType(node, wasm);
}

function emitWasmExpr(node, bytes, wasm, funcName) {
  if (!node || typeof node !== "object") return;

  switch (node.type) {
    case "Num": {
      const t = exprType(node, wasm);
      if (t === "f64") {
        bytes.push(OP.F64_CONST, ...f64ConstBytes(node.value));
      } else {
        const val = node.value | 0;
        if (val >= 0 && val < 128) {
          bytes.push(OP.I32_CONST, val);
        } else {
          bytes.push(OP.I32_CONST, ...leb128s(val));
        }
      }
      break;
    }

    case "Str": {
      const offset = wasm.stringMap.get(node.value);
      bytes.push(OP.I32_CONST, ...leb128s(offset ?? 0));
      break;
    }

    case "Bool":
      bytes.push(OP.I32_CONST, node.value ? 1 : 0);
      break;

    case "Nil":
      bytes.push(OP.I32_CONST, 0);
      break;

    case "Ident": {
      const g = wasm.getGlobal(node.name);
      if (g) {
        bytes.push(OP.GLOBAL_GET, g.index);
        break;
      }
      const v = wasm.getVar(node.name);
      if (v) {
        bytes.push(OP.LOCAL_GET, v.index);
      } else if (node.name === "verdadeiro") {
        bytes.push(OP.I32_CONST, 1);
      } else if (node.name === "falso") {
        bytes.push(OP.I32_CONST, 0);
      } else {
        bytes.push(OP.UNREACHABLE);
        bytes.push(OP.I32_CONST, 0);
      }
      break;
    }

    case "Binary": {
      if (node.op === "&&" || node.op === "||") {
        const isOr = node.op === "||";
        emitWasmExpr(node.left, bytes, wasm, funcName);
        const temp = wasm.allocTemp();
        bytes.push(OP.LOCAL_TEE, temp);
        bytes.push(OP.I32_EQZ);
        wasm.openLabel();
        bytes.push(OP.IF, 0x7f);
        if (isOr) {
          emitWasmExpr(node.right, bytes, wasm, funcName);
        } else {
          bytes.push(OP.LOCAL_GET, temp);
        }
        bytes.push(OP.ELSE);
        if (isOr) {
          bytes.push(OP.LOCAL_GET, temp);
        } else {
          emitWasmExpr(node.right, bytes, wasm, funcName);
        }
        bytes.push(OP.END);
        wasm.closeLabel();
        break;
      }

      if (node.op === "??") {
        emitWasmExpr(node.left, bytes, wasm, funcName);
        const temp = wasm.allocTemp();
        bytes.push(OP.LOCAL_TEE, temp);
        bytes.push(OP.I32_EQZ);
        wasm.openLabel();
        bytes.push(OP.IF, 0x7f);
        emitWasmExpr(node.right, bytes, wasm, funcName);
        bytes.push(OP.ELSE);
        bytes.push(OP.LOCAL_GET, temp);
        bytes.push(OP.END);
        wasm.closeLabel();
        break;
      }

      if (node.op === "**") {
        emitWasmExpr(node.left, bytes, wasm, funcName);
        if (exprType(node.left, wasm) === "i32") coerceToF64(bytes, "i32");
        emitWasmExpr(node.right, bytes, wasm, funcName);
        if (exprType(node.right, wasm) === "i32") coerceToF64(bytes, "i32");
        const pow = wasm.importMap.get("pow");
        if (pow) {
          bytes.push(OP.CALL, pow.idx);
        } else {
          bytes.push(OP.F64_CONST, ...f64ConstBytes(1));
        }
        break;
      }

      const lt = exprType(node.left, wasm);
      const rt = exprType(node.right, wasm);
      const isFloat = lt === "f64" || rt === "f64" || node.op === "/";
      const isCompare = COMPARE_OPS.has(node.op);

      emitWasmExpr(node.left, bytes, wasm, funcName);
      if (isFloat && lt === "i32") coerceToF64(bytes, "i32");
      emitWasmExpr(node.right, bytes, wasm, funcName);
      if (isFloat && rt === "i32") coerceToF64(bytes, "i32");

      if (isFloat) {
        const fOpMap = {
          "+": OP.F64_ADD,
          "-": OP.F64_SUB,
          "*": OP.F64_MUL,
          "/": OP.F64_DIV,
          "==": OP.F64_EQ,
          "!=": OP.F64_NE,
          ">": OP.F64_GT,
          "<": OP.F64_LT,
          ">=": OP.F64_GE,
          "<=": OP.F64_LE,
        };
        if (fOpMap[node.op]) bytes.push(fOpMap[node.op]);
      } else {
        const opMap = {
          "+": OP.I32_ADD,
          "-": OP.I32_SUB,
          "*": OP.I32_MUL,
          "/": OP.I32_DIV_S,
          "%": OP.I32_REM_S,
          "==": OP.I32_EQ,
          "!=": OP.I32_NE,
          ">": OP.I32_GT_S,
          "<": OP.I32_LT_S,
          ">=": OP.I32_GE_S,
          "<=": OP.I32_LE_S,
          "|": OP.I32_OR,
          "&": OP.I32_AND,
          "^": OP.I32_XOR,
          "<<": OP.I32_SHL,
          ">>": OP.I32_SHR_S,
        };
        if (opMap[node.op]) bytes.push(opMap[node.op]);
      }
      break;
    }

    case "Unary": {
      const t = exprType(node.arg, wasm);
      if (node.op === "-" && t === "f64") {
        bytes.push(OP.F64_CONST, ...f64ConstBytes(0));
        emitWasmExpr(node.arg, bytes, wasm, funcName);
        bytes.push(OP.F64_SUB);
        break;
      }
      if (node.op === "-") {
        bytes.push(OP.I32_CONST, 0);
        emitWasmExpr(node.arg, bytes, wasm, funcName);
        bytes.push(OP.I32_SUB);
        break;
      }
      emitWasmExpr(node.arg, bytes, wasm, funcName);
      if (node.op === "!") {
        bytes.push(OP.I32_EQZ);
      }
      if (node.op === "~") {
        bytes.push(OP.I32_CONST, ...leb128s(-1), OP.I32_XOR);
      }
      break;
    }

    case "Ternary": {
      const isFloat = exprType(node.cons, wasm) === "f64" || exprType(node.alt, wasm) === "f64";
      emitWasmExpr(node.test, bytes, wasm, funcName);
      wasm.openLabel();
      bytes.push(OP.IF, isFloat ? 0x7c : 0x7f);
      emitWasmExpr(node.cons, bytes, wasm, funcName);
      bytes.push(OP.ELSE);
      emitWasmExpr(node.alt, bytes, wasm, funcName);
      bytes.push(OP.END);
      wasm.closeLabel();
      break;
    }

    case "UpdateExpr": {
      const v = node.arg?.name ? wasm.getVar(node.arg.name) : null;
      const g = node.arg?.name ? wasm.getGlobal(node.arg.name) : null;
      const isFloat = v ? v.type === "f64" : false;
      if (g) {
        bytes.push(OP.GLOBAL_GET, g.index);
        if (isFloat) {
          bytes.push(OP.F64_CONST, ...f64ConstBytes(1), OP.F64_ADD);
        } else {
          bytes.push(OP.I32_CONST, 1, OP.I32_ADD);
        }
        bytes.push(OP.GLOBAL_SET, g.index);
        bytes.push(OP.GLOBAL_GET, g.index);
        if (!node.prefix) {
          if (isFloat) {
            bytes.push(OP.F64_CONST, ...f64ConstBytes(1), OP.F64_SUB);
          } else {
            bytes.push(OP.I32_CONST, 1, OP.I32_SUB);
          }
        }
        break;
      }
      emitWasmExpr(node.arg, bytes, wasm, funcName);
      if (node.prefix) {
        if (isFloat) {
          bytes.push(OP.F64_CONST, ...f64ConstBytes(1), OP.F64_ADD);
        } else {
          bytes.push(OP.I32_CONST, 1, OP.I32_ADD);
        }
        if (v) {
          bytes.push(OP.LOCAL_TEE, v.index);
        } else {
          bytes.push(OP.DROP);
          bytes.push(OP.I32_CONST, 0);
        }
      } else {
        if (isFloat) {
          bytes.push(OP.F64_CONST, ...f64ConstBytes(1), OP.F64_ADD);
          if (v) bytes.push(OP.LOCAL_TEE, v.index);
          bytes.push(OP.F64_CONST, ...f64ConstBytes(1), OP.F64_SUB);
        } else {
          bytes.push(OP.I32_CONST, 1, OP.I32_ADD);
          if (v) bytes.push(OP.LOCAL_TEE, v.index);
          bytes.push(OP.I32_CONST, 1, OP.I32_SUB);
        }
        if (!v) {
          bytes.push(OP.DROP);
          bytes.push(OP.I32_CONST, 0);
        }
      }
      break;
    }

    case "Call": {
      if (node.callee?.type === "Ident") {
        const name = node.callee.name;
        const imp = wasm.importMap.get(name);
        if (imp) {
          for (const arg of node.args) {
            if (name === "grita-ae" || name === "sussurra") {
              const at = emitPrintArg(arg, bytes, wasm, funcName);
              if (at !== "f64") coerceToF64(bytes, "i32");
            } else {
              emitWasmExpr(arg, bytes, wasm, funcName);
            }
          }
          const paramCount = imp.paramCount || 1;
          for (let i = node.args.length; i > paramCount; i--) {
            bytes.push(OP.DROP);
          }
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

export async function runWasm(ast, imports = {}) {
  const wasmBytes = compileWasm(ast);
  const mod = await WebAssembly.instantiate(wasmBytes, imports);
  _setWasmMemory(mod.instance.exports.memory);
  return {
    bytes: wasmBytes,
    instance: mod.instance,
    main: (args = []) => mod.instance.exports.main?.(...args) ?? 0,
    exports: mod.instance.exports,
  };
}

export { generateWasm, getWasmRuntime, getDefaultExports, setWasmMemory } from "./codegen_wasm.js";
