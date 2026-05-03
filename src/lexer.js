const KEYWORDS = new Set([
  "PARTIU", "ACABOU", "CRIA", "SE", "LIGA", "SO", "SENAO",
  "REPETE", "NA", "MORAL", "IMPORTA",
  "SOLTA", "O", "GRITO", "FALA", "BAIXO",
  "CHAMA", "ESSE", "CARA", "VOLTA", "EXPORTA",
  "AGORA", "VAI",
  "ESPERA", "AI",
  "SORTEIA",
  "PARSEIA",
  "OUVE", "AQUI"
]);

export function lex(input) {
  const tokens = [];
  let i = 0;

  const isAlpha = c => /[a-zA-Z_]/.test(c);
  const isNum = c => /[0-9]/.test(c);
  const isAlnum = c => /[a-zA-Z0-9_]/.test(c);

  while (i < input.length) {
    const c = input[i];

    if (/\s/.test(c)) { i++; continue; }

    if (c === '"' || c === "'") {
      const quote = c; i++;
      let val = "";
      while (i < input.length && input[i] !== quote) {
        if (input[i] === "\\" && i + 1 < input.length) {
          val += input[i + 1]; i += 2; continue;
        }
        val += input[i++];
      }
      i++;
      tokens.push({ type: "STRING", value: val });
      continue;
    }

    if (isNum(c)) {
      let num = c; i++;
      while (i < input.length && isNum(input[i])) num += input[i++];
      tokens.push({ type: "NUMBER", value: Number(num) });
      continue;
    }

    if (isAlpha(c)) {
      let id = c; i++;
      while (i < input.length && isAlnum(input[i])) id += input[i++];
      const up = id.toUpperCase();
      if (KEYWORDS.has(up)) tokens.push({ type: up, value: up });
      else tokens.push({ type: "IDENT", value: id });
      continue;
    }

    const two = input.slice(i, i + 2);
    if (["==", "!=", ">=", "<="].includes(two)) {
      tokens.push({ type: two, value: two }); i += 2; continue;
    }

    if ("(){};,=.+-*/<>".includes(c)) {
      tokens.push({ type: c, value: c }); i++; continue;
    }

    throw new Error("Caractere inválido: " + c);
  }

  tokens.push({ type: "EOF" });
  return tokens;
}