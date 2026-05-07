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
  "NULO"
]);

export function lex(input) {
  const tokens = [];
  let i = 0;

  const isAlpha = c => /[a-zA-Z_]/.test(c);
  const isNum = c => /[0-9]/.test(c);
  const isAlnum = c => /[a-zA-Z0-9_]/.test(c);

  while (i < input.length) {
    const c = input[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }

    if (c === '"' || c === "'") {
      const q = c;
      i++;

      let val = "";
      while (i < input.length && input[i] !== q) {
        val += input[i++];
      }

      i++;
      tokens.push({ type: "STRING", value: val });

      continue;
    }

    if (isNum(c)) {
      let num = c;
      i++;

      while (isNum(input[i])) {
        num += input[i++];
      }

      tokens.push({ type: "NUMBER", value: Number(num) });

      continue;
    }

    if (isAlpha(c)) {
      let id = c;
      i++;

      while (isAlnum(input[i])) {
        id += input[i++];
      }

      const up = id.toUpperCase();

      if (KEYWORDS.has(up)) {
        tokens.push({ type: up, value: up });
      } else {
        tokens.push({ type: "IDENT", value: id });
      }

      continue;
    }

    const three = input.slice(i, i + 3);
    const two = input.slice(i, i + 2);

    if (["&&", "||", "==", "!=", ">=", "<="].includes(two)) {
      tokens.push({ type: two, value: two });
      i += 2;
      continue;
    }

    if ("(){};,=.+-*/<>!".includes(c)) {
      tokens.push({ type: c, value: c });
      i++;
      continue;
    }

    throw new Error("Caractere inválido: " + c);
  }

  tokens.push({ type: "EOF" });
  return tokens;
}