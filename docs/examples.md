# Examples

Complete, runnable examples covering the full language.

## Hello World

```xs
grita-ae("Hello, World!")
```

## Variables and Types

```xs
cria nome = "Maria"
cria idade = 30
cria ativo = verdadeiro
cria vazio = nulo
cria lista = [1, 2, 3]
cria pessoa = { nome: nome, idade: idade }
```

## Functions

```xs
resolve soma(a, b) {
  volta a + b
}

resolve dobro(x: eh-numero): eh-numero {
  volta x * 2
}

cria somaCom2 = (x) => soma(x, 2)
grita-ae(dobro(5))      // 10
grita-ae(somaCom2(5))   // 7
```

## Control Flow

```xs
cria x = 15

se-pah (x > 10) {
  grita-ae("maior que 10")
} ai {
  grita-ae("menor ou igual a 10")
}

repete-na-moral (cria i = 0; i < 3; i += 1) {
  grita-ae(i)
}

repete-enquanto (falso) {
  // never runs
}
```

## Classes

```xs
classe Pessoa {
  spawna(nome, idade) {
    esse-cara.nome = nome
    esse-cara.idade = idade
  }

  metodo descreve() {
    volta esse-cara.nome + " tem " + esse-cara.idade + " anos"
  }
}

cria p = novo Pessoa("Ana", 30)
grita-ae(p.descreve())
```

## Error Handling

```xs
tenta {
  cria obj = desembola('{"invalido": }')
} fodeu(erro) {
  grita-ae("deu ruim:", erro.message)
} no-fim {
  grita-ae("sempre roda")
}
```

## Modules

```xs
// utils.xs
resolve quadrado(x) {
  volta x * x
}
manda-ai quadrado

// main.xs
traz-ai "./utils.xs"
grita-ae(quadrado(4))   // 16
```

## HTTP Server

```xs
cria srv = escuta(3000, (req, res) => {
  res.status(200).json({
    url: req.url,
    metodo: req.metodo,
    corpo: req.corpo
  })
})
grita-ae("Servidor rodando em http://localhost:3000")

// later, to stop the server:
aguenta-ai(5000)
terminamos!(srv)
```

## Tests

```xs
crush("math") {
  date(1 + 1, 2)
  deu-match(10 > 3)
}

crush("strings") {
  date(tamanho("abc"), 3)
}
```

Run with `xana test`. The `crush "name"` form without parentheses also works.

## Tasks

```xs
tarefa "hello" {
  grita-ae("hello task")
}
```

Run with `xana hello`.
