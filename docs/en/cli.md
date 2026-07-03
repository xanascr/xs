# CLI Reference

## Usage

```
xs <command> [options] [file]
```

## Commands

| Command | Description |
|---------|-------------|
| `xs run <file>` | Execute .xs file (AST Interpreter) |
| `xs vm <file>` | Execute .xs file (Bytecode VM) |
| `xs check <file>` | Check syntax |
| `xs build <file>` | Generate JavaScript |
| `xs build --opt <file>` | Generate optimized JavaScript |
| `xs build --wasm <file>` | Generate WebAssembly (.wat + .wasm) |
| `xs build --standalone <file>` | Generate single .js with runtime |
| `xs test <dir>` | Run tests |
| `xs dev <file>` | Hot reload on file change |
| `xs fmt <file>` | Format .xs file |
| `xs repl` | Interactive REPL mode |
| `xs lsp` | Start Language Server Protocol |
| `xs docs <src> <out>` | Generate HTML documentation |
| `xs init <name>` | Create new project |
| `xs install <pkg>` | Install package |
| `xs publish` | Publish package |
| `xs bench` | Run benchmarks |

## Examples

```bash
xs run app.xs
xs check app.xs
xs build app.xs
xs build --opt app.xs -o output.js
xs build --wasm app.xs
xs build --standalone app.xs
xs test .
xs dev app.xs
xs fmt app.xs
xs init meu-projeto
xs install pacote
```

## LSP (Language Server Protocol)

The LSP server communicates via stdin/stdout. It provides:

- Autocomplete
- Hover information
- Go-to-definition
- Diagnostics (errors and warnings)
- Signature help

Connect your editor to `xs lsp` for full IDE support.

## Build Outputs

| Flag | Output | Description |
|------|--------|-------------|
| (none) | stdout | Standard JavaScript |
| `--opt` | stdout | Optimized JavaScript with TypedArrays |
| `--wasm` | `.wat` + `.wasm` | WebAssembly text + binary |
| `--standalone` | `.js` file | Single file with embedded runtime |
