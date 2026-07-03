# XanaScript

Program in Portuguese. Run on WebAssembly. Real performance.

XanaScript is a programming language with Portuguese syntax, optimizing compiler (JavaScript + WebAssembly), built-in ORM, compile-time macros, LSP, and zero runtime dependencies.

```bash
npm install -g xanascript
xs run app.xs
```

```xs
PARTIU()
CHAMA ESSE CARA fib(n) {
  SE LIGA SO (n <= 1) { VOLTA n }
  VOLTA fib(n - 1) + fib(n - 2)
}
SOLTA O GRITO("fib(10) =", fib(10))
ACABOU()
```

---

## Quick Start

```bash
# Via npm (requires Node.js)
npm install -g xanascript
xs run app.xs

# Via source
git clone https://github.com/xanascr/xs.git
cd xs
npm install
node src/cli.js run app.xs

# Native binary (requires bun)
npm run build
dist/xs run app.xs
```

## Documentation

- [Full documentation](docs/en/getting-started.md) - English
- [Documentacao completa](docs/pt-br/comecando.md) - Portugues
- [Documentacion completa](docs/es/introduccion.md) - Espanol
- [Examples](https://github.com/xanascr/xs-examples)
- [Installer](https://github.com/xanascr/xs-installer)
- [VS Code Extension](https://github.com/xanascr/xs-vscode)
- [LLM Reference](llms.txt) - Complete reference for AI assistants

## Architecture

```
.xs source  ->  Lexer  ->  Parser  ->  Optimizer  ->  Codegen (JS / Wasm)
                                                       -> Runtime (interpreter)
```

| Module | File | Purpose |
|--------|------|---------|
| Lexer | `src/lexer.js` | Tokenization with line/col tracking |
| Parser | `src/parser.js` | AST generation |
| Optimizer | `src/optimizer.js` | Macros, constant folding, dead branches |
| Interpreter | `src/interpreter.js` | AST walking interpreter |
| Runtime | `src/runtime.js` | Built-ins and environment |
| Codegen JS | `src/codegen.js` | JavaScript generation |
| Codegen Opt | `src/codegen_opt.js` | Optimized JS (TypedArrays, int32) |
| Codegen Wasm | `src/codegen_wasm.js` | WebAssembly text format |
| Wasm Binary | `src/wasm_binary.js` | Direct Wasm binary (no wabt.js) |
| Errors | `src/errors.js` | Rust-style error reporting |
| CLI | `src/cli.js` | Command-line interface |
| ORM | `src/orm.js` | Built-in ORM (TABLE -> CRUD) |
| Macros | `src/macros.js` | Compile-time expansion |
| LSP | `src/lsp.js` | Language Server Protocol |
| Test Runner | `src/testrunner.js` | Native test runner |
| Docs Gen | `src/docsgen.js` | HTML documentation generator |
| Pkg Manager | `src/pkgmgr.js` | Package manager |
| Source Map | `src/sourcemap.js` | Source maps |
| Bytecode VM | `src/bytecode/` | Stack-based VM |

## CLI

```
xs run <file>         Execute .xs
xs check <file>       Check syntax
xs build <file>       Generate JavaScript
xs build --opt <file> Optimized JavaScript
xs build --wasm <file> WebAssembly
xs build --standalone Single JS with runtime
xs test .             Run tests
xs dev <file>         Hot reload
xs repl               Interactive mode
xs lsp                Language Server
xs fmt <file>         Format code
xs docs src/ docs/    HTML documentation
xs init <name>        New project
xs install <pkg>      Install package
xs publish            Publish package
xs bench              Benchmark
xs vm <file>          Bytecode VM
```

## Tests

```bash
node test/lexer.test.js
node test/parser.test.js
node test/interpreter.test.js
```

## Structure

```
xs/
  src/           Compiler (20 modules)
  test/          Unit tests
  std/           Standard library
  scripts/       Build scripts
  docs/          Documentation (en, pt-br, es)
  package.json
  VERSION
```

## Ecosystem

| Repository | Description |
|---|---|
| [xanascript/xs](https://github.com/xanascr/xs) | Core language |
| [xanascript/xs-site](https://github.com/xanascr/xs-site) | Website and documentation |
| [xanascript/xs-vscode](https://github.com/xanascr/xs-vscode) | VS Code extension |
| [xanascript/xs-examples](https://github.com/xanascr/xs-examples) | Code examples |
| [xanascript/xs-installer](https://github.com/xanascr/xs-installer) | Windows installer |
