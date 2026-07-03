# ORM (Mapeo Objeto-Relacional)

XanaScript tiene un ORM integrado que crea repositorios respaldados por SQLite con una sola declaracion.

## Declaracion de Tabla

```xs
TABELA Usuario {
  nome: TEXTO,
  idade: NUMERO,
  email: TEXTO
}
```

Esto crea un repositorio con operaciones CRUD completas.

## Operaciones CRUD

### Crear

```xs
CRIA repo = TABELA("Usuario")

repo.criar({
  nome: "Joao",
  idade: 30,
  email: "joao@email.com"
})
```

### Listar Todos

```xs
CRIA usuarios = repo.listar()
```

### Buscar Por ID

```xs
CRIA user = repo.buscar(1)
```

### Actualizar

```xs
repo.atualizar(1, {
  nome: "Joao Silva",
  idade: 31
})
```

### Eliminar

```xs
repo.deletar(1)
```

### Consultar con Filtro

```xs
CRIA jovens = repo.buscarOnde({ idade: 25 })
```

### Contar

```xs
CRIA total = repo.contar()
```

## Tipos de Campo

| Tipo | Descripcion |
|------|-------------|
| `TEXTO` | Texto/Cadena |
| `NUMERO` | Numero/Entero |
| `BOOLEANO` | Booleano |
| `DATA` | Fecha/DateTime |

## Directorio de Datos

Por defecto, el archivo de base de datos se crea en un directorio `.xs-data` relativo al archivo actual. Cada tabla tiene su propio archivo JSON.
