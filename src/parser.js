import * as A from "./ast.js";
import { XSError, expected, undefinedVar, invalidSyntax, didYouMean } from "./errors.js";
import { lex } from "./lexer.js";

const PRECEDENCE = {
  "?": 0,
  "||": 1,
  "&&": 2,
  "??": 3,
  "|": 4,
  "^": 5,
  "&": 6,
  "==": 7,
  "!=": 7,
  "~=": 7,
  "===": 7,
  "!==": 7,
  "<": 8,
  "<=": 8,
  ">": 8,
  ">=": 8,
  "<<": 9,
  ">>": 9,
  "+": 10,
  "-": 10,
  "*": 11,
  "/": 11,
  "%": 11,
  "**": 12,
};

const BUILTIN_KEYWORDS = new Set([
  "grita-ae",
  "sussurra",
  "horinha",
  "stalkeia",
  "aguenta-ai",
  "escolhe",
  "desembola",
  "bisbilhota",
  "escuta",
  "terminamos!",
  "traduz-ai",
  "tamanho",
  "divide-texto",
  "encontra",
  "decodifica-url",
  "juntar",
]);

const KEYWORD_NAMES = new Set([
  "cria",
  "lei",
  "fofoca",
  "se-pah",
  "ai",
  "repete-na-moral",
  "repete-enquanto",
  "resolve",
  "volta",
  "traz-ai",
  "manda-ai",
  "verdadeiro",
  "falso",
  "nulo",
  "tenta",
  "fodeu",
  "no-fim",
  "mete-o-pe",
  "segue-o-baile",
  "assincrono",
  "classe",
  "herda",
  "spawna",
  "esse-cara",
  "novo",
  "metodo",
  "vai-de",
  "se-for",
  "se-nao-der",
  "ve-se",
  "bateu-com",
  "qualquer-coisa",
  "crush",
  "deu-match",
  "date",
  "tarefa",
  "DB",
  "tpm",
  "tipo",
  "crud",
  "tipo-de",
  "instancia-de",
  "vdd?",
  ...BUILTIN_KEYWORDS,
]);

