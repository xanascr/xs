const KEYWORDS = new Set([
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
  "grita-ae",
  "sussurra",
  "horinha",
  "stalkeia",
  "aguenta-ai",
  "escolhe",
  "desembola",
  "bisbilhota",
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
  "escuta",
  "terminamos!",
  "tamanho",
  "divide-texto",
  "encontra",
  "decodifica-url",
  "juntar",
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
  "traduz-ai",
]);

export function lex(input, file = "input.xs") {
  const tokens = [];
  let i = 0;
  let line = 1;
  let col = 1;

  function loc() {
    return { line, column: col, file };
  }

  function push(tok) {
    tok.loc = loc();
    tokens.push(tok);
  }

  const isAlpha = (c) => /[a-zA-Z_À-ÖØ-öø-ÿ]/.test(c);
  const isNum = (c) => /[0-9]/.test(c);
  const isAlnum = (c) => c && /^[a-zA-Z0-9_À-ÖØ-öø-ÿ]$/.test(c);

  while (i < input.length) {
    const c = input[i];

    if (c === "\n") {
      i++;
      line++;
      col = 1;
      continue;
    }
    if (/\s/.test(c)) {
      i++;
      col++;
      continue;
    }

    if (c === '"' || c === "'") {
      const q = c;
      const startLoc = loc();
      i++;
      col++;
      let val = "";
      while (i < input.length && input[i] !== q) {
        if (input[i] === "\\" && i + 1 < input.length && input[i + 1] !== "\n") {
          const esc = input[i + 1];
          const map = { n: "\n", t: "\t", r: "\r", '"': '"', "'": "'", "\\": "\\", b: "\b", f: "\f", "0": "\0" };
          val += map[esc] !== undefined ? map[esc] : esc;
          i += 2;
          col += 2;
          continue;
        }
        if (input[i] === "\n") {
          line++;
          col = 1;
        } else col++;
        val += input[i++];
      }
      if (i >= input.length) {
        const err = new Error(`Unterminated string: missing ${q}`);
        err.loc = startLoc;
        throw err;
      }
      i++;
      col++;
      push({ type: "STRING", value: val });
      continue;
    }

    if (c === "`") {
      const startLoc = loc();
      i++;
      col++;
      let val = "";
      const parts = [];
      while (i < input.length && input[i] !== "`") {
        if (input[i] === "$" && input[i + 1] === "{") {
          parts.push({ type: "TEMPLATE_STR", value: val });
          val = "";
          i += 2;
          col += 2;
          let expr = "";
          let depth = 1;
          while (i < input.length && depth > 0) {
            if (input[i] === "{") depth++;
            if (input[i] === "}") depth--;
            if (depth > 0) {
              if (input[i] === "\n") {
                line++;
                col = 1;
              } else col++;
              expr += input[i++];
            }
          }
          if (i >= input.length) {
            const err = new Error(`Template sem fechamento`);
            err.loc = startLoc;
            throw err;
          }
          i++;
          col++;
          parts.push({ type: "TEMPLATE_EXPR", value: expr });
        } else {
          if (input[i] === "\n") {
            line++;
            col = 1;
          } else col++;
          val += input[i++];
        }
      }
      if (i >= input.length) {
        const err = new Error(`Template sem fechamento`);
        err.loc = startLoc;
        throw err;
      }
      parts.push({ type: "TEMPLATE_STR", value: val });
      i++;
      col++;
      push({ type: "TEMPLATE", parts });
      continue;
    }

    if (c === "/" && input[i + 1] === "/") {
      while (i < input.length && input[i] !== "\n") i++;
      continue;
    }

    if (c === "/" && input[i + 1] === "*") {
      i += 2;
      col += 2;
      while (i < input.length) {
        if (input[i] === "*" && input[i + 1] === "/") {
          i += 2;
          col += 2;
          break;
        }
        if (input[i] === "\n") {
          line++;
          col = 1;
        } else col++;
        i++;
      }
      continue;
    }

    if (isNum(c)) {
      let num = c;
      i++;
      col++;
      while (isNum(input[i])) {
        num += input[i++];
        col++;
      }
      if (input[i] === "." && isNum(input[i + 1])) {
        num += input[i++];
        col++;
        while (isNum(input[i])) {
          num += input[i++];
          col++;
        }
      }
      push({ type: "NUMBER", value: Number(num) });
      continue;
    }

    if (isAlpha(c)) {
      let id = c;
      i++;
      col++;
      while (isAlnum(input[i]) || (input[i] === "-" && isAlpha(input[i + 1]))) {
        id += input[i++];
        col++;
      }

      if (KEYWORDS.has(id + "!") && input[i] === "!") {
        id += input[i++];
        col++;
      } else if (id === "quantos" && input[i] === "?" && input[i + 1] === "(") {
        id += input[i++];
        col++;
      } else if (id === "vdd" && input[i] === "?" && input[i + 1] !== "=") {
        id += input[i++];
        col++;
      }

      if (KEYWORDS.has(id)) {
        push({ type: id, value: id });
      } else {
        push({ type: "IDENT", value: id });
      }
      continue;
    }

    const three = input.slice(i, i + 3);
    if (["<<=", ">>=", "===", "!==", "??=", "**=", "&&=", "||=", "..."].includes(three)) {
      push({ type: three, value: three });
      i += 3;
      col += 3;
      continue;
    }

    const two = input.slice(i, i + 2);

    if (
      [
        "=>",
        "&&",
        "||",
        "==",
        "!=",
        ">=",
        "<=",
        "+=",
        "-=",
        "*=",
        "/=",
        "%=",
        "->",
        "~=",
        "++",
        "--",
        "<<",
        ">>",
        "|=",
        "&=",
        "^=",
        "//",
        "/*",
        "??",
        "?.",
        "**",
      ].includes(two)
    ) {
      push({ type: two, value: two });
      i += 2;
      col += 2;
      continue;
    }

    if ("(){}[];,=:+.-*/<>!%?|&^~".includes(c)) {
      push({ type: c, value: c });
      i++;
      col++;
      continue;
    }

    const err = new Error(`Invalid character: "${c}" (code: ${c.charCodeAt(0)})`);
    err.loc = loc();
    throw err;
  }

  push({ type: "EOF" });
  return tokens;
}
