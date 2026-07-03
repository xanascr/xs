let SOURCE_LINES = [];
let SOURCE_FILE = "input.xs";
let SOURCE_CODE = "";

export function setSource(code, file) {
  SOURCE_CODE = code;
  SOURCE_FILE = file || "input.xs";
  SOURCE_LINES = code.split("\n");
}

export class XSError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "XSError";
    this.loc = options.loc || null;
    this.hint = options.hint || "";
    this.help = options.help || "";
    this.code = options.code || "";
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
    lines.push(`\x1b[1;31m║\x1b[0m \x1b[2mCódigo: ${err.code}\x1b[0m`);
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

  if (err.hint) {
    lines.push(`\x1b[1;31m║\x1b[0m`);
    lines.push(`\x1b[1;33m║   ${err.hint}\x1b[0m`);
  }
  if (err.help) {
    lines.push(`\x1b[1;34m║   ${err.help}\x1b[0m`);
  }

  lines.push(`\x1b[1;31m╚══════════════════════════════════\x1b[0m`);
  lines.push("");

  return lines.join("\n");
}

export function expected(found, expected, loc) {
  return new XSError(
    `Esperado \`${expected}\`, encontrado \`${found}\``,
    {
      loc,
      hint: `XanaScript esperava "${expected}" aqui`,
      help: `Tente adicionar "${expected}" neste local`,
      code: "E001",
    }
  );
}

export function undefinedVar(name, loc) {
  return new XSError(
    `Variável \`${name}\` não foi definida`,
    {
      loc,
      hint: `Você esqueceu de declarar "${name}" com CRIA?`,
      help: `Adicione \`CRIA ${name} = valor\` antes de usar`,
      code: "E002",
    }
  );
}

export function notAFunction(name, loc) {
  return new XSError(
    `\`${name}\` não é uma função`,
    {
      loc,
      hint: `Você está tentando chamar "${name}" como função, mas não é`,
      help: `Verifique se "${name}" foi declarada com CHAMA ESSE CARA`,
      code: "E003",
    }
  );
}

export function typeMismatch(expected, found, loc) {
  return new XSError(
    `Tipo incompatível: esperado \`${expected}\`, recebeu \`${found}\``,
    {
      loc,
      hint: `Os tipos não correspondem`,
      help: `Verifique o tipo da variável ou use coerção explícita`,
      code: "E004",
    }
  );
}

export function invalidSyntax(detail, loc) {
  return new XSError(
    `Sintaxe inválida: ${detail}`,
    {
      loc,
      hint: "Verifique a sintaxe ao redor deste ponto",
      code: "E005",
    }
  );
}

export function suggestion(msg, loc) {
  return new XSError(msg, { loc, severity: "info", code: "I001" });
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
          hint: "Erro interno do interpretador",
          code: "E999",
        });
        xsErr.stack = e.stack;
        throw xsErr;
      }
      throw e;
    }
  };
}
