export class ReturnSignal {
  constructor(value) {
    this.value = value;
  }
}

export async function interpret(node, env) {
  switch (node.type) {
    case "Program": {
      let result;
      for (const stmt of node.body) {
        result = await interpret(stmt, env);
      }
      return result;
    }
    case "Block": {
      let result;
      for (const stmt of node.body) {
        result = await interpret(stmt, env);
      }
      return result;
    }
    case "VarDecl": {
      const val = await interpret(node.init, env);
      env[node.id] = val;
      return val;
    }
    case "Assign": {
      const val = await interpret(node.right, env);
      env[node.left.name] = val;
      return val;
    }
    case "Num":
      return node.value;
    case "Str":
      return node.value;
    case "Bool":
      return node.value;
    case "Nil":
      return null;
    case "Ident": {
      if (!(node.name in env)) {
        throw new Error(`${node.name} is not defined`);
      }
      return env[node.name];
    }
    case "Unary": {
      const v = await interpret(node.arg, env);
      switch (node.op) {
        case "-":
          return -v;
        case "!":
          return !v;
      }
      break;
    }
    case "Binary": {
      if (node.op === "&&") {
        const l = await interpret(node.left, env);
        if (!l) return l;
        return interpret(node.right, env);
      }
      if (node.op === "||") {
        const l = await interpret(node.left, env);
        if (l) return l;
        return interpret(node.right, env);
      }
      const l = await interpret(node.left, env);
      const r = await interpret(node.right, env);
      switch (node.op) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          return l / r;
        case "==":
          return l == r;
        case "!=":
          return l != r;
        case ">":
          return l > r;
        case "<":
          return l < r;
        case ">=":
          return l >= r;
        case "<=":
          return l <= r;
      }
      break;
    }
    case "IfStmt": {
      const test = await interpret(node.test, env);
      if (test) {
        return interpret(node.cons, env);
      }
      if (node.alt) {
        return interpret(node.alt, env);
      }
      return null;
    }
    case "ForStmt": {
      if (node.init) {
        await interpret(node.init, env);
      }
      while (await interpret(node.test, env)) {
        await interpret(node.body, env);
        if (node.update) {
          await interpret(node.update, env);
        }
      }
      return null;
    }
    case "FunctionDecl": {
      const fn = async (...args) => {
        const scope = Object.create(env);
        node.params.forEach((p, i) => { scope[p] = args[i]; });
        try {
          return await interpret(node.body, scope);
        } catch (e) {
          if (e instanceof ReturnSignal) {
            return e.value;
          }
          throw e;
        }
      };
      env[node.name] = fn;
      return fn;
    }
    case "ReturnStmt": {
      let val = null;
      if (node.arg) {
        val = await interpret(node.arg, env);
      }
      throw new ReturnSignal(val);
    }
    case "Call": {
      const fn = await interpret(node.callee, env);
      const args = [];
      for (const a of node.args) {
        args.push(await interpret(a, env));
      }
      if (typeof fn !== "function") {
        throw new Error("Tentando chamar algo que não é função");
      }
      return await fn(...args);
    }
    case "Member": {
      const obj = await interpret(node.obj, env);
      return obj[node.prop];
    }
    case "ImportExpr": {
      return await env.__IMPORT__(node.path);
    }
    case "ExportStmt":
      return null;
    case "ArrayExpr": {
      const arr = [];
      for (const item of node.items) {
        arr.push(await interpret(item, env));
      }
      return arr;
    }
    case "ObjectExpr": {
      const obj = {};
      for (const p of node.props) {
        obj[p.key] = await interpret(p.value, env);
      }
      return obj;
    }
    case "ArrowFunction": {
      const fn = async (...args) => {
        const scope = Object.create(env);
        node.params.forEach((p, i) => { scope[p] = args[i]; });
        if (node.body.type === "Block") {
          return interpret(node.body, scope);
        }
        return interpret(node.body, scope);
      };
      return fn;
    }
    case "TryCatchStmt": {
      try {
        return await interpret(node.tryBlock, env);
      } catch (e) {
        const scope = Object.create(env);
        scope[node.catchParam] = e;
        return interpret(node.catchBlock, scope);
      }
    }
    case "IndexExpr": {
      const obj = await interpret(node.obj, env);
      const index = await interpret(node.index, env);
      return obj[index];
    }
    default:
      throw new Error("Node não suportado: " + node.type);
  }
}