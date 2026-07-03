# Standard Library

XanaScript provides built-in functions accessible without imports.

## I/O

### SOLTA O GRITO(...args)

Prints to stdout (console.log equivalent).

```xs
SOLTA O GRITO("Hello World!")
SOLTA O GRITO(1, 2, 3)
```

### FALA BAIXO(...args)

Prints to stderr (console.warn equivalent).

```xs
FALA BAIXO("Warning message")
```

## HTTP

### AGORA_VAI(url)

Performs an HTTP GET request. Returns the JSON-parsed response.

```xs
CRIA resp = AGORA_VAI("https://api.example.com/data")
SOLTA O GRITO(resp)
```

## Timing

### ESPERA_AI(ms)

Pauses execution for a given number of milliseconds.

```xs
SOLTA O GRITO("waiting...")
ESPERA_AI(2000)
SOLTA O GRITO("done!")
```

## Math

### SORTEIA(min, max)

Returns a random integer between min and max (inclusive).

```xs
CRIA dice = SORTEIA(1, 6)
```

## JSON

### PARSEIA(json)

Parses a JSON string into an object.

```xs
CRIA obj = PARSEIA('{"nome": "Joao"}')
```

## Environment

### OUVE_AQUI(chave)

Reads an environment variable. Returns null if not set.

```xs
CRIA path = OUVE_AQUI("PATH")
```

## String / Array

### TAMANHO(valor)

Returns the length of a string or array.

```xs
TAMANHO("hello")     // 5
TAMANHO([1, 2, 3])   // 3
```

### DIVIDE_TEXTO(texto, separador)

Splits a string by separator. Returns an array.

```xs
CRIA partes = DIVIDE_TEXTO("a,b,c", ",")
```

### DECODIFICA_URL(url)

Decodes a URL-encoded string.

```xs
DECODIFICA_URL("hello%20world")  // "hello world"
```

## Server

### CRIA_SERVIDOR(porta, handler)

Creates an HTTP server. The handler receives (req, res) with req.method, req.url, req.body and res.send(text), res.json(obj), res.status(code).

```xs
CRIA_SERVIDOR(3000, (req, res) => {
  res.json({ mensagem: "ola" })
})
```

### PARA_SERVIDOR(server)

Stops an HTTP server.

```xs
CRIA srv = CRIA_SERVIDOR(3000, handler)
ESPERA_AI(5000)
PARA_SERVIDOR(srv)
```

## Testing

### TESTE(name, body)

Defines a test block.

```xs
TESTE("addition test") {
  AFIRMA(1 + 1 == 2)
}
```

### AFIRMA(condition)

Asserts a condition is true.

```xs
AFIRMA(x > 0)
```

### ASSUNTO(actual, expected)

Asserts two values are equal.

```xs
ASSUNTO(soma(2, 3), 5)
```

## Task Runner

### TAREFA(name, body)

Defines a task that can be run from CLI.

```xs
TAREFA("build") {
  SOLTA O GRITO("building...")
}
```
