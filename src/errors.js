let SOURCE_LINES = [];
let SOURCE_FILE = "input.xs";
let SOURCE_CODE = "";

export function setSource(code, file) {
  SOURCE_CODE = code;
  SOURCE_FILE = file || "input.xs";
  SOURCE_LINES = code.split("\n");
}

// Error categories (v3)
export const CATEGORY = {
  SINT: "SINT", // syntax
  TIPO: "TIPO", // types
  NOME: "NOME", // names/identifiers
  IMPT: "IMPT", // import/export
  NET: "NET", // network/HTTP
  ORML: "ORML", // ORM/database
  TST: "TST", // tests
  RUNT: "RUNT", // runtime
  INFO: "INFO", // warning/info
};

// Levenshtein distance (did-you-mean)
export function levenshtein(a, b) {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;
  let prev = Array.from({ length: lb + 1 }, (_, i) => i);
  let curr = new Array(lb + 1);
  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[lb];
}

// Suggests the closest candidate within a distance limit
export function didYouMean(input, candidates, maxDist = 2) {
  if (!candidates) return null;
  const list = Array.isArray(candidates) ? candidates : Array.from(candidates);
  if (list.length === 0) return null;
  let best = null;
  let bestDist = maxDist + 1;
  for (const c of list) {
    const d = levenshtein(String(input), String(c));
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

export class XSError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "XSError";
    this.loc = options.loc || null;
    this.hint = options.hint || "";
    this.help = options.help || "";
    this.code = options.code || "";
    this.suggestion = options.suggestion || "";
    this.frames = options.frames || null;
    this.severity = options.severity || "error";
  }

  toString() {
    return formatError(this);
  }
}

export function formatError(err) {
  const loc = err.loc;
  const lines = [];

  lines.push("");
  lines.push(`\x1b[1;31m╔═══ XanaScript ${err.severity.toUpperCase()} \x1b[0m`);
  lines.push(`\x1b[1;31m║\x1b[0m ${err.message}`);

  if (err.code) {
    lines.push(`\x1b[1;31m║\x1b[0m \x1b[2mCode: ${err.code}\x1b[0m`);
  }

  if (loc && loc.line) {
    const line = loc.line;
    const col = loc.column || 1;
    const context = 2;

    const start = Math.max(0, line - context - 1);
    const end = Math.min(SOURCE_LINES.length, line + context);

    lines.push(`\x1b[1;31m║\x1b[0m`);
    lines.push(`\x1b[1;31m║\x1b[0m \x1b[2m--> ${SOURCE_FILE}:${line}:${col}\x1b[0m`);
    lines.push(`\x1b[1;31m║\x1b[0m`);

    for (let i = start; i < end; i++) {
      const lineNum = i + 1;
      const prefix = lineNum === line ? "\x1b[1;31m║\x1b[0m" : "\x1b[2;31m║\x1b[0m";
      const numStr = String(lineNum).padStart(4, " ");
      const marker = lineNum === line ? "\x1b[1;31m>\x1b[0m" : " ";
      const content = SOURCE_LINES[i] || "";

      lines.push(`${prefix} ${marker} ${numStr} \x1b[0m│ ${content}`);

      if (lineNum === line && col > 0) {
        const arrow = " ".repeat(col - 1) + "\x1b[1;31m^\x1b[0m";
        lines.push(`${prefix}      \x1b[2m│\x1b[0m ${arrow}`);
      }
    }
  }

  if (err.suggestion) {
    lines.push(`\x1b[1;31m║\x1b[0m`);
    lines.push(`\x1b[1;32m║   Tip: did you mean \x1b[1m${err.suggestion}\x1b[0m?`);
  }
  if (err.hint) {
    lines.push(`\x1b[1;31m║\x1b[0m`);
    lines.push(`\x1b[1;33m║   ${err.hint}\x1b[0m`);
  }
  if (err.help) {
    lines.push(`\x1b[1;34m║   ${err.help}\x1b[0m`);
  }
  if (err.frames && err.frames.length > 0) {
    lines.push(`\x1b[1;31m║\x1b[0m`);
    lines.push(`\x1b[2;37m║   XanaScript stack:\x1b[0m`);
    for (const f of err.frames) {
      const at = f.loc ? ` at ${f.loc.file}:${f.loc.line}:${f.loc.column}` : "";
      lines.push(`\x1b[2;37m║     → resolve ${f.name}${at}\x1b[0m`);
    }
  }

  lines.push(`\x1b[1;31m╚══════════════════════════════════\x1b[0m`);
  lines.push("");

  return lines.join("\n");
}

// Known names for did-you-mean (v3 tokens + builtins)
const KNOWN = [
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
  "traduz-ai",
  "verdadeiro",
  "falso",
  "nulo",
  "tenta",
  "fodeu",
  "no-fim",
  "assincrono",
  "mete-o-pe",
  "segue-o-baile",
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
  "crush",
  "deu-match",
  "date",
  "tarefa",
  "DB",
  "tpm",
  "tipo",
  "tipo-de",
  "instancia-de",
  "tamanho",
  "divide-texto",
  "encontra",
  "decodifica-url",
  "juntar",
];

function buildCode(category, num) {
  return `${category}-${String(num).padStart(2, "0")}`;
}

export { buildCode };

// XanaScript call stack (resolve names, not the JS stack)
export class XSCallStack {
  constructor() {
    this.frames = [];
  }

  push(name, loc) {
    this.frames.push({ name, loc });
  }

  pop() {
    this.frames.pop();
  }

  get length() {
    return this.frames.length;
  }
}

export function expected(found, expected, loc) {
  return new XSError(`Expected \`${expected}\`, found \`${found}\``, {
    loc,
    hint: `XanaScript expected "${expected}" here`,
    help: `Try adding "${expected}" at this location`,
    code: buildCode(CATEGORY.SINT, 1),
  });
}

export function undefinedVar(name, loc, candidates) {
  const sugg = didYouMean(name, candidates || KNOWN);
  return new XSError(`Variable \`${name}\` is not defined`, {
    loc,
    hint: `Did you forget to declare "${name}" with cria?`,
    help: `Add \`cria ${name} = value\` before using it`,
    suggestion: sugg,
    code: buildCode(CATEGORY.NOME, 1),
  });
}

export function notAFunction(name, loc) {
  return new XSError(`\`${name}\` is not a function`, {
    loc,
    hint: `You are trying to call "${name}" as a function, but it is not one`,
    help: `Check that "${name}" was declared with resolve`,
    code: buildCode(CATEGORY.NOME, 2),
  });
}

export function typeMismatch(expected, found, loc) {
  return new XSError(`Type mismatch: expected \`${expected}\`, got \`${found}\``, {
    loc,
    hint: `The types do not match`,
    help: `Check the variable type or use an explicit conversion`,
    code: buildCode(CATEGORY.TIPO, 1),
  });
}

export function invalidSyntax(detail, loc) {
  return new XSError(`Invalid syntax: ${detail}`, {
    loc,
    hint: "Check the syntax around this point",
    help: "Make sure all parentheses, braces, and keywords are correct",
    code: buildCode(CATEGORY.SINT, 2),
  });
}

export function suggestion(msg, loc) {
  return new XSError(msg, { loc, severity: "info", code: buildCode(CATEGORY.INFO, 1) });
}

export function wrapError(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof XSError) throw e;
      if (e instanceof Error) {
        const xsErr = new XSError(e.message, {
          loc: e.loc || null,
          hint: "Internal interpreter error",
          code: buildCode(CATEGORY.RUNT, 99),
        });
        xsErr.stack = e.stack;
        throw xsErr;
      }
      throw e;
    }
  };
}
