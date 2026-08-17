# CLI Reference

XanaScript ships a single CLI binary, `xana`.

## Running Programs

| Command | Description | PT alias |
|---------|-------------|----------|
| `xana run <file>` | Run `.xs` with the AST interpreter | `xana roda` |
| `xana vm <file>` | Run `.xs` with the bytecode VM | `xana roda --vm` |
| `xana check <file>` | Type-check without executing | `xana verifica` |
| `xana dev [file]` | Watch with hot reload | `xana vigia` |
| `xana repl` | Interactive mode | `xana bate-papo` |

## Building

| Command | Description | PT alias |
|---------|-------------|----------|
| `xana build <file>` | Generate JavaScript from `.xs` | `xana monta` |
| `xana build --opt <file>` | Generate ultra-optimized JS | `xana monta --otimizado` |
| `xana build --wasm <file>` | Generate WebAssembly (`.wat` + `.wasm`) | `xana monta --wasm` |
| `xana build --standalone <file>` | Generate a single `.js` with embedded runtime | `xana monta --sozinho` |

## Formatting

| Command | Description | PT alias |
|---------|-------------|----------|
| `xana fmt <file>` | Format a `.xs` file | `xana ajeita` |

## Testing

| Command | Description | PT alias |
|---------|-------------|----------|
| `xana test [dir]` | Run all tests matching `*test*.xs` | `xana teste` |
| `xana test --watch [dir]` | Watch mode: re-run tests on change | `xana teste --olha` |

## Package Manager

| Command | Description | PT alias |
|---------|-------------|----------|
| `xana init [dir]` | Create a new XanaScript project | `xana rascunho` |
| `xana install [pkg]` | Install dependencies | `xana bota-ai` |
| `xana publish` | Publish a package to the registry | `xana solta-ai` |
| `xana search <term>` | Search packages | `xana stalkeia` |
| `xana login` | Log in to the registry | |
| `xana whoami` | Show the logged-in user | |
| `xana logout` | Log out | |

## Language / Debug Server

| Command | Description | PT alias |
|---------|-------------|----------|
| `xana lsp` | Start the Language Server Protocol (stdin/stdout) | `xana fala-com-ide` |
| `xana debuga` | Start the Debug Adapter Protocol (stdin/stdout) | |

## Documentation

| Command | Description | PT alias |
|---------|-------------|----------|
| `xana docs [src] [out]` | Generate HTML documentation | `xana documenta` |

## Tasks

| Command | Description |
|---------|-------------|
| `xana <task>` | Run a task defined in `tarefas.xs` |

## Miscellaneous

| Command | Description | PT alias |
|---------|-------------|----------|
| `xana help` | Show help | |
| `xana -v` / `--version` | Show version | |
| `xana bench` | Run the benchmark | `xana mede` |