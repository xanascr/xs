# ORM (Mapeamento Objeto-Relacional)

XanaScript possui um ORM embutido que cria repositorios com suporte a SQLite com uma unica declaracao.

## Declaracao de Tabela

```xs
TABELA Usuario {
  nome: TEXTO,
  idade: NUMERO,
  email: TEXTO
}
```

Isso cria um repositorio com operacoes CRUD completas.

## Operacoes CRUD

### Criar

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

### Atualizar

```xs
repo.atualizar(1, {
  nome: "Joao Silva",
  idade: 31
})
```

### Deletar

```xs
repo.deletar(1)
```

### Consultar com Filtro

```xs
CRIA jovens = repo.buscarOnde({ idade: 25 })
```

### Contar

```xs
CRIA total = repo.contar()
```

## Tipos de Campo

| Tipo | Descricao |
|------|-----------|
| `TEXTO` | Texto/String |
| `NUMERO` | Numero/Inteiro |
| `BOOLEANO` | Booleano |
| `DATA` | Data/DateTime |

## Diretorio de Dados

Por padrao, o arquivo de banco de dados e criado em um diretorio `.xs-data` relativo ao arquivo atual. Cada tabela possui seu proprio arquivo JSON.
