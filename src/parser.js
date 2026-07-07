import * as A from "./ast.js";
import { XSError, expected, undefinedVar, invalidSyntax } from "./errors.js";
import { lex } from "./lexer.js";

const PRECEDENCE = {
    "?": 0,
    "||": 1,
    "&&": 2,
    "|": 3,
    "^": 4,
    "&": 5,
    "==": 6,
    "!=": 6,
    "~=": 6,
    "<": 7,
    "<=": 7,
    ">": 7,
    ">=": 7,
    "<<": 8,
    ">>": 8,
    "+": 9,
    "-": 9,
    "*": 10,
    "/": 10,
    "%": 10
};

export function parse(tokens) {
    let i = 0;
    const peek = () => tokens[i];
    const next = () => tokens[i++];
    const expect = (t) => {
        const tok = next();
        if (tok.type !== t) {
            const err = expected(tok.type, t, tok.loc);
            err.message = `Esperado \`${t}\`, encontrado \`${tok.type}\``;
            if (tok.value) err.message += ` (\`${tok.value}\`)`;
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

    function matchPhrase(name, parts) {
        if (!matchSeq(...parts)) return null;
        const tok = tokens[i];
        parts.forEach(() => next());
        A.setLoc(tok.loc);
        return A.Ident(name);
    }

    function parseProgram() {
        const body = [];
        if (peek().type === "PARTIU") {
            expect("PARTIU"); expect("("); expect(")");
            A.setLoc(peek().loc);
            while (peek().type !== "ACABOU") {
                body.push(parseStmt());
            }
            expect("ACABOU"); expect("("); expect(")");
        } else {
            A.setLoc(peek().loc);
            while (peek().type !== "EOF") {
                body.push(parseStmt());
            }
        }
        expect("EOF");
        return A.Program(body);
    }

    function parseFunction() {
        expect("CHAMA"); expect("ESSE"); expect("CARA");
        const nameTok = expect("IDENT");
        const name = nameTok.value;
        A.setLoc(nameTok.loc);
        expect("(");
        const params = [];
        if (peek().type !== ")") {
            do {
                const p = expect("IDENT");
                params.push(p.value);
                if (peek().type !== ",") break;
                next();
            } while (true);
        }
        expect(")");
        const body = parseBlock();
        return A.FunctionDecl(name, params, body);
    }

    function parseReturn() {
        expect("VOLTA");
        A.setLoc(peek().loc);
        let arg = null;
        if (peek().type !== "}" && peek().type !== "EOF" && peek().type !== ")") arg = parseExpr();
        optionalSemicolon();
        return A.ReturnStmt(arg);
    }

    function parseExport() {
        expect("EXPORTA");
        const nameTok = expect("IDENT");
        A.setLoc(nameTok.loc);
        optionalSemicolon();
        return A.ExportStmt(nameTok.value);
    }

    function parseStmt() {
        A.setLoc(peek().loc);

        if (peek().type === "EXPORTA") return parseExport();
        if (matchSeq("CHAMA", "ESSE", "CARA")) return parseFunction();
        if (peek().type === "VOLTA") return parseReturn();
        if (peek().type === "CRIA") return parseVarDecl();
        if (matchSeq("SE", "LIGA", "SO")) return parseIf();
        if (matchSeq("REPETE", "NA", "MORAL")) return parseFor();
        if (matchSeq("REPETE", "AI")) return parseWhile();
        if (peek().type === "TENTA") return parseTryCatch();
        if (peek().type === "VOA") { next(); expect("("); expect(")"); optionalSemicolon(); return A.BreakStmt(); }
        if (peek().type === "CONTINUA") { next(); expect("("); expect(")"); optionalSemicolon(); return A.ContinueStmt(); }
        if (peek().type === "IMPORTA") return parseImport();
        if (peek().type === "CLASSE") return parseClass();
        if (peek().type === "ESCOLHE") return parseSwitch();
        if (peek().type === "COMBINA") return parseMatch();
        if (peek().type === "TESTE") return parseTest();
        if (peek().type === "TAREFA") return parseTask();
        if (peek().type === "AFIRMA") return parseAssert();
        if (peek().type === "ASSUNTO") return parseAssertEqual();
        if (peek().type === "TABELA") return parseTable();
        if (peek().type === "MACRO") return parseMacro();

        const expr = parseExpr();
        optionalSemicolon();
        return expr;
    }

    function parseTest() {
        expect("TESTE");
        const nameTok = expect("STRING");
        A.setLoc(nameTok.loc);
        const body = parseBlock();
        return A.TestStmt(nameTok.value, body);
    }

    function parseAssert() {
        expect("AFIRMA");
        expect("(");
        A.setLoc(peek().loc);
        const test = parseExpr();
        expect(")");
        optionalSemicolon();
        return A.AssertStmt(test, null);
    }

    function parseAssertEqual() {
        expect("ASSUNTO");
        expect("(");
        A.setLoc(peek().loc);
        const a = parseExpr();
        expect(",");
        const b = parseExpr();
        expect(")");
        optionalSemicolon();
        return A.Call(A.Ident("ASSUNTO"), [a, b]);
    }

    function parseTask() {
        expect("TAREFA");
        const nameTok = expect("IDENT");
        A.setLoc(nameTok.loc);
        const body = parseBlock();
        return A.TaskDecl(nameTok.value, body);
    }

    function parseTable() {
        expect("TABELA");
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
        expect("MACRO");
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

    function parseVarDecl(expectSemi = true) {
        expect("CRIA");
        A.setLoc(peek().loc);
        let lvalue;
        if (peek().type === "ISTO") {
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
            type = expect("IDENT").value;
        }
        while (peek().type === ".") {
            next();
            const prop = expect("IDENT").value;
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
            return { ...A.VarDecl(lvalue.name, init), typeHint: type };
        }
        return { ...A.Assign(lvalue, init), typeHint: type };
    }

    function parseIf() {
        expect("SE"); expect("LIGA"); expect("SO");
        expect("(");
        A.setLoc(peek().loc);
        const test = parseExpr();
        expect(")");
        const cons = parseBlock();
        let alt = null;
        if (peek().type === "SENAO") {
            next();
            if (matchSeq("SE", "LIGA", "SO")) {
                alt = parseIf();
            } else {
                alt = parseBlock();
            }
        }
        return A.IfStmt(test, cons, alt);
    }

    function parseFor() {
        expect("REPETE"); expect("NA"); expect("MORAL");
        expect("(");
        A.setLoc(peek().loc);

        let init = null;

        if (peek().type !== ";") {
            if (peek().type === "CRIA") {
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
        expect("REPETE"); expect("AI");
        expect("(");
        A.setLoc(peek().loc);
        const test = parseExpr();
        expect(")");
        const body = parseBlock();
        return A.WhileStmt(test, body);
    }

    function parseImport() {
        expect("IMPORTA");
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

    function parseClass() {
        expect("CLASSE");
        const nameTok = expect("IDENT");
        A.setLoc(nameTok.loc);
        const name = nameTok.value;
        let superClass = null;
        if (peek().type === "HERDA") {
            next();
            superClass = expect("IDENT").value;
        }
        expect("{");
        const methods = [];
        while (peek().type !== "}") {
            if (peek().type === "CONSTRUTOR") {
                next();
                A.setLoc(peek().loc);
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
                methods.push(A.Method(null, params, body, true));
            } else if (peek().type === "METODO") {
                next();
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
                methods.push(A.Method(nameTok.value, params, body, false));
            } else if (peek().type === "IDENT") {
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
                methods.push(A.Method(nameTok.value, params, body, false));
            } else {
                const err = invalidSyntax("Esperado método ou CONSTRUTOR na classe", peek().loc);
                throw err;
            }
        }
        expect("}");
        return A.ClassDecl(name, superClass, methods);
    }

    function parseSwitch() {
        expect("ESCOLHE");
        expect("(");
        A.setLoc(peek().loc);
        const test = parseExpr();
        expect(")");
        expect("{");
        const cases = [];
        while (peek().type !== "}") {
            if (peek().type === "CASO") {
                next();
                A.setLoc(peek().loc);
                const value = parseExpr();
                expect(":");
                const body = parseStmt();
                cases.push(A.SwitchCase(value, body));
            } else if (peek().type === "PADRAO") {
                next();
                expect(":");
                A.setLoc(peek().loc);
                const body = parseStmt();
                cases.push(A.SwitchCase(null, body));
            } else {
                const err = invalidSyntax("Esperado CASO ou PADRAO no ESCOLHE", peek().loc);
                throw err;
            }
        }
        expect("}");
        return A.SwitchStmt(test, cases);
    }

    function parseMatch() {
        expect("COMBINA");
        expect("(");
        A.setLoc(peek().loc);
        const test = parseExpr();
        expect(")");
        expect("{");
        const cases = [];
        while (peek().type !== "}") {
            if (peek().type === "CASO") {
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
            } else if (peek().type === "PADRAO") {
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
                const err = invalidSyntax("Esperado CASO ou PADRAO no COMBINA", peek().loc);
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
        if (t.type === "VERDADEIRO") {
            next();
            return A.PatternLiteral(true);
        }
        if (t.type === "FALSO") {
            next();
            return A.PatternLiteral(false);
        }
        if (t.type === "NULO") {
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
                const keyTok = expect("IDENT");
                A.setLoc(keyTok.loc);
                if (peek().type === ":") {
                    next();
                    props.push({ key: keyTok.value, pattern: parsePattern() });
                } else {
                    props.push({ key: keyTok.value, pattern: A.PatternIdent(keyTok.value) });
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

        const err = invalidSyntax("Pattern inesperado: " + t.type, t.loc);
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
        const compoundOps = { "+=": "+", "-=": "-", "*=": "*", "/=": "/", "%=": "%", "|=": "|", "&=": "&", "^=": "^", "<<=": "<<", ">>=": ">>" };
        if (peek().type === "=" || compoundOps[peek().type]) {
            const op = next().type;
            const right = parseAssignment();
            if (left.type !== "Ident" && left.type !== "Member" && left.type !== "IndexExpr") {
                const err = invalidSyntax("Lado esquerdo inválido para atribuição", peek().loc);
                throw err;
            }
            if (op === "=") return A.Assign(left, right);
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
                const right = parseBinary(prec + 1);
                left = A.Binary(op, left, right);
            }
        }
        return left;
    }

    function parseUnary() {
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
                const propTok = expect("IDENT");
                expr = A.Member(expr, propTok.value);
            } else if (peek().type === "[") {
                next();
                const index = parseExpr();
                expect("]");
                expr = A.IndexExpr(expr, index);
            } else if (peek().type === "++" || peek().type === "--") {
                const op = next().type;
                expr = A.UpdateExpr(op, expr, false);
            } else break;
        }
        return expr;
    }

    function parseArrowFunction() {
        let isAsync = false;
        if (peek().type === "ASSINCRONO") {
            next();
            isAsync = true;
        }
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
        expect("=>");
        let body;
        if (peek().type === "{") {
            body = parseBlock();
        } else {
            body = parseExpr();
        }
        return A.ArrowFunction(params, body, isAsync);
    }

    function parseTryCatch() {
        expect("TENTA");
        A.setLoc(peek().loc);
        const tryBlock = parseBlock();
        expect("PEGA");
        expect("(");
        const errTok = expect("IDENT");
        expect(")");
        const catchBlock = parseBlock();
        return A.TryCatchStmt(tryBlock, errTok.value, catchBlock);
    }

    function parsePrimary() {
        const phrase =
            matchPhrase("SOLTA_O_GRITO", ["SOLTA", "O", "GRITO"]) ||
            matchPhrase("FALA_BAIXO", ["FALA", "BAIXO"]) ||
            matchPhrase("AGORA_VAI", ["AGORA", "VAI"]) ||
            matchPhrase("ESPERA_AI", ["ESPERA", "AI"]) ||
            matchPhrase("OUVE_AQUI", ["OUVE", "AQUI"]) ||
            matchPhrase("CRIA_SERVIDOR", ["CRIA", "SERVIDOR"]) ||
            matchPhrase("PARA_SERVIDOR", ["PARA", "SERVIDOR"]) ||
            matchPhrase("DIVIDE_TEXTO", ["DIVIDE", "TEXTO"]) ||
            matchPhrase("DECODIFICA_URL", ["DECODIFICA", "URL"]);

        if (phrase) return phrase;

        const t = peek();
        A.setLoc(t.loc);

        if (t.type === "SORTEIA") {
            next();
            return A.Ident("SORTEIA");
        }

        if (t.type === "PARSEIA") {
            next();
            return A.Ident("PARSEIA");
        }

        if (t.type === "TAMANHO") {
            next();
            return A.Ident("TAMANHO");
        }

        if (t.type === "ENCONTRA") {
            next();
            return A.Ident("ENCONTRA");
        }

        if (t.type === "JUNTAR") {
            next();
            return A.Ident("JUNTAR");
        }

        if (t.type === "VERDADEIRO") {
            next();
            return A.Bool(true);
        }

        if (t.type === "FALSO") {
            next();
            return A.Bool(false);
        }

        if (t.type === "NULO") {
            next();
            return A.Nil();
        }

        if (t.type === "ISTO") {
            next();
            return A.ThisExpr();
        }

        if (t.type === "NOVA") {
            next();
            const callee = parseCall();
            return A.NewExpr(callee, []);
        }

        if (t.type === "IMPORTA") {
            next();
            let target;
            if (peek().type === "STRING") {
                target = next().value;
            } else {
                target = expect("IDENT").value;
            }
            return A.ImportExpr(target);
        }

        if (peek().type === "TENTA") {
            return parseTryCatch();
        }

        if (t.type === "(") {
            let j = i;
            while (tokens[j] && tokens[j].type !== ")") {
                j++;
            }
            if (tokens[j + 1]?.type === "=>") {
                return parseArrowFunction();
            }
        }

        if (t.type === "{") {
            next();
            const props = [];
            if (peek().type !== "}") {
                do {
                    const keyTok = expect("IDENT");
                    expect(":");
                    const value = parseExpr();
                    props.push({ key: keyTok.value, value });
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
                    items.push(parseExpr());
                    if (peek().type !== ",") break;
                    next();
                } while (true);
            }
            expect("]");
            return A.ArrayExpr(items);
        }

        if (t.type === "TEMPLATE") {
            next();
            const parts = t.parts.map(p => {
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

        if (t.type === "COMBINA") {
            return parseMatch();
        }

        if (t.type === "(") {
            next();
            const e = parseExpr();
            expect(")");
            return e;
        }

        const err = invalidSyntax("Token inesperado: " + (t.type + (t.value ? ` (${t.value})` : "")), t.loc);
        throw err;
    }

    return parseProgram();
}
