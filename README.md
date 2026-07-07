<p align="center">
  <img src="https://xanascript.xyz/logo.svg" width="120" alt="XanaScript">
  <h1 align="center">XanaScript</h1>
  <p align="center">A programming language with Portuguese syntax, optimizing compiler, built-in ORM, and native WebAssembly support.</p>
  <p align="center">
    <a href="https://www.npmjs.com/package/xanascript"><img src="https://img.shields.io/npm/v/xanascript.svg?style=flat&color=%23f58b8e" alt="npm"></a>
    <a href="https://github.com/xanascr/xs/actions"><img src="https://img.shields.io/github/actions/workflow/status/xanascr/xs/ci.yml?style=flat&color=%23f58b8e" alt="CI"></a>
    <a href="https://github.com/xanascr/xs/blob/main/LICENSE"><img src="https://img.shields.io/github/license/xanascr/xs?style=flat&color=%23f58b8e" alt="License"></a>
    <a href="https://xanascript.xyz"><img src="https://img.shields.io/badge/website-xanascript.xyz-%23f58b8e?style=flat" alt="Website"></a>
  </p>
</p>

## Installation

```bash
npm install -g xanascript
```

Node.js 18+ required.

## Quick Start

```xs
PARTIU()

CHAMA ESSE CARA fib(n) {
  SE LIGA SO (n <= 1) { VOLTA n }
  VOLTA fib(n - 1) + fib(n - 2)
}

SOLTA O GRITO("fib(10) =", fib(10))

ACABOU()
```

```bash
xs run hello.xs
```

## Documentation

| Language | Link |
|----------|------|
| English | [Getting Started](docs/en/getting-started.md) |
| Português | [Começando](docs/pt-br/comecando.md) |
| Español | [Introducción](docs/es/introduccion.md) |
| LLM Reference | [llms.txt](llms.txt) |

## Features

- **Portuguese syntax** — keywords in Portuguese for accessibility
- **Optimizing compiler** — generates JavaScript and WebAssembly
- **Built-in ORM** — `CRIA REPOSITORIO` for database operations
- **Package manager** — `xs install`, `xs publish` via [xanascript.xyz/packages](https://xanascript.xyz/packages)
- **LSP support** — IDE integration with diagnostics and autocomplete
- **Bytecode VM** — stack-based virtual machine for fast execution
- **Macros** — compile-time code generation and transformation
- **Test runner** — native test framework (`xs test`)
- **Source maps** — error mapping back to `.xs` source lines

## CLI

```
xs run <file>         Execute .xs (AST interpreter)
xs vm <file>          Execute .xs (bytecode VM)
xs check <file>       Check syntax
xs fmt <file>         Format code
xs build <file>       Generate JavaScript
xs build --opt <file> Optimized JS with type inference
xs build --wasm <file> WebAssembly output
xs build --standalone Single-file JS with runtime
xs test               Run tests (*test*.xs)
xs dev <file>         Watch mode with hot reload
xs repl               Interactive REPL
xs lsp                Language Server Protocol
xs init [dir]         Create new project
xs install <pkg>      Install package from registry
xs publish            Publish package to registry
xs search <term>      Search packages
xs bench              Run benchmarks
xs docs src/ out/     Generate HTML documentation
```

## Architecture

```
.xs source → Lexer → Parser → Optimizer → Codegen (JS / Wasm / Bytecode)
                                        ↘ Interpreter (AST walk)
```

| Module | Purpose |
|--------|---------|
| `lexer.js` | Tokenization with line/col tracking |
| `parser.js` | AST generation with error recovery |
| `optimizer.js` | Macros, constant folding, dead code elimination |
| `interpreter.js` | AST-walking interpreter |
| `runtime.js` | Built-in functions and environment |
| `codegen.js` | JavaScript code generation |
| `codegen_opt.js` | Optimized JS (TypedArrays, int32, type inference) |
| `codegen_wasm.js` | WebAssembly text format generation |
| `wasm_binary.js` | Direct Wasm binary generation (no wabt.js) |
| `bytecode/` | Stack-based bytecode compiler and VM |
| `pkgmgr.js` | Package registry integration |
| `lsp.js` | Language Server Protocol implementation |
| `testrunner.js` | Native test framework |
| `docsgen.js` | HTML documentation generator |
| `orm.js` | Built-in ORM |
| `macros.js` | Compile-time macro expansion |
| `errors.js` | Rust-style error reporting with hints |
| `sourcemap.js` | JS→XS source mapping |

## Ecosystem

| Repository | Description |
|---|---|
| [xs](https://github.com/xanascr/xs) | Core language |
| [xs-site](https://github.com/xanascr/xs-site) | Website and package registry |
| [xs-vscode](https://github.com/xanascr/xs-vscode) | VS Code extension |
| [xs-examples](https://github.com/xanascr/xs-examples) | Code examples |

## License

[Apache-2.0](LICENSE)
