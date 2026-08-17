# Type System

XanaScript has strong static typing with inference. Types are checked at compile time (`xana check`), and violations raise a `TIPO` (type) error.

## Primitive Types

| Type | Values | Runtime check |
|------|--------|---------------|
| `eh-numero` | `10`, `3.14`, `-5` | `typeof === "number"` |
| `eh-palavra` | `"texto"`, `'texto'` | `typeof === "string"` |
| `vdd?` | `verdadeiro`, `falso` | `typeof === "boolean"` |
| `eh-nada` | `nulo` | `null` |
| `sla` | any value | always |

## Composite Types

| Type | Description |
|------|-------------|
| `sus<T>` | Array of `T` (e.g. `sus<eh-numero>`) |
| `bagulho` | Any object |
| `crush` | A class / object instance |
| `data` | Date |
| `nunca` | Never (unreachable) |
| `sepah<T>` | Optional `T` (may be `nulo`) |
| `promessa<T>` | Async `Promise<T>` |
| `faz-ai` | Callable / function |

## Declaring Types

```xs
cria idade: eh-numero = 30
cria nomes: sus<eh-palavra> = ["Ana", "Joao"]
cria talvez: sepah<eh-numero> = nulo
```

## Struct Types

```xs
tipo Usuario {
  nome: eh-palavra
  idade: eh-numero
}

cria u: Usuario = { nome: "Maria", idade: 30 }
```

## Generic Functions

```xs
resolve identidade<T>(x: T): T {
  volta x
}

cria a = identidade(42)        // eh-numero
cria b = identidade("oi")      // eh-palavra
```

## Type Inference

```xs
cria x = 10          // inferred eh-numero
cria y = [1, 2, 3]   // inferred sus<eh-numero>
```

## Type Guards

```xs
se-pah (tipo-de(x) == "eh-numero") {
  // x is a number here
}

se-pah (instancia-de(x, Animal)) {
  // x is an Animal here
}
```

## Type Compatibility

- `eh-numero` and `eh-palavra` are not interchangeable.
- `sus<T>` accepts arrays whose elements match `T`.
- `crush` accepts objects, arrays, and class instances.
- `bagulho` accepts any object value.
- `sepah<T>` is compatible with `T` and `nulo`.

## Type Aliases

ORM column names map to the same primitive types:

```xs
DB Produto {
  nome: TEXTO,      // eh-palavra
  preco: NUMERO,    // eh-numero
  ativo: BOOLEANO,  // vdd?
}
```