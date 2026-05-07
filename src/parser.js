import * as A from "./ast.js";

const PRECEDENCE = {
    "||": 1,
    "&&": 2,
    "==": 3,
    "!=": 3,
    "<": 4,
    "<=": 4,
    ">": 4,
    ">=": 4,
    "+": 5,
    "-": 5,
    "*": 6,
    "/": 6
};

export function parse(tokens) {
    let i = 0;
    const peek = () => tokens[i];
    const next = () => tokens[i++];
    const expect = (t) => {
        const tok = next();
        if (tok.type !== t) throw new Error(`Esperado ${t}, veio ${tok.type}`);
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
        parts.forEach(() => next());
        return A.Ident(name);
    }

    function parseProgram() {
        const body = [];
        if (peek().type === "PARTIU") {
            expect("PARTIU"); expect("("); expect(")");
            while (peek().type !== "ACABOU") {
                body.push(parseStmt());
            }
            expect("ACABOU"); expect("("); expect(")");
        } else {
            while (peek().type !== "EOF") {
                body.push(parseStmt());
            }
        }
        expect("EOF");
        return A.Program(body);
    }

    function parseFunction() {
        expect("CHAMA"); expect("ESSE"); expect("CARA");
        const name = expect("IDENT").value;
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
        return A.FunctionDecl(name, params, body);
    }
    function parseReturn() {
        expect("VOLTA");
        let arg = null;
        if (peek().type !== "}" && peek().type !== "EOF") arg = parseExpr();
        optionalSemicolon();
        return A.ReturnStmt(arg);
    }

    function parseExport() {
        expect("EXPORTA");
        const name = expect("IDENT").value;
        optionalSemicolon();
        return A.ExportStmt(name);
    }

    function parseStmt() {
        if (peek().type === "EXPORTA") return parseExport();
        if (matchSeq("CHAMA", "ESSE", "CARA")) return parseFunction();
        if (peek().type === "VOLTA") return parseReturn();
        if (peek().type === "{") return parseBlock();
        if (peek().type === "CRIA") return parseVarDecl();
        if (matchSeq("SE", "LIGA", "SO")) return parseIf();
        if (matchSeq("REPETE", "NA", "MORAL")) return parseFor();
        if (peek().type === "IMPORTA") return parseImport();

        const expr = parseExpr();
        optionalSemicolon();
        return expr;
    }

    function parseBlock() {
        expect("{");
        const body = [];
        while (peek().type !== "}") body.push(parseStmt());
        expect("}");
        return A.Block(body);
    }

    function parseVarDecl(expectSemi = true) {
        expect("CRIA");
        const id = expect("IDENT").value;
        expect("=");
        const init = parseExpr();

        if (expectSemi) optionalSemicolon();

        return A.VarDecl(id, init);
    }

    function parseIf() {
        expect("SE"); expect("LIGA"); expect("SO");
        expect("(");
        const test = parseExpr();
        expect(")");
        const cons = parseBlock();
        let alt = null;
        if (peek().type === "SENAO") {
            next();
            alt = parseBlock();
        }
        return A.IfStmt(test, cons, alt);
    }

    function parseFor() {
        expect("REPETE"); expect("NA"); expect("MORAL");
        expect("(");

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

    function parseImport() {
        expect("IMPORTA");

        let target;

        if (peek().type === "STRING") {
            target = next().value;
        } else {
            target = expect("IDENT").value;
        }

        optionalSemicolon();
        return A.ImportStmt(target);
    }

    function optionalSemicolon() {
        if (peek().type === ";") next();
    }

    function parseExpr() {
        return parseAssignment();
    }

    function parseAssignment() {
        let left = parseBinary(0);
        if (peek().type === "=") {
            next();
            const right = parseAssignment();
            if (left.type !== "Ident") throw new Error("Lado esquerdo inválido");
            return A.Assign(left, right);
        }
        return left;
    }

    function parseBinary(minPrec) {
        let left = parseUnary();
        while (true) {
            const op = peek().type;
            const prec = PRECEDENCE[op];
            if (!prec || prec < minPrec) break;
            next();
            const right = parseBinary(prec + 1);
            left = A.Binary(op, left, right);
        }
        return left;
    }

    function parseUnary() {
        if (peek().type === "-" || peek().type === "!") {
            const op = next().type;
            return A.Unary(op, parseUnary());
        }

        return parseCall();
    }

    function parseCall() {
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
                const prop = expect("IDENT").value;
                expr = A.Member(expr, prop);
            } else break;
        }
        return expr;
    }

    function parsePrimary() {
        const phrase =
            matchPhrase("SOLTA_O_GRITO", ["SOLTA", "O", "GRITO"]) ||
            matchPhrase("FALA_BAIXO", ["FALA", "BAIXO"]) ||
            matchPhrase("AGORA_VAI", ["AGORA", "VAI"]) ||
            matchPhrase("ESPERA_AI", ["ESPERA", "AI"]) ||
            matchPhrase("OUVE_AQUI", ["OUVE", "AQUI"]);

        if (phrase) return phrase;

        const t = peek();

        if (t.type === "SORTEIA") {
            next();
            return A.Ident("SORTEIA");
        }

        if (t.type === "PARSEIA") {
            next();
            return A.Ident("PARSEIA");
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

        if (t.type === "(") {
            next();

            const e = parseExpr();

            expect(")");

            return e;
        }

        throw new Error("Token inesperado: " + t.type);
    }
    return parseProgram();
}