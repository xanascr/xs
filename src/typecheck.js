import { XSError, typeMismatch, CATEGORY, buildCode } from "./errors.js";

const PRIMITIVES = new Set([
  "eh-numero",
  "eh-palavra",
  "vdd?",
  "eh-nada",
  "nah",
  "sla",
  "data",
  "nunca",
]);

const BUILTIN_FUNCS = {
  "grita-ae": { ret: "nah" },
  sussurra: { ret: "nah" },
  horinha: { ret: "eh-numero" },
  "traduz-ai": { ret: "eh-palavra" },
  embrulha: { ret: "eh-palavra" },
  "data-agora": { ret: "eh-palavra" },
  "data-de-ms": { ret: "eh-palavra" },
  hash: { ret: "eh-palavra" },
  url: { ret: "eh-palavra" },
  stalkeia: { ret: "sla" },
  "aguenta-ai": { ret: "nah" },
  escolhe: { ret: "eh-numero" },
  desembola: { ret: "sla" },
  bisbilhota: { ret: "sepah<eh-palavra>" },
  tamanho: { ret: "eh-numero" },
  "divide-texto": { ret: "sus<eh-palavra>" },
  encontra: { ret: "sla" },
  "decodifica-url": { ret: "eh-palavra" },
  juntar: { ret: "eh-palavra" },
  escuta: { ret: "nah" },
  "terminamos!": { ret: "nah" },
  date: { ret: "nah" },
};

function typeToStr(t) {
  if (t === null || t === undefined) return "sla";
  if (typeof t === "string") return t;
  if (t.args && t.args.length > 0) {
    return `${t.name}<${t.args.map(typeToStr).join(", ")}>`;
  }
  return t.name;
}

function normalizeTypeString(str) {
  return String(str).replace(/\s+/g, "").trim();
}

export class TypeChecker {
  constructor() {
    this.globals = new Map();
    this.scopes = [];
    this.errors = [];
    this.inFunctionReturn = null;
    this.consts = new Set();
    this.scopeConsts = [];
  }

  pushScope() {
    this.scopes.push(new Map());
    this.scopeConsts.push(new Set());
  }

  popScope() {
    this.scopes.pop();
    this.scopeConsts.pop();
  }

