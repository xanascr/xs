# XanaScript Documentation

Welcome to the XanaScript documentation. XanaScript is a typed, C-like programming language with Portuguese keywords, a built-in ORM, compile-time macros, an optimizing compiler, and a bytecode VM — all with zero runtime dependencies.

## Getting Started

| Guide | Description |
|-------|-------------|
| [Getting Started](getting-started.md) | Install, run your first program, CLI overview |
| [Syntax Reference](syntax.md) | Full language reference: types, statements, expressions |
| [Type System](types.md) | Strong typing with inference: primitives, generics, unions |
| [Standard Library](stdlib.md) | Built-in functions: I/O, HTTP, JSON, strings, math |
| [ORM](orm.md) | Built-in typed database with CRUD operations |
| [CLI Reference](cli.md) | Every command and flag |
| [Examples](examples.md) | Runnable examples covering the whole language |

## Language at a Glance

```xs
// Typed function with generics
resolve identidade<T>(x: T): T {
  volta x
}

// Strongly typed variables
cria nome: eh-palavra = "Maria"
cria idade: eh-numero = 30

// Built-in ORM
DB Usuario {
  nome: eh-palavra,
  idade: eh-numero
}

// New v3 operators
cria apelido = nome ?? "anonimo"
cria rua = usuario?.endereco?.rua
cria quadrado = 2 ** 10
```

## LLM Reference

The [llms.txt](../llms.txt) file at the repository root provides a complete, single-document reference optimized for AI assistants.