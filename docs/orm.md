# ORM

XanaScript ships with a built-in object-relational mapper. Data is stored as JSON files in a `.db/` directory (no external database required).

## Defining a Model

```xs
DB Usuario {
  nome: eh-palavra
  idade: eh-numero
}
```

Columns can also use uppercase aliases: `TEXTO`, `NUMERO`, `BOOLEANO`, `DATA`, `QUALQUER`.

## Repositories

`DB` returns a repository object with the following methods:

| Method | Description |
|--------|-------------|
| `bota-ai(dados)` | Insert a record; returns it with `id` and `criadoEm` |
| `vê()` | Return all records |
| `acha(id)` | Find by id or `nulo` |
| `altera(id, mudancas)` | Update fields; returns the updated record |
| `alterakkkk(id, mudancas)` | Alias for `altera` (update fields) |
| `apaga-ae(id)` | Delete and return the removed record |
| `achaOnde(filtro)` | Filter records matching all fields |
| `select(campos)` | Return only selected fields |
| `quantos?()` | Count records |
| `limpar()` | Delete all records |

## Example

```xs
DB Usuario {
  nome: eh-palavra
  idade: eh-numero
}

// insert
cria ana = Usuario.bota-ai({ nome: "Ana", idade: 30 })
grita-ae(ana.id)            // 1

// read
grita-ae(Usuario.acha(1))       // { id: 1, nome: "Ana", idade: 30 }
grita-ae(Usuario.vê())          // all records
grita-ae(Usuario.quantos?())    // 1

// update
Usuario.altera(1, { idade: 31 })

// query
cria jovens = Usuario.achaOnde({ idade: 31 })
cria nomes = Usuario.select(["nome"])

// delete
Usuario.apaga-ae(1)
```

`DB` binds the repository to a variable named after the table (here `Usuario`).

## Validation

The ORM validates columns against their declared type. Inserting a string into a `eh-numero` column raises a validation error listing every invalid field.

## Storage

- Files live in `.db/<model>.json`.
- A `.bak` backup is written before every save.
- If the main file is corrupt, the backup is restored automatically.
- Writes are serialized through a queue and protected by a lock.