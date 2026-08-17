<p align="center">
  <h1 align="center">XanaScript</h1>
  <p align="center">A typed programming language with Portuguese syntax, an optimizing compiler, a built-in ORM, and native WebAssembly support.</p>
  <p align="center">
    <a href="https://www.npmjs.com/package/xanascript"><img src="https://img.shields.io/npm/v/xanascript.svg?style=flat&color=%23f58b8e" alt="npm"></a>
    <a href="https://github.com/xanascr/xs/actions"><img src="https://img.shields.io/github/actions/workflow/status/xanascr/xs/ci.yml?style=flat&color=%23f58b8e" alt="CI"></a>
    <a href="https://github.com/xanascr/xs/blob/main/LICENSE"><img src="https://img.shields.io/github/license/xanascr/xs?style=flat&color=%23f58b8e" alt="License"></a>
    <a href="https://xanascript.xyz"><img src="https://img.shields.io/badge/website-xanascript.xyz-%23f58b8e?style=flat" alt="Website"></a>
  </p>
</p>

XanaScript is a strong-typed programming language with Portuguese keywords, built for readability and speed. It ships with an optimizing compiler that targets JavaScript and WebAssembly, a bytecode VM, a built-in ORM, compile-time macros, and zero runtime dependencies.

## Installation

```bash
npm install -g xanascript
```

Requires Node.js 18+.

## Quick Start

```xs
cria nome = "Maria"
cria idade = 30

resolve sauda(pessoa) {
  volta "Oi, " + pessoa + "!"
}

grita-ae(sauda(nome))
```

```bash
xana run hello.xs
# "Oi, Maria!"
```

## Documentation

- [Getting Started](docs/getting-started.md)
- [Syntax Reference](docs/syntax.md)
- [Type System](docs/types.md)
- [Standard Library](docs/stdlib.md)
- [ORM](docs/orm.md)
- [CLI Reference](docs/cli.md)
- [Examples](docs/examples.md)
- [LLM Reference](llms.txt)

## Features

- **Typed** — strong static typing with inference (`xana check`)
- **Portuguese syntax** — keywords in Portuguese for accessibility
- **Optimizing compiler** — JavaScript and WebAssembly output
- **Bytecode VM** — stack-based VM for fast execution
- **Built-in ORM** — JSON-backed CRUD with validation
- **Package manager** — `xana install`, `xana publish`
- **LSP support** — IDE integration with diagnostics and autocomplete
- **Macros** — compile-time code generation
- **Test runner** — native test framework (`xana test`)
- **Source maps** — errors mapped back to `.xs` source lines

## CLI

```
xana run <file>          Run .xs (AST interpreter)          [roda]
xana vm <file>           Run .xs (bytecode VM)              [roda --vm]
xana check <file>        Type-check without executing       [verifica]
xana fmt <file>          Format code                        [ajeita]
xana build <file>        Generate JavaScript                [monta]
xana build --opt <file>  Optimized JS with type inference   [--otimizado]
xana build --wasm <file> WebAssembly output
xana build --standalone  Single-file JS with runtime        [--sozinho]
xana test [dir]          Run tests (*test*.xs)              [teste]
xana test --watch        Watch mode for tests               [teste --olha]
xana dev [file]          Watch mode with hot reload         [vigia]
xana repl                Interactive REPL                   [bate-papo]
xana lsp                 Language Server Protocol           [fala-com-ide]
xana init [dir]          Create a new project               [rascunho]
xana install <pkg>       Install a package from the registry [bota-ai]
xana publish             Publish a package to the registry  [solta-ai]
xana search <term>       Search packages                    [stalkeia]
xana bench               Run benchmarks                     [mede]
xana docs src/ out/      Generate HTML documentation        [documenta]
```

Every command has a Portuguese alias (shown in `[brackets]`); both forms work.

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
| `typecheck.js` | Static type checking and inference |
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
| `errors.js` | Categorized error reporting with hints and suggestions |
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