export function parse(tokens) {
  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++];
  const expect = (t) => {
    const tok = next();
    if (tok.type !== t) {
      const err = expected(tok.type, t, tok.loc);
      err.message = `Expected \`${t}\`, found \`${tok.type}\``;
      if (tok.value) err.message += ` (\`${tok.value}\`)`;
      if (tok.value) {
        const sugg = didYouMean(String(tok.value), KEYWORD_NAMES, 2);
        if (sugg) err.suggestion = sugg;
      }
      throw err;
    }
    A.setLoc(tok.loc);
    return tok;
  };
  const matchSeq = (...types) => {
    for (let k = 0; k < types.length; k++) {
      if (tokens[i + k]?.type !== types[k]) return false;
    }
    return true;
  };
  const isPropName = (t) => t.type === "IDENT" || KEYWORD_NAMES.has(t.type);

  function parsePropName() {
    const tok = next();
    if (!isPropName(tok)) {
      const err = expected(tok.type, "IDENT", tok.loc);
      err.message = `Expected \`IDENT\`, found \`${tok.type}\``;
      if (tok.value) err.message += ` (\`${tok.value}\`)`;
      throw err;
    }
    A.setLoc(tok.loc);
    return tok.value;
  }

  function parseProgram() {
    const body = [];
    A.setLoc(peek().loc);
    while (peek().type !== "EOF") {
      body.push(parseStmt());
    }
    expect("EOF");
    return A.Program(body);
  }

  function parseFunction() {
    expect("resolve");
    const nameTok = next();
    A.setLoc(nameTok.loc);
    if (!isPropName(nameTok)) {
      const err = expected(nameTok.type, "IDENT", nameTok.loc);
      err.message = `Expected \`IDENT\`, found \`${nameTok.type}\``;
      if (nameTok.value) err.message += ` (\`${nameTok.value}\`)`;
      throw err;
    }
    const name = nameTok.value;

    let typeParams = null;
    if (peek().type === "<") {
      next();
      typeParams = [];
      if (peek().type !== ">") {
        do {
          typeParams.push(expect("IDENT").value);
          if (peek().type !== ",") break;
          next();
        } while (true);
      }
      expect(">");
    }

    expect("(");
    const params = [];
    const paramTypes = [];
    if (peek().type !== ")") {
      do {
        const p = expect("IDENT");
        params.push(p.value);
        if (peek().type === ":") {
          next();
          paramTypes.push(parseType());
        } else {
          paramTypes.push(null);
        }
        if (peek().type !== ",") break;
        next();
      } while (true);
    }
    expect(")");

    let returnType = null;
    if (peek().type === ":") {
      next();
      returnType = parseType();
    }

    const body = parseBlock();
    return A.FunctionDecl(name, params, body, paramTypes, returnType, typeParams);
  }

  function parseReturn() {
    expect("volta");
    A.setLoc(peek().loc);
    let arg = null;
    if (peek().type !== "}" && peek().type !== "EOF" && peek().type !== ")") arg = parseExpr();
    optionalSemicolon();
    return A.ReturnStmt(arg);
  }

  function parseExport() {
    expect("manda-ai");
    const nameTok = next();
    A.setLoc(nameTok.loc);
    if (!isPropName(nameTok)) {
      const err = expected(nameTok.type, "IDENT", nameTok.loc);
      err.message = `Expected \`IDENT\`, found \`${nameTok.type}\``;
      if (nameTok.value) err.message += ` (\`${nameTok.value}\`)`;
      throw err;
    }
    optionalSemicolon();
    return A.ExportStmt(nameTok.value);
  }

  function parseStmt() {
    const startLoc = peek().loc;
    const stmt = parseStmtInner();
    if (stmt && typeof stmt === "object" && stmt.loc) {
      stmt.loc = { ...startLoc };
    }
    return stmt;
  }

  function parseStmtInner() {
    A.setLoc(peek().loc);

    if (peek().type === "manda-ai") return parseExport();
    if (peek().type === "resolve") return parseFunction();
    if (peek().type === "volta") return parseReturn();
    if (peek().type === "tipo") return parseTypeDecl();
    if (peek().type === "cria" || peek().type === "lei" || peek().type === "fofoca")
      return parseVarDecl();
    if (peek().type === "se-pah") return parseIf();
    if (peek().type === "repete-na-moral") return parseFor();
    if (peek().type === "repete-enquanto") return parseWhile();
    if (peek().type === "tenta") return parseTryCatch();
    if (peek().type === "mete-o-pe") {
      next();
      if (peek().type === "(") {
        next();
        expect(")");
      }
      optionalSemicolon();
      return A.BreakStmt();
    }
    if (peek().type === "segue-o-baile") {
      next();
      if (peek().type === "(") {
        next();
        expect(")");
      }
      optionalSemicolon();
      return A.ContinueStmt();
    }
    if (peek().type === "traz-ai") return parseImport();
    if (peek().type === "classe") return parseClass();
    if (peek().type === "vai-de") return parseSwitch();
    if (peek().type === "ve-se") return parseMatch();
    if (peek().type === "crush") return parseTest();
    if (peek().type === "tarefa") return parseTask();
    if (peek().type === "deu-match") return parseAssert();
    if (peek().type === "date") return parseAssertEqual();
    if (peek().type === "DB") return parseTable();
    if (peek().type === "tpm") return parseMacro();

    const expr = parseExpr();
    optionalSemicolon();
    return expr;
  }

  function parseTest() {
    expect("crush");
    A.setLoc(peek().loc);
    let name;
    if (peek().type === "(") {
      next();
      name = expect("STRING").value;
      expect(")");
    } else {
      name = expect("STRING").value;
    }
    const body = parseBlock();
    return A.TestStmt(name, body);
  }

  function parseAssert() {
    expect("deu-match");
    expect("(");
    A.setLoc(peek().loc);
    const test = parseExpr();
    expect(")");
    optionalSemicolon();
    return A.AssertStmt(test, null);
  }

  function parseAssertEqual() {
    expect("date");
    expect("(");
    A.setLoc(peek().loc);
    const a = parseExpr();
    expect(",");
    const b = parseExpr();
    expect(")");
    optionalSemicolon();
    return A.Call(A.Ident("date"), [a, b]);
  }

  function parseTask() {
    expect("tarefa");
    A.setLoc(peek().loc);
    let name;
    if (peek().type === "(") {
      next();
      name = expect("STRING").value;
      expect(")");
    } else if (peek().type === "STRING") {
      name = next().value;
    } else {
      name = expect("IDENT").value;
    }
    const body = parseBlock();
    return A.TaskDecl(name, body);
  }

  function parseTable() {
    expect("DB");
    const nameTok = expect("IDENT");
    A.setLoc(nameTok.loc);
    expect("{");
    const props = [];
    while (peek().type !== "}") {
      const propName = expect("IDENT").value;
      expect(":");
      const typeTok = next();
      const val = typeTok.value || typeTok.type;
      props.push(A.TableProp(propName, val));
      if (peek().type === ",") next();
    }
    expect("}");
    return A.TableDecl(nameTok.value, props);
  }

  function parseMacro() {
    expect("tpm");
    const nameTok = expect("IDENT");
    A.setLoc(nameTok.loc);
    expect("(");
    const params = [];
    if (peek().type !== ")") {
      do {
        params.push(expect("IDENT").value);
        if (peek().type !== ",") break;
        next();
      } while (true);
    }
    expect(")");
    const body = parseBlock();
    return A.MacroDecl(nameTok.value, params, body);
  }

  function parseBlock() {
    expect("{");
    A.setLoc(peek().loc);
    const body = [];
    while (peek().type !== "}") body.push(parseStmt());
    expect("}");
    return A.Block(body);
  }

  const TYPE_NAMES = new Set([
    "eh-numero",
    "eh-palavra",
    "vdd?",
    "eh-nada",
    "nah",
    "sla",
    "data",
    "nunca",
    "sus",
    "bagulho",
    "faz-ai",
    "classe",
    "depende",
    "crush",
    "sepah",
    "promessa",
  ]);

  function isTypeName(t) {
    if (t.type === "IDENT") return true;
    return TYPE_NAMES.has(t.value);
  }

  function parseType() {
    const nameTok = next();
    if (!isTypeName(nameTok)) {
      const err = expected(nameTok.type, "tipo", nameTok.loc);
      err.message = `Expected a type, found \`${nameTok.type}\``;
      if (nameTok.value) err.message += ` (\`${nameTok.value}\`)`;
      throw err;
    }
    A.setLoc(nameTok.loc);
    const name = nameTok.value || nameTok.type;

    if (peek().type === "<") {
      next();
      const args = [];
      if (peek().type !== ">") {
        do {
          args.push(parseType());
          if (peek().type !== ",") break;
          next();
        } while (true);
      }
      expect(">");
      return { name, args, loc: nameTok.loc };
    }

    return { name, args: null, loc: nameTok.loc };
  }

  function parseTypeDecl() {
    expect("tipo");
    const nameTok = expect("IDENT");
    A.setLoc(nameTok.loc);
    const name = nameTok.value;

    if (peek().type === "=") {
      next();
      const kinds = [];
      do {
        if (peek().type === "(") {
          const fn = parseFunctionType();
          kinds.push({ kind: "fn", fn });
        } else {
          kinds.push(parseType());
        }
        if (peek().type !== "|") break;
        next();
      } while (true);

      if (kinds.length === 1 && kinds[0].kind === "fn") {
        return A.TypeDecl(name, "fn", null, kinds[0].fn);
      }
      if (kinds.length === 1) {
        return A.TypeDecl(name, "alias", kinds[0], null);
      }
      return A.TypeDecl(name, "union", null, kinds);
    }

    expect("{");
    const props = [];
    while (peek().type !== "}") {
      const propName = expect("IDENT").value;
      expect(":");
      const propType = parseType();
      props.push({ name: propName, type: propType });
      if (peek().type === ",") {
        next();
        continue;
      }
      if (peek().type === "IDENT" && tokens[i + 1]?.type === ":") continue;
      break;
    }
    expect("}");
    return A.TypeDecl(name, "struct", null, props);
  }

  function parseFunctionType() {
    expect("(");
    const params = [];
    const paramTypes = [];
    if (peek().type !== ")") {
      do {
        params.push(expect("IDENT").value);
        if (peek().type === ":") {
          next();
          paramTypes.push(parseType());
        } else {
          paramTypes.push(null);
        }
        if (peek().type !== ",") break;
        next();
      } while (true);
    }
    expect(")");
    expect("=>");
    const returnType = parseType();
    return { params, paramTypes, returnType };
  }

  function parseVarDecl(expectSemi = true) {
    const kindTok = next().type;
    const kind = kindTok === "lei" ? "const" : kindTok === "fofoca" ? "global" : "var";
    A.setLoc(peek().loc);
    let lvalue;
    if (peek().type === "esse-cara") {
      next();
      lvalue = A.ThisExpr();
    } else {
      const idTok = expect("IDENT");
      A.setLoc(idTok.loc);
      lvalue = A.Ident(idTok.value);
    }
    let type = null;
    if (peek().type === ":") {
      next();
      type = parseType();
    }
    while (peek().type === ".") {
      next();
      const prop = parsePropName();
      lvalue = A.Member(lvalue, prop);
    }
    while (peek().type === "[") {
      next();
      const idx = parseExpr();
      expect("]");
      lvalue = A.IndexExpr(lvalue, idx);
    }
    let init = null;
    if (peek().type === "=") {
      next();
      init = parseExpr();
    }
    if (expectSemi) optionalSemicolon();
    if (lvalue.type === "Ident") {
      return { ...A.VarDecl(lvalue.name, init, null, kind), typeHint: type };
    }
    if (init === null) {
      throw invalidSyntax(
        `declaration "${kindTok.value}" on a member or index requires an initializer`,
        peek().loc
      );
    }
    return { ...A.Assign(lvalue, init), typeHint: type };
  }

  function parseIf() {
    expect("se-pah");
    expect("(");
    A.setLoc(peek().loc);
    const test = parseExpr();
    expect(")");
    const cons = parseBlock();
    let alt = null;
    if (peek().type === "ai") {
      next();
      if (peek().type === "se-pah") {
        alt = parseIf();
      } else {
        alt = parseBlock();
      }
    }
    return A.IfStmt(test, cons, alt);
  }

  function parseFor() {
    expect("repete-na-moral");
    expect("(");
    A.setLoc(peek().loc);

    let init = null;

    if (peek().type !== ";") {
      if (peek().type === "cria") {
        init = parseVarDecl(false);
      } else {
        init = parseExpr();
      }
    }

    expect(";");

    const test = parseExpr();
    expect(";");

    const update = parseExpr();
    expect(")");

    const body = parseBlock();

    return A.ForStmt(init, test, update, body);
  }

  function parseWhile() {
    expect("repete-enquanto");
    expect("(");
    A.setLoc(peek().loc);
    const test = parseExpr();
    expect(")");
    const body = parseBlock();
    return A.WhileStmt(test, body);
  }

  function parseImport() {
    expect("traz-ai");
    A.setLoc(peek().loc);

    let target;

    if (peek().type === "STRING") {
      target = next().value;
    } else {
      target = expect("IDENT").value;
    }

    let alias = null;
    if (peek().type === "IDENT" && peek().value?.toLowerCase() === "as") {
      next();
      alias = expect("IDENT").value;
    }

    optionalSemicolon();
    return A.ImportStmt(target, alias);
  }

  function parseParamList() {
    expect("(");
    const params = [];
    const paramTypes = [];
    if (peek().type !== ")") {
      do {
        const p = expect("IDENT");
        params.push(p.value);
        if (peek().type === ":") {
          next();
          paramTypes.push(parseType());
        } else {
          paramTypes.push(null);
        }
        if (peek().type !== ",") break;
        next();
      } while (true);
    }
    expect(")");
    return { params, paramTypes };
  }

  function parseClass() {
    expect("classe");
    const nameTok = expect("IDENT");
    A.setLoc(nameTok.loc);
    const name = nameTok.value;
    let superClass = null;
    if (peek().type === "herda") {
      next();
      superClass = expect("IDENT").value;
    }
    expect("{");
    const methods = [];
    while (peek().type !== "}") {
      if (peek().type === "spawna") {
        next();
        A.setLoc(peek().loc);
        const { params, paramTypes } = parseParamList();
        const body = parseBlock();
        methods.push(A.Method(null, params, body, true, paramTypes, null));
      } else if (peek().type === "metodo" || peek().type === "IDENT") {
        next();
        const mNameTok = expect("IDENT");
        A.setLoc(mNameTok.loc);
        const { params, paramTypes } = parseParamList();
        let returnType = null;
        if (peek().type === ":") {
          next();
          returnType = parseType();
        }
        const body = parseBlock();
        methods.push(A.Method(mNameTok.value, params, body, false, paramTypes, returnType));
      } else {
        const err = invalidSyntax("Expected metodo, spawna, or herda in class", peek().loc);
        throw err;
      }
    }
    expect("}");
    return A.ClassDecl(name, superClass, methods);
  }

  function parseSwitch() {
    expect("vai-de");
    expect("(");
    A.setLoc(peek().loc);
    const test = parseExpr();
    expect(")");
    expect("{");
    const cases = [];
    while (peek().type !== "}") {
      if (peek().type === "se-for") {
        next();
        A.setLoc(peek().loc);
        const value = parseExpr();
        expect(":");
        const body = parseStmt();
        cases.push(A.SwitchCase(value, body));
      } else if (peek().type === "se-nao-der") {
        next();
        expect(":");
        A.setLoc(peek().loc);
        const body = parseStmt();
        cases.push(A.SwitchCase(null, body));
      } else {
        const err = invalidSyntax("Expected se-for or se-nao-der in vai-de", peek().loc);
        throw err;
      }
    }
    expect("}");
    return A.SwitchStmt(test, cases);
  }

  function parseMatch() {
    expect("ve-se");
    expect("(");
    A.setLoc(peek().loc);
    const test = parseExpr();
    expect(")");
    expect("{");
    const cases = [];
    while (peek().type !== "}") {
      if (peek().type === "bateu-com") {
        next();
        A.setLoc(peek().loc);
        const pattern = parsePattern();
        let guard = null;
        if (peek().type === "=>") {
          next();
          const body = parseExpr();
          cases.push(A.MatchCase(pattern, body, guard));
        } else if (peek().type === "->") {
          next();
          const body = parseExpr();
          cases.push(A.MatchCase(pattern, body, guard));
        } else {
          expect(":");
          const body = parseStmt();
          cases.push(A.MatchCase(pattern, body, guard));
        }
        if (peek().type === ",") next();
      } else if (peek().type === "qualquer-coisa") {
        next();
        A.setLoc(peek().loc);
        if (peek().type === "=>") {
          next();
          const body = parseExpr();
          cases.push(A.MatchCase(null, body, null));
        } else if (peek().type === "->") {
          next();
          const body = parseExpr();
          cases.push(A.MatchCase(null, body, null));
        } else {
          expect(":");
          const body = parseStmt();
          cases.push(A.MatchCase(null, body, null));
        }
      } else {
        const err = invalidSyntax("Expected bateu-com or qualquer-coisa in ve-se", peek().loc);
        throw err;
      }
    }
    expect("}");
    return A.MatchExpr(test, cases);
  }

  function parsePattern() {
    A.setLoc(peek().loc);
    const t = peek();

    if (t.type === "NUMBER") {
      next();
      return A.PatternLiteral(t.value);
    }
    if (t.type === "STRING") {
      next();
      return A.PatternLiteral(t.value);
    }
    if (t.type === "verdadeiro") {
      next();
      return A.PatternLiteral(true);
    }
    if (t.type === "falso") {
      next();
      return A.PatternLiteral(false);
    }
    if (t.type === "nulo") {
      next();
      return A.PatternLiteral(null);
    }

    if (t.type === "[") {
      next();
      const elements = [];
      while (peek().type !== "]") {
        if (peek().type === "...") {
          next();
          elements.push(A.PatternRest());
          break;
        }
        elements.push(parsePattern());
        if (peek().type !== ",") break;
        next();
      }
      expect("]");
      return A.PatternArray(elements);
    }

    if (t.type === "{") {
      next();
      const props = [];
      while (peek().type !== "}") {
        const key = parsePropName();
        A.setLoc(peek().loc);
        if (peek().type === ":") {
          next();
          props.push({ key, pattern: parsePattern() });
        } else {
          props.push({ key, pattern: A.PatternIdent(key) });
        }
        if (peek().type !== ",") break;
        next();
      }
      expect("}");
      return A.PatternObject(props);
    }

    if (t.type === "IDENT" && t.value === "_") {
      next();
      return A.PatternIdent("_");
    }

    if (t.type === "IDENT") {
      next();
      return A.PatternIdent(t.value);
    }

    const err = invalidSyntax("Unexpected pattern: " + t.type, t.loc);
    throw err;
  }

  function optionalSemicolon() {
    if (peek().type === ";") next();
  }

  function parseExpr() {
    return parseAssignment();
  }

  function parseAssignment() {
    let left = parseBinary(0);
    const compoundOps = {
      "+=": "+",
      "-=": "-",
      "*=": "*",
      "/=": "/",
      "%=": "%",
      "|=": "|",
      "&=": "&",
      "^=": "^",
      "<<=": "<<",
      ">>=": ">>",
      "**=": "**",
      "&&=": "&&",
      "||=": "||",
      "??=": "??",
    };
    if (peek().type === "=" || compoundOps[peek().type]) {
      const op = next().type;
      const right = parseAssignment();
      if (left.type !== "Ident" && left.type !== "Member" && left.type !== "IndexExpr") {
        const err = invalidSyntax("Invalid left-hand side in assignment", peek().loc);
        throw err;
      }
      if (op === "=") return A.Assign(left, right);
      if (op === "??=") return A.Assign(left, A.Binary("??", left, right));
      return A.Assign(left, A.Binary(compoundOps[op], left, right));
    }
    return left;
  }

  function parseBinary(minPrec) {
    let left = parseUnary();
    A.setLoc(peek().loc);
    while (true) {
      const op = peek().type;
      const prec = PRECEDENCE[op];
      if (prec === undefined || prec < minPrec) break;
      next();
      if (op === "?") {
        const cons = parseExpr();
        expect(":");
        const alt = parseBinary(prec);
        left = A.Ternary(left, cons, alt);
      } else {
        const right = parseBinary(op === "**" ? prec : prec + 1);
        left = A.Binary(op, left, right);
      }
    }
    return left;
  }

  function parseUnary() {
    if (peek().type === "++" || peek().type === "--") {
      const op = next().type;
      A.setLoc(peek().loc);
      return A.UpdateExpr(op, parseUnary(), true);
    }
    if (peek().type === "-" || peek().type === "!" || peek().type === "~") {
      const op = next().type;
      A.setLoc(peek().loc);
      return A.Unary(op, parseUnary());
    }
    return parseCall();
  }

  function parseCall() {
    A.setLoc(peek().loc);
    let expr = parsePrimary();
    while (true) {
      if (peek().type === "(") {
        next();
        const args = [];
        if (peek().type !== ")") {
          do {
            args.push(parseExpr());
            if (peek().type !== ",") break;
            next();
          } while (true);
        }
        expect(")");
        expr = A.Call(expr, args);
      } else if (peek().type === ".") {
        next();
        const prop = parsePropName();
        expr = A.Member(expr, prop);
      } else if (peek().type === "?.") {
        next();
        const prop = parsePropName();
        expr = A.OptionalMember(expr, prop);
      } else if (peek().type === "[") {
        next();
        const index = parseExpr();
        expect("]");
        expr = A.IndexExpr(expr, index);
      } else if (peek().type === "++" || peek().type === "--") {
        const prevLoc = expr.loc || peek().loc;
        if (prevLoc && peek().loc.line > prevLoc.line) {
          break;
        }
        const op = next().type;
        if (expr.type !== "Ident" && expr.type !== "Member" && expr.type !== "IndexExpr") {
          throw invalidSyntax(`Cannot use '${op}' on a non-assignable expression`, peek().loc);
        }
        expr = A.UpdateExpr(op, expr, false);
      } else break;
    }
    return expr;
  }

  function parseArrowFunction() {
    let isAsync = false;
    if (peek().type === "assincrono") {
      next();
      isAsync = true;
    }
    expect("(");
    const params = [];
    const paramTypes = [];
    if (peek().type !== ")") {
      do {
        params.push(expect("IDENT").value);
        if (peek().type === ":") {
          next();
          paramTypes.push(parseType());
        } else {
          paramTypes.push(null);
        }
        if (peek().type !== ",") break;
        next();
      } while (true);
    }
    expect(")");
    let returnType = null;
    if (peek().type === ":") {
      next();
      returnType = parseType();
    }
    expect("=>");
    let body;
    if (peek().type === "{") {
      body = parseBlock();
    } else {
      body = parseExpr();
    }
    return A.ArrowFunction(params, body, isAsync, paramTypes, returnType);
  }

  function parseTryCatch() {
    expect("tenta");
    A.setLoc(peek().loc);
    const tryBlock = parseBlock();
    let catchParam = null;
    let catchBlock = null;
    let finallyBlock = null;
    if (peek().type === "fodeu") {
      next();
      expect("(");
      const errTok = expect("IDENT");
      expect(")");
      catchParam = errTok.value;
      catchBlock = parseBlock();
    }
    if (peek().type === "no-fim") {
      next();
      finallyBlock = parseBlock();
    }
    return A.TryCatchStmt(tryBlock, catchParam, catchBlock, finallyBlock);
  }

  function parsePrimary() {
    const t = peek();
    A.setLoc(t.loc);

    if (BUILTIN_KEYWORDS.has(t.type)) {
      next();
      return A.Ident(t.type);
    }

    if (t.type === "verdadeiro") {
      next();
      return A.Bool(true);
    }

    if (t.type === "falso") {
      next();
      return A.Bool(false);
    }

    if (t.type === "nulo") {
      next();
      return A.Nil();
    }

    if (t.type === "esse-cara") {
      next();
      return A.ThisExpr();
    }

    if (t.type === "novo") {
      next();
      const callee = parseCall();
      return A.NewExpr(callee, []);
    }

    if (t.type === "tipo-de") {
      next();
      expect("(");
      const arg = parseExpr();
      expect(")");
      return A.TypeOf(arg);
    }

    if (t.type === "instancia-de") {
      next();
      expect("(");
      const arg = parseExpr();
      expect(",");
      const cls = parseExpr();
      expect(")");
      return A.InstanceOf(arg, cls);
    }

    if (t.type === "traz-ai") {
      next();
      let target;
      if (peek().type === "STRING") {
        target = next().value;
      } else {
        target = expect("IDENT").value;
      }
      return A.ImportExpr(target);
    }

    if (t.type === "tenta") {
      return parseTryCatch();
    }

    if (t.type === "assincrono" && tokens[i + 1]?.type === "(") {
      next();
      return parseArrowFunction();
    }

    if (t.type === "(") {
      let j = i;
      let depth = 1;
      while (tokens[j] && depth > 0) {
        j++;
        if (tokens[j]?.type === "(") depth++;
        if (tokens[j]?.type === ")") depth--;
      }
      let afterParen = j + 1;
      if (tokens[afterParen]?.type === ":" && tokens[afterParen + 1]?.type === "IDENT") {
        let k = afterParen + 2;
        if (tokens[k]?.type === "<") {
          while (tokens[k] && tokens[k].type !== ">") k++;
          k++;
        }
        afterParen = k;
      }
      if (tokens[afterParen]?.type === "=>") {
        return parseArrowFunction();
      }
    }

    if (t.type === "{") {
      next();
      const props = [];
      if (peek().type !== "}") {
        do {
          if (peek().type === "...") {
            next();
            const spread = parseExpr();
            props.push({ spread: true, value: spread });
          } else {
            const key = parsePropName();
            if (peek().type === ":") {
              next();
              const value = parseExpr();
              props.push({ key, value });
            } else {
              props.push({ key, value: A.Ident(key) });
            }
          }
          if (peek().type !== ",") break;
          next();
        } while (true);
      }
      expect("}");
      return A.ObjectExpr(props);
    }

    if (t.type === "[") {
      next();
      const items = [];
      if (peek().type !== "]") {
        do {
          if (peek().type === "...") {
            next();
            items.push(A.Spread(parseExpr()));
          } else {
            items.push(parseExpr());
          }
          if (peek().type !== ",") break;
          next();
        } while (true);
      }
      expect("]");
      return A.ArrayExpr(items);
    }

    if (t.type === "TEMPLATE") {
      next();
      const parts = t.parts.map((p) => {
        if (p.type === "TEMPLATE_STR") return A.Str(p.value);
        const lexed = lex(p.value);
        const exprAst = parse(lexed);
        if (exprAst.body.length === 1) return exprAst.body[0];
        return exprAst;
      });
      if (parts.length === 1) return parts[0];
      let result = parts[0];
      for (let k = 1; k < parts.length; k++) {
        result = A.Binary("+", result, parts[k]);
      }
      return result;
    }

    if (t.type === "NUMBER") {
      next();
      return A.Num(t.value);
    }

    if (t.type === "STRING") {
      next();
      return A.Str(t.value);
    }

    if (t.type === "IDENT") {
      next();
      return A.Ident(t.value);
    }

    if (t.type === "ve-se") {
      return parseMatch();
    }

    if (t.type === "(") {
      next();
      const e = parseExpr();
      expect(")");
      return e;
    }

    const err = invalidSyntax(
      "Unexpected token: " + (t.type + (t.value ? ` (${t.value})` : "")),
      t.loc
    );
    throw err;
  }

  return parseProgram();
}
