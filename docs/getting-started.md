# Getting Started

XanaScript is a typed programming language with Portuguese keywords, an optimizing compiler (JavaScript + WebAssembly), a built-in ORM, compile-time macros, an LSP server, and zero runtime dependencies.

## Installation

Requires Node.js 18+.

```bash
npm install -g xanascript
```

Verify the installation:

```bash
xana --version
```

## Your First Program

Create a file named `hello.xs`:

```xs
grita-ae("Hello, World!")
```

Run it:

```bash
xana run hello.xs
```

Output:

```
Hello, World!
```

## Running Code

XanaScript has two execution backends:

| Command | Backend |
|---------|---------|
| `xana run <file>` | AST interpreter (fast startup) |
| `xana vm <file>` | Bytecode VM |

Both produce identical results; use whichever fits your workflow.

## Typed Example

```xs
tipo Usuario {
  nome: eh-palavra
  idade: eh-numero
}

resolve sauda(usuario: Usuario): eh-palavra {
  volta "Oi, " + usuario.nome
}

cria u: Usuario = { nome: "Maria", idade: 30 }
grita-ae(sauda(u))
```

Check types without executing:

```bash
xana check hello.xs
```

## Next Steps

- [Syntax Reference](syntax.md) — the full language
- [Type System](types.md) — strong typing with inference
- [Standard Library](stdlib.md) — built-in functions
- [ORM](orm.md) — built-in database
- [CLI Reference](cli.md) — every command
- [Examples](examples.md) — complete programs