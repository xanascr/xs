# Standard Library

All built-in functions are available globally without imports.

## I/O

| Function | Description |
|----------|-------------|
| `grita-ae(...)` | Print to stdout (`console.log`) |
| `sussurra(...)` | Print warning to stderr (`console.warn`) |

```xs
grita-ae("Hello", 123, verdadeiro)
sussurra("cuidado!")
```

## Time

| Function | Description |
|----------|-------------|
| `horinha()` | Current timestamp in ms (`Date.now()`) |

```xs
cria inicio = horinha()
aguenta-ai(100)
grita-ae(horinha() - inicio)   // ~100
```

## String

| Function | Description |
|----------|-------------|
| `traduz-ai(x)` | Convert to string (`String`) |
| `tamanho(x)` | Length of string or array |
| `divide-texto(s, sep)` | Split string into `sus<eh-palavra>` |
| `juntar(arr, sep)` | Join array into a string |
| `decodifica-url(s)` | Decode a URL-encoded string |
| `encontra(s, sub)` | Regex match — returns match array or `nulo` |
| `url(s)` | Encode a string for use in a URL (`encodeURIComponent`) |

```xs
cria lista = divide-texto("a,b,c", ",")   // ["a", "b", "c"]
cria texto = juntar(lista, "-")           // "a-b-c"
grita-ae(tamanho("abc"))                  // 3
```

## JSON

| Function | Description |
|----------|-------------|
| `desembola(json)` | Parse JSON string into a value |
| `embrulha(valor, espaco?)` | Serialize a value to JSON (`JSON.stringify`) |

```xs
cria obj = desembola('{"nome":"Ana"}')
grita-ae(obj.nome)            // "Ana"
grita-ae(embrulha({a: 1}))    // '{"a":1}'
```

## Date / Crypto

| Function | Description |
|----------|-------------|
| `horinha()` | Current timestamp in ms (`Date.now()`) |
| `data-agora()` | Current time as ISO string |
| `data-de-ms(ms)` | Convert ms timestamp to ISO string |
| `hash(texto)` | SHA-256 hex digest |

## std/ modules

`traz-ai "nome"` resolves to `std/<nome>.xs` (modules written in XanaScript):

| Module | Exports |
|--------|---------|
| `math` | `soma`, `sub`, `mul`, `div`, `mod`, `abs`, `max`, `min`, `clamp` |
| `string` | `maiuscula`, `minuscula`, `aparada`, `começa-com`, `termina-com`, `tem`, `troca`, `invertida`, `repete`, `primeira-maiuscula`, `fatia` |
| `array` | `primeiro`, `ultimo`, `tem-elemento`, `acha-indice`, `fatia-arr`, `junta-arr`, `inverte-arr`, `soma-arr`, `media`, `maior`, `menor`, `empurra`, `tira-ultimo`, `unico` |
| `datas` | `agora-ms`, `agora`, `do-ms`, `diferenca-ms` |
| `json` | `em-json`, `em-json-bonito`, `de-json`, `hash-sha256` |

```xs
traz-ai "string"
traz-ai "array"
grita-ae(maiuscula("ola"))     // OLA
grita-ae(soma-arr([1,2,3]))    // 6
```

## Math

| Function | Description |
|----------|-------------|
| `escolhe(min, max)` | Random integer in `[min, max]` inclusive |

```xs
cria dado = escolhe(1, 6)   // 1..6
```

## Environment

| Function | Description |
|----------|-------------|
| `bisbilhota(var)` | Read env var (`process.env`) or `nulo` |

```xs
cria porta = bisbilhota("PORT") ?? "3000"
```

## Async / Timing

| Function | Description |
|----------|-------------|
| `aguenta-ai(ms)` | Sleep for `ms` milliseconds |

```xs
aguenta-ai(1000)   // wait 1 second
```

## HTTP

| Function | Description |
|----------|-------------|
| `stalkeia(url)` | Fetch JSON from a URL (3s timeout) |

```xs
cria dados = stalkeia("https://api.example.com/data")
grita-ae(dados)
```

## HTTP Server

### `escuta(port, handler)`

Starts an HTTP server. `handler` receives `(requisicao, resposta)`.

Request object:

| Field | Type | Description |
|-------|------|-------------|
| `.url` | string | Request path |
| `.metodo` | string | HTTP method |
| `.cabecalhos` | object | Request headers |
| `.corpo` | string | Raw request body |

Response object:

| Method | Description |
|--------|-------------|
| `.enviar(dados, tipo?)` | Send body with optional content type |
| `.json(dados)` | Send JSON response |
| `.status(codigo)` | Set status code (chainable) |
| `.cabecalho(chave, valor)` | Set a header (chainable) |

```xs
escuta(3000, (req, res) => {
  res.status(200).json({ url: req.url, metodo: req.metodo })
})

// stop the server
aguenta-ai(5000)
// in another handler, keep a reference and call:
// terminamos!(server)
```

### `terminamos!(server)`

Stops a running server started by `escuta`.