export class SourceMap {
  constructor(sourceFile, xsSource) {
    this.file = sourceFile || "input.xs";
    this.xsLines = xsSource?.split("\n") || [];
    this.mappings = [];
    this.generated = "";
  }

  addXsLine(xsLine, jsCode) {
    const currentJsLine = (this.generated.match(/\n/g) || []).length + 1;
    this.mappings.push({ jsLine: currentJsLine, xsLine });
    this.generated += jsCode;
    return jsCode;
  }

  add(jsCode) {
    this.generated += jsCode;
    return jsCode;
  }

  translateError(error) {
    if (!error || !error.stack) return error;
    const stack = error.stack;
    const lines = stack.split("\n");

    const translated = lines.map(line => {

      const match = line.match(/:(\d+):\d+/);
      if (!match) return line;
      const jsLine = parseInt(match[1]);

      let bestXsLine = null;
      for (const m of this.mappings) {
        if (m.jsLine <= jsLine) {
          bestXsLine = m.xsLine;
        } else break;
      }

      if (bestXsLine !== null) {
        const xsContent = this.xsLines[bestXsLine - 1]?.trim() || "";
        return line.replace(/:(\d+):(\d+)/, `:${bestXsLine}:1`) +
          `  ← xs:${bestXsLine} ${xsContent}`;
      }
      return line;
    });

    error.stack = translated.join("\n");
    error.xsLine = this._findXsLine(error);
    return error;
  }

  _findXsLine(error) {
    const match = error.stack?.match(/xs:(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  toComment() {
    const data = {
      file: this.file,
      version: 1,
      mappings: this.mappings,
    };
    return `\n//# sourceMappingURL=data:application/json;base64,${btoa(JSON.stringify(data))}\n`;
  }

  static fromComment(comment, xsLines) {
    const match = comment.match(/sourceMap=(\{.+?\})/);
    if (!match) return null;
    try {
      const data = JSON.parse(match[1]);
      const sm = new SourceMap(data.file, xsLines?.join("\n"));
      sm.mappings = data.mappings;
      return sm;
    } catch { return null; }
  }

  static getRuntimeWrapper() {
    return `

const __xs_handler = {
  wrap(fn, sourceMap) {
    if (!sourceMap) return fn;
    return function(...args) {
      try {
        return fn.apply(this, args);
      } catch (e) {
        const lines = (e.stack || "").split("\\\\n");
        e.stack = lines.map(l => {
          const m = l.match(/:(\\\\d+):\\\\d+/);
          if (!m) return l;
          const jsLine = parseInt(m[1]);
          let best = null;
          sourceMap.mappings.some(m => { if (m.jsLine <= jsLine) { best = m.xsLine; return false; } return true; });
          if (best) l = l.replace(/:(\\\\d+):\\\\d+/, ":" + best + ":1") + "  ← xs:" + best;
          return l;
        }).join("\\\\n");
        throw e;
      }
    };
  }
};`;
  }
}

export function generateWithSourceMap(ast, codegenFn, sourceFile, xsCode) {
  const sm = new SourceMap(sourceFile, xsCode);
  const code = codegenFn(ast);
  return { code, sourceMap: sm };
}

export function buildSourceMap(xsLines, statements) {
  const sm = new SourceMap("input.xs", xsLines.join("\n"));
  let jsLine = 1;
  for (const stmt of statements) {
    const xsLine = stmt.loc?.start?.line || stmt.xsLine || 1;
    sm.mappings.push({ jsLine, xsLine });
    jsLine += (stmt.generatedJs?.match(/\n/g) || []).length + 1;
  }
  return sm;
}
