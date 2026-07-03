const KEYWORDS = new Set([
  "PARTIU", "ACABOU",
  "CRIA",
  "SE", "LIGA", "SO", "SENAO",
  "REPETE", "NA", "MORAL",
  "CHAMA", "ESSE", "CARA",
  "VOLTA",
  "IMPORTA",
  "EXPORTA",
  "SOLTA", "O", "GRITO",
  "FALA", "BAIXO",
  "AGORA", "VAI",
  "ESPERA", "AI",
  "SORTEIA",
  "PARSEIA",
  "OUVE", "AQUI",
  "VERDADEIRO",
  "FALSO",
  "NULO",
  "TENTA",
  "PEGA",
  "ERRO",
  "ASSINCRONO",
  "VOA",
  "CONTINUA",

  "CLASSE",
  "HERDA",
  "CONSTRUTOR",
  "ISTO",
  "NOVA",
  "METODO",

  "ESCOLHE",
  "CASO",
  "PADRAO",

  "COMBINA",

  "SERVIDOR",
  "PARA",

  "TAMANHO",
  "DIVIDE",
  "TEXTO",
  "ENCONTRA",
  "DECODIFICA",
  "URL",
  "JUNTAR",

  "TESTE",
  "AFIRMA",
  "ASSUNTO",

  "TAREFA",

  "TABELA",

  "MACRO",

  "TIPO",
  "CRUD",
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

  const isAlpha = c => /[a-zA-Z_]/.test(c);
  const isNum = c => /[0-9]/.test(c);
  const isAlnum = c => c && /^[a-zA-Z0-9_]$/.test(c);

  while (i < input.length) {
    const c = input[i];

    if (c === "\n") { i++; line++; col = 1; continue; }
    if (/\s/.test(c)) { i++; col++; continue; }

    if (c === '"' || c === "'") {
      const q = c;
      i++; col++;
      let val = "";
      while (i < input.length && input[i] !== q) {
        if (input[i] === "\n") { line++; col = 1; }
        else col++;
        val += input[i++];
      }
      i++; col++;
      push({ type: "STRING", value: val });
      continue;
    }

    if (c === "`") {
      i++; col++;
      let val = "";
      const parts = [];
      while (i < input.length && input[i] !== "`") {
        if (input[i] === "$" && input[i + 1] === "{") {
          parts.push({ type: "TEMPLATE_STR", value: val });
          val = "";
          i += 2; col += 2;
          let expr = "";
          let depth = 1;
          while (i < input.length && depth > 0) {
            if (input[i] === "{") depth++;
            if (input[i] === "}") depth--;
            if (depth > 0) {
              if (input[i] === "\n") { line++; col = 1; }
              else col++;
              expr += input[i++];
            }
          }
          i++; col++;
          parts.push({ type: "TEMPLATE_EXPR", value: expr });
        } else {
          val += input[i++]; col++;
        }
      }
      parts.push({ type: "TEMPLATE_STR", value: val });
      i++; col++;
      push({ type: "TEMPLATE", parts });
      continue;
    }

    if (c === "/" && input[i + 1] === "/") {

      while (i < input.length && input[i] !== "\n") i++;
      continue;
    }

    if (isNum(c)) {
      let num = c;
      i++; col++;
      while (isNum(input[i])) {
        num += input[i++]; col++;
      }
      push({ type: "NUMBER", value: Number(num) });
      continue;
    }

    if (isAlpha(c)) {
      let id = c;
      i++; col++;
      while (isAlnum(input[i])) {
        id += input[i++]; col++;
      }

      if (KEYWORDS.has(id)) {
        push({ type: id, value: id });
      } else if (id.endsWith("?")) {

        push({ type: "IDENT", value: id });
      } else {
        push({ type: "IDENT", value: id });
      }
      continue;
    }

    const two = input.slice(i, i + 2);

    if ([
      "=>", "&&", "||", "==", "!=", ">=", "<=",
      "+=", "-=", "*=", "/=", "%=", "->", "~=",
      "//", "/*",
    ].includes(two)) {
      push({ type: two, value: two });
      i += 2; col += 2;
      continue;
    }

    if ("(){}[];,=:+.-*/<>!%?".includes(c)) {
      push({ type: c, value: c });
      i++; col++;
      continue;
    }

    const err = new Error(`Caractere inválido: "${c}" (código: ${c.charCodeAt(0)})`);
    err.loc = loc();
    throw err;
  }

  push({ type: "EOF" });
  return tokens;
}
