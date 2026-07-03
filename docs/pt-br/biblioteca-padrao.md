# Biblioteca Padrao

XanaScript fornece funcoes nativas acessiveis sem importacoes.

## Entrada/Saida

### SOLTA O GRITO(...args)

Imprime no stdout (equivalente ao console.log).

```xs
SOLTA O GRITO("Hello World!")
SOLTA O GRITO(1, 2, 3)
```

### FALA BAIXO(...args)

Imprime no stderr (equivalente ao console.warn).

```xs
FALA BAIXO("Warning message")
```

## HTTP

### AGORA_VAI(url)

Realiza uma requisicao HTTP GET. Retorna a resposta interpretada como JSON.

```xs
CRIA resp = AGORA_VAI("https://api.example.com/data")
SOLTA O GRITO(resp)
```

## Temporizacao

### ESPERA_AI(ms)

Pausa a execucao por um determinado numero de milissegundos.

```xs
SOLTA O GRITO("waiting...")
ESPERA_AI(2000)
SOLTA O GRITO("done!")
```

## Matematica

### SORTEIA(min, max)

Retorna um numero inteiro aleatorio entre minimo e maximo (inclusive).

```xs
CRIA dice = SORTEIA(1, 6)
```

## JSON

### PARSEIA(json)

Interpreta uma string JSON em um objeto.

```xs
CRIA obj = PARSEIA('{"nome": "Joao"}')
```

## Ambiente

### OUVE_AQUI(chave)

Le uma variavel de ambiente. Retorna nulo se nao estiver definida.

```xs
CRIA path = OUVE_AQUI("PATH")
```

## String / Vetor

### TAMANHO(valor)

Retorna o comprimento de uma string ou vetor.

```xs
TAMANHO("hello")     // 5
TAMANHO([1, 2, 3])   // 3
```

### DIVIDE_TEXTO(texto, separador)

Divide uma string por um separador. Retorna um vetor.

```xs
CRIA partes = DIVIDE_TEXTO("a,b,c", ",")
```

### DECODIFICA_URL(url)

Decodifica uma string codificada como URL.

```xs
DECODIFICA_URL("hello%20world")  // "hello world"
```

## Servidor

### CRIA_SERVIDOR(porta, handler)

Cria um servidor HTTP. O handler recebe (req, res) com req.method, req.url, req.body e res.send(texto), res.json(obj), res.status(codigo).

```xs
CRIA_SERVIDOR(3000, (req, res) => {
  res.json({ mensagem: "ola" })
})
```

### PARA_SERVIDOR(server)

Para um servidor HTTP.

```xs
CRIA srv = CRIA_SERVIDOR(3000, handler)
ESPERA_AI(5000)
PARA_SERVIDOR(srv)
```

## Testes

### TESTE(nome, corpo)

Define um bloco de teste.

```xs
TESTE("addition test") {
  AFIRMA(1 + 1 == 2)
}
```

### AFIRMA(condicao)

Afirma que uma condicao e verdadeira.

```xs
AFIRMA(x > 0)
```

### ASSUNTO(real, esperado)

Afirma que dois valores sao iguais.

```xs
ASSUNTO(soma(2, 3), 5)
```

## Executor de Tarefas

### TAREFA(nome, corpo)

Define uma tarefa que pode ser executada via CLI.

```xs
TAREFA("build") {
  SOLTA O GRITO("building...")
}
```