  lookup(name) {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(name)) return this.scopes[i].get(name);
    }
    return this.globals.get(name);
  }

  define(name, type) {
    if (this.scopes.length > 0) {
      this.scopes[this.scopes.length - 1].set(name, type);
    } else {
      this.globals.set(name, type);
    }
  }

  isConst(name) {
    for (let i = this.scopeConsts.length - 1; i >= 0; i--) {
      if (this.scopeConsts[i].has(name)) return true;
    }
    return this.consts.has(name);
  }

  markConst(name) {
    if (this.scopeConsts.length > 0) {
      this.scopeConsts[this.scopeConsts.length - 1].add(name);
    } else {
      this.consts.add(name);
    }
  }

  error(msg, loc, hint) {
    const err = new XSError(msg, { loc, hint, code: buildCode(CATEGORY.TIPO, 99) });
    this.errors.push(err);
  }

  typeMismatch(expected, found, loc, what) {
    this.error(
      `TipoError: ${what || "value"} expected ${typeToStr(expected)}, got ${typeToStr(found)}`,
      loc,
      `You can annotate the type with : ${typeToStr(expected)}`
    );
  }

  checkProgram(ast) {
    this.checkStmt(ast);
    return this.errors;
  }

  checkStmt(node) {
    if (!node) return;
    switch (node.type) {
      case "Program":
        node.body.forEach((s) => this.checkStmt(s));
        break;
      case "Block":
        this.pushScope();
        node.body.forEach((s) => this.checkStmt(s));
        this.popScope();
        break;
      case "VarDecl":
        this.checkVarDecl(node);
        break;
      case "Assign":
        this.checkAssign(node);
        break;
      case "FunctionDecl":
        this.checkFunction(node);
        break;
      case "IfStmt":
        this.inferExpr(node.test);
        this.pushScope();
        this.checkStmt(node.cons);
        this.popScope();
        if (node.alt) {
          this.pushScope();
          this.checkStmt(node.alt);
          this.popScope();
        }
        break;
      case "ForStmt":
        this.pushScope();
        if (node.init) this.checkStmt(node.init);
        if (node.test) this.inferExpr(node.test);
        if (node.update) this.inferExpr(node.update);
        this.checkStmt(node.body);
        this.popScope();
        break;
      case "WhileStmt":
        this.inferExpr(node.test);
        this.pushScope();
        this.checkStmt(node.body);
        this.popScope();
        break;
      case "TryCatchStmt":
        this.pushScope();
        this.checkStmt(node.tryBlock);
        this.popScope();
        if (node.catchBlock) {
          this.pushScope();
          if (node.catchParam) this.define(node.catchParam, "sla");
          this.checkStmt(node.catchBlock);
          this.popScope();
        }
        if (node.finallyBlock) this.checkStmt(node.finallyBlock);
        break;
      case "ReturnStmt":
        if (node.arg) {
          const t = this.inferExpr(node.arg);
          if (this.inFunctionReturn) {
            this.checkAssignable(this.inFunctionReturn, t, node.loc, "function return");
          }
        } else if (this.inFunctionReturn && this.inFunctionReturn !== "nah") {
          this.typeMismatch(this.inFunctionReturn, "nah", node.loc, "function return");
        }
        break;
      case "ClassDecl":
        this.checkClass(node);
        break;
      case "ExportStmt":
      case "ImportStmt":
        break;
      case "TypeDecl":
        this.registerTypeDecl(node);
        break;
      case "TableDecl":
        this.registerTableDecl(node);
        break;
      default:
        this.inferExpr(node);
    }
  }

  registerTypeDecl(node) {
    if (node.kind === "alias" && node.value) {
      this.globals.set(node.name, { kind: "type", repr: node.value, isAlias: true });
    } else if (node.kind === "struct") {
      this.globals.set(node.name, { kind: "type", repr: null, isAlias: false, props: node.props });
    } else if (node.kind === "union") {
      this.globals.set(node.name, {
        kind: "type",
        repr: null,
        isAlias: false,
        union: node.props.map((p) => ({ name: typeToStr(p), args: null })),
      });
    } else if (node.kind === "fn") {
      this.globals.set(node.name, { kind: "type", repr: null, isAlias: false, fn: node.props });
    }
  }

  registerTableDecl(node) {
    const props = node.props.map((p) => ({
      name: p.name,
      type: { name: this.tablePropToType(p.type), args: null },
    }));
    this.globals.set(node.name, { kind: "table", props, name: node.name });
    this.define(node.name, { kind: "table", props, name: node.name });
  }

  tablePropToType(t) {
    const str = typeof t === "string" ? t : t.name;
    const map = {
      "eh-palavra": "eh-palavra",
      "eh-numero": "eh-numero",
      "vdd?": "vdd?",
      vdd: "vdd?",
      "eh-nada": "eh-nada",
      "eh-data": "data",
      data: "data",
      TEXTO: "eh-palavra",
      NUMERO: "eh-numero",
      BOOLEANO: "vdd?",
    };
    return map[str] || "sla";
  }

  resolveType(t) {
    if (!t) return { name: "sla", args: null };
    const name = typeof t === "string" ? t.replace(/<.*/, "") : t.name;
    const reg = this.globals.get(name);
    if (reg && reg.kind === "type" && reg.isAlias) {
      return this.resolveType(reg.repr);
    }
    if (typeof t === "string") {
      return { name, args: null };
    }
    return t;
  }

  checkVarDecl(node) {
    const initType = node.init ? this.inferExpr(node.init) : "sla";
    const declared = node.typeHint ? node.typeHint : null;
    if (declared) {
      this.checkAssignable(declared, initType, node.loc, `variable "${node.id}"`);
    }
    if (node.kind === "const") this.markConst(node.id);
    this.define(node.id, declared ? declared : initType);
  }

  checkAssign(node) {
    if (!node.right) return;
    const right = this.inferExpr(node.right);
    if (node.left.type === "Ident") {
      if (this.isConst(node.left.name)) {
        this.error(
          `Cannot reassign const "${node.left.name}"`,
          node.loc,
          "Const variables are immutable; use `cria` if the value needs to change"
        );
      }
      const leftT = this.lookup(node.left.name);
      if (leftT) {
        this.checkAssignable(leftT, right, node.loc, `assignment to "${node.left.name}"`);
      }
    } else if (node.left.type === "Member") {
      const objT = this.inferExpr(node.left.obj);
      if (objT && objT.props) {
        const prop = objT.props.find((p) => p.name === node.left.prop);
        if (prop)
          this.checkAssignable(prop.type, right, node.loc, `propriedade "${node.left.prop}"`);
      }
    }
  }

  checkFunction(node) {
    this.define(node.name, {
      kind: "fn",
      name: node.name,
      params: node.params,
      paramTypes: node.paramTypes,
      returnType: node.returnType || "sla",
      typeParams: node.typeParams,
    });

    this.pushScope();
    const savedTypeParams = this.inTypeParams;
    if (node.typeParams) {
      this.inTypeParams = new Set(node.typeParams);
      node.typeParams.forEach((tp) => this.define(tp, "sla"));
    }
    if (node.paramTypes) {
      node.params.forEach((p, i) => {
        this.define(p, node.paramTypes[i] || "sla");
      });
    }
    const savedReturn = this.inFunctionReturn;
    this.inFunctionReturn = node.returnType || "sla";
    this.checkStmt(node.body);
    this.inFunctionReturn = savedReturn;
    this.inTypeParams = savedTypeParams;
    this.popScope();
  }

  checkClass(node) {
    this.define(node.name, {
      kind: "class",
      name: node.name,
      props: [],
      methods: node.methods,
      superClass: node.superClass,
    });

    this.pushScope();
    this.define("esse-cara", { name: node.name, args: null, props: [] });
    for (const m of node.methods || []) {
      this.pushScope();
      if (m.paramTypes) {
        m.params.forEach((p, i) => {
          this.define(p, m.paramTypes[i] || "sla");
        });
      } else {
        m.params.forEach((p) => this.define(p, "sla"));
      }
      const savedReturn = this.inFunctionReturn;
      this.inFunctionReturn = m.returnType || "sla";
      this.checkStmt(m.body);
      this.inFunctionReturn = savedReturn;
      this.popScope();
    }
    this.popScope();
  }

  checkAssignable(expectedT, foundT, loc, what) {
    const exp = this.resolveType(expectedT);
    const found = this.resolveType(foundT);
    const before = this.errors.length;

    const expStr = typeToStr(exp);
    const foundStr = typeToStr(found);

    if (foundStr === "sla" || expStr === "sla") return;
    if (expStr === foundStr) return;

    if (this.inTypeParams && this.inTypeParams.has(expStr)) return;
    if (this.inTypeParams && this.inTypeParams.has(foundStr)) return;

    const expName = exp.name || expStr.split("<")[0];
    const foundName = found.name || foundStr.split("<")[0];

    if (expName === "sepah") {
      const inner = (exp.args && exp.args[0]) || "sla";
      if (foundStr === "eh-nada") return;
      if (foundName === inner) return;
      if (this.silentAssign(inner, found)) return;
    }

    if (expName === "depende") {
      if (exp.args && exp.args.some((a) => this.silentAssign(a, found))) return;
    }

    if (expName === "sus" && foundName === "sus") {
      if (exp.args && found.args && this.silentAssign(exp.args[0], found.args[0])) return;
    }

    if (expName === "crush" && foundName === "sus") {
      if (this.tupleAssignable(exp.args, found)) return;
    }

    if (expName === "promessa") {
      const inner = (exp.args && exp.args[0]) || "sla";
      if (this.silentAssign(inner, found)) return;
    }

    if (expName === "bagulho") return;
    if (expName === "eh-nada" && foundStr === "eh-nada") return;
    if (expName === "nah") return;

    if (expName === "vdd?" && (foundStr === "verdadeiro" || foundStr === "falso")) return;

    const expReg = this.globals.get(expName);
    if (expReg && (expReg.kind === "type" || expReg.kind === "table") && expReg.props) {
      if (foundStr.startsWith("{")) {
        if (this.silentStructAssign(expReg.props, found)) return;
      }
    }

    if (expReg && expReg.kind === "type" && expReg.union) {
      if (expReg.union.some((u) => this.silentAssign(u, found))) return;
    }

    if (foundStr.startsWith("{") && expStr.startsWith("{")) {
      return;
    }

    this.errors.length = before;
    this.typeMismatch(exp, found, loc, what);
  }

  silentAssign(expectedT, foundT) {
    const before = this.errors.length;
    this.checkAssignable(expectedT, foundT, null, "");
    if (this.errors.length > before) {
      this.errors.length = before;
      return false;
    }
    return true;
  }

  silentStructAssign(expectedProps, found) {
    const before = this.errors.length;
    const ok = this.structAssignable(expectedProps, found);
    if (this.errors.length > before) {
      this.errors.length = before;
    }
    return ok;
  }

  tupleAssignable(expectedTypes, found) {
    if (!found || !found.args || found.args.length !== expectedTypes.length) return false;
    for (let i = 0; i < expectedTypes.length; i++) {
      if (!this.silentAssign(expectedTypes[i], found.args[i])) return false;
    }
    return true;
  }

  structAssignable(expectedProps, found) {
    if (!found || !found.args) return false;
    for (const ep of expectedProps) {
      const fp = found.args.find((a) => a.name === ep.name);
      if (!fp) return false;
      const expT = ep.type;
      const foundT = fp.propType || "sla";
      if (!this.silentAssign(expT, foundT)) return false;
    }
    return true;
  }

  checkableAssign(expectedT, foundT) {
    const before = this.errors.length;
    this.checkAssignable(expectedT, foundT, null, "");
    return this.errors.length === before;
  }

  inferExpr(node) {
    if (!node) return "sla";
    switch (node.type) {
      case "Num":
        return "eh-numero";
      case "Str":
        return "eh-palavra";
      case "Bool":
        return "vdd?";
      case "Nil":
        return "eh-nada";
      case "Ident": {
        const t = this.lookup(node.name);
        if (t && typeof t === "object" && t.kind === "type")
          return t.repr ? typeToStr(t.repr) : node.name;
        if (t && typeof t === "object" && t.kind === "table") return t;
        return t ? typeToStr(t) : node.name;
      }
      case "ThisExpr":
        return "sla";
      case "ArrayExpr": {
        const items = node.items.map((i) =>
          i.type === "Spread" ? this.inferExpr(i.arg) : this.inferExpr(i)
        );
        if (items.length === 0) return { name: "sus", args: [{ name: "sla", args: null }], items };
        const distinct = [...new Set(items.map(typeToStr))];
        if (distinct.length === 1) {
          return { name: "sus", args: [items[0]], items };
        }
        return { name: "crush", args: items, items };
      }
      case "ObjectExpr": {
        return {
          name: "{",
          args: node.props.map((p) =>
            p.spread
              ? {
                  name: p.value.type === "Ident" ? p.value.name : "sla",
                  args: null,
                  propType: this.inferExpr(p.value),
                }
              : { name: p.key, args: null, propType: this.inferExpr(p.value) }
          ),
        };
      }
      case "Binary": {
        const l = this.inferExpr(node.left);
        const r = this.inferExpr(node.right);
        const op = node.op;
        if (op === "+") {
          if (l === "eh-palavra" || r === "eh-palavra") return "eh-palavra";
          return "eh-numero";
        }
        if (op === "**") return "eh-numero";
        if (["-", "*", "/", "%", "<<", ">>", "&", "|", "^"].includes(op)) return "eh-numero";
        if (["==", "!=", "===", "!==", ">", "<", ">=", "<=", "&&", "||"].includes(op))
          return "vdd?";
        if (op === "??") {
          if (l === "eh-nada") return r;
          if (r === "eh-nada") return l;
          if (l === r) return l;
          return { name: "depende", args: [l, r] };
        }
        return "sla";
      }
      case "Unary": {
        const op = node.op;
        if (op === "!") return "vdd?";
        if (op === "-" || op === "~") return "eh-numero";
        return "sla";
      }
      case "TypeOf": {
        this.inferExpr(node.arg);
        return "eh-palavra";
      }
      case "InstanceOf": {
        this.inferExpr(node.arg);
        this.inferExpr(node.cls);
        return "vdd?";
      }
      case "OptionalMember": {
        const objT = this.inferExpr(node.obj);
        if (objT && objT.props) {
          const prop = objT.props.find((p) => p.name === node.prop);
          if (prop) return prop.propType || prop.type || "sla";
        }
        if (objT && objT.methods) {
          const m = objT.methods.find((m) => m.name === node.prop);
          if (m) return m.returnType || "sla";
        }
        return "sla";
      }
      case "Ternary": {
        const cons = this.inferExpr(node.cons);
        const alt = this.inferExpr(node.alt);
        if (cons === alt) return cons;
        return { name: "depende", args: [cons, alt] };
      }
      case "Call": {
        return this.inferCall(node);
      }
      case "Member": {
        const objT = this.inferExpr(node.obj);
        if (objT && objT.props) {
          const prop = objT.props.find((p) => p.name === node.prop);
          if (prop) return prop.propType || prop.type || "sla";
        }
        if (objT && objT.methods) {
          const m = objT.methods.find((m) => m.name === node.prop);
          if (m) return m.returnType || "sla";
        }
        return "sla";
      }
      case "IndexExpr": {
        const objT = this.inferExpr(node.obj);
        if (objT && objT.name === "sus") {
          return objT.args && objT.args[0] ? objT.args[0] : "sla";
        }
        if (typeof objT === "string" && objT.startsWith("sus<")) {
          const inner = objT.slice(4, -1);
          return inner;
        }
        return "sla";
      }
      case "NewExpr": {
        if (node.callee.type === "Ident") {
          const t = this.lookup(node.callee.name);
          if (t && t.kind === "class") return { name: node.callee.name, args: null, props: [] };
          return node.callee.name;
        }
        return "sla";
      }
      case "ArrowFunction":
        return { name: "faz-ai", args: null };
      case "Template":
        return "eh-palavra";
      case "ImportExpr":
        return "sla";
      default:
        return "sla";
    }
  }

  inferCall(node) {
    if (node.callee.type === "Ident") {
      const name = node.callee.name;
      if (BUILTIN_FUNCS[name]) {
        const sig = BUILTIN_FUNCS[name];
        node.args.forEach((a) => this.inferExpr(a));
        return sig.ret;
      }
      const fnT = this.lookup(name);
      if (fnT && fnT.kind === "fn") {
        const savedTypeParams = this.inTypeParams;
        if (fnT.typeParams) this.inTypeParams = new Set(fnT.typeParams);
        if (fnT.paramTypes) {
          fnT.params.forEach((p, i) => {
            if (node.args[i]) {
              const at = this.inferExpr(node.args[i]);
              const pt = fnT.paramTypes[i];
              if (pt && node.args[i]) {
                this.checkAssignable(pt, at, node.args[i].loc, `argumento "${p}" de ${name}()`);
              }
            }
          });
        } else {
          node.args.forEach((a) => this.inferExpr(a));
        }
        this.inTypeParams = savedTypeParams;
        return fnT.returnType || "sla";
      }
      node.args.forEach((a) => this.inferExpr(a));
      return "sla";
    }
    if (node.callee.type === "Member") {
      const objT = this.inferExpr(node.callee.obj);
      if (objT && objT.methods) {
        const m = objT.methods.find((m) => m.name === node.callee.prop);
        if (m) {
          if (m.paramTypes) {
            m.params.forEach((p, i) => {
              if (node.args[i]) {
                const at = this.inferExpr(node.args[i]);
                const pt = m.paramTypes[i];
                if (pt)
                  this.checkAssignable(pt, at, node.args[i].loc, `argumento "${p}" de ${m.name}()`);
              }
            });
          } else {
            node.args.forEach((a) => this.inferExpr(a));
          }
          return m.returnType || "sla";
        }
      }
      if (objT && objT.kind === "table") {
        const prop = node.callee.prop;
        if (prop === "bota-ai") {
          if (node.args[0]) {
            const at = this.inferExpr(node.args[0]);
            this.checkAssignable(objT.name, at, node.args[0].loc, "bota-ai");
          }
          return { name: objT.name, args: null };
        }
        if (prop === "vê" || prop === "achaOnde") {
          return { name: "sus", args: [{ name: objT.name, args: null, props: objT.props }] };
        }
        if (prop === "acha") {
          return { name: objT.name, args: null };
        }
        if (prop === "quantos?") {
          return "eh-numero";
        }
        if (prop === "altera" || prop === "alterakkkk") {
          if (node.args[1]) {
            const at = this.inferExpr(node.args[1]);
            if (at.name === "{") this.silentStructAssign(objT.props, at);
          }
          return { name: objT.name, args: null };
        }
        if (prop === "apaga-ae" || prop === "limpar") {
          return { name: objT.name, args: null };
        }
      }
      node.args.forEach((a) => this.inferExpr(a));
      return "sla";
    }
    node.args.forEach((a) => this.inferExpr(a));
    return "sla";
  }
}

export function checkTypes(ast) {
  const checker = new TypeChecker();
  return checker.checkProgram(ast);
}
