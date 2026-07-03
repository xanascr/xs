# Exemplos

## Hello World

```xs
PARTIU()
  SOLTA O GRITO("Hello World!")
ACABOU()
```

## Variaveis e Operacoes

```xs
PARTIU()
  CRIA x = 10
  CRIA y = 20
  CRIA soma = x + y
  SOLTA O GRITO("Sum:", soma)
ACABOU()
```

## Funcao

```xs
PARTIU()
  CHAMA ESSE CARA fib(n) {
    SE LIGA SO (n <= 1) { VOLTA n }
    VOLTA fib(n - 1) + fib(n - 2)
  }
  SOLTA O GRITO("fib(10) =", fib(10))
ACABOU()
```

## Servidor HTTP

```xs
PARTIU()
  CRIA_SERVIDOR(3000, (req, res) => {
    SE LIGA SO (req.url == "/") {
      res.send("Hello from XanaScript!")
    } SENAO {
      res.json({ rota: req.url, metodo: req.method })
    }
  })
  SOLTA O GRITO("Server on http://localhost:3000")
ACABOU()
```

## ORM

```xs
PARTIU()
  TABELA Produto {
    nome: TEXTO,
    preco: NUMERO
  }

  CRIA repo = TABELA("Produto")
  repo.criar({ nome: "Mouse", preco: 50 })
  repo.criar({ nome: "Teclado", preco: 100 })

  CRIA produtos = repo.listar()
  SOLTA O GRITO(produtos)
ACABOU()
```

## Correspondencia de Padroes

```xs
PARTIU()
  COMBINA (x) {
    CASO 1: SOLTA O GRITO("one")
    CASO 2: SOLTA O GRITO("two")
    CASO _: SOLTA O GRITO("other")
  }
ACABOU()
```

## Classes

```xs
PARTIU()
  CLASSE Animal {
    CONSTRUTOR(nome) {
      ISTO.nome = nome
    }
    METODO falar() {
      SOLTA O GRITO(ISTO.nome)
    }
  }

  CRIA a = NOVA Animal("Rex")
  a.falar()
ACABOU()
```

## Tratamento de Erros

```xs
PARTIU()
  TENTA {
    CRIA x = PARSEIA("not json")
  } PEGA(erro) {
    SOLTA O GRITO("Error:", erro)
  }
ACABOU()
```

## Assincrono

```xs
PARTIU()
  CRIA dados = ESPERA_AI(1000).entao(() => {
    SOLTA O GRITO("1 second passed")
  })
ACABOU()
```

## Macros

```xs
MACRO quadrado(x) { x * x }

PARTIU()
  CRIA y = quadrado(5)
  SOLTA O GRITO("25 =", y)
ACABOU()
```
