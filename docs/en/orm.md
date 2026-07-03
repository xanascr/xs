# ORM (Object-Relational Mapping)

XanaScript has a built-in ORM that creates SQLite-backed repositories with a single declaration.

## Table Declaration

```xs
TABELA Usuario {
  nome: TEXTO,
  idade: NUMERO,
  email: TEXTO
}
```

This creates a repository with full CRUD operations.

## CRUD Operations

### Create

```xs
CRIA repo = TABELA("Usuario")

repo.criar({
  nome: "Joao",
  idade: 30,
  email: "joao@email.com"
})
```

### Read All

```xs
CRIA usuarios = repo.listar()
```

### Read By ID

```xs
CRIA user = repo.buscar(1)
```

### Update

```xs
repo.atualizar(1, {
  nome: "Joao Silva",
  idade: 31
})
```

### Delete

```xs
repo.deletar(1)
```

### Query with Filter

```xs
CRIA jovens = repo.buscarOnde({ idade: 25 })
```

### Count

```xs
CRIA total = repo.contar()
```

## Field Types

| Type | Description |
|------|-------------|
| `TEXTO` | Text/String |
| `NUMERO` | Number/Integer |
| `BOOLEANO` | Boolean |
| `DATA` | Date/DateTime |

## Data Directory

By default, the database file is created in a `.xs-data` directory relative to the current file. Each table gets its own JSON file.
