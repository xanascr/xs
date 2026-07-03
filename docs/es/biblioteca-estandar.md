# Biblioteca Estandar

XanaScript proporciona funciones nativas accesibles sin importaciones.

## Entrada/Salida

### SOLTA O GRITO(...args)

Imprime en stdout (equivalente a console.log).

```xs
SOLTA O GRITO("Hello World!")
SOLTA O GRITO(1, 2, 3)
```

### FALA BAIXO(...args)

Imprime en stderr (equivalente a console.warn).

```xs
FALA BAIXO("Warning message")
```

## HTTP

### AGORA_VAI(url)

Realiza una peticion HTTP GET. Retorna la respuesta parseada como JSON.

```xs
CRIA resp = AGORA_VAI("https://api.example.com/data")
SOLTA O GRITO(resp)
```

## Temporizacion

### ESPERA_AI(ms)

Pausa la ejecucion durante un numero dado de milisegundos.

```xs
SOLTA O GRITO("waiting...")
ESPERA_AI(2000)
SOLTA O GRITO("done!")
```

## Matematicas

### SORTEIA(min, max)

Retorna un numero entero aleatorio entre minimo y maximo (inclusive).

```xs
CRIA dice = SORTEIA(1, 6)
```

## JSON

### PARSEIA(json)

Interpreta una cadena JSON en un objeto.

```xs
CRIA obj = PARSEIA('{"nome": "Joao"}')
```

## Entorno

### OUVE_AQUI(clave)

Lee una variable de entorno. Retorna nulo si no esta definida.

```xs
CRIA path = OUVE_AQUI("PATH")
```

## Cadena / Arreglo

### TAMANHO(valor)

Retorna la longitud de una cadena o arreglo.

```xs
TAMANHO("hello")     // 5
TAMANHO([1, 2, 3])   // 3
```

### DIVIDE_TEXTO(texto, separador)

Divide una cadena por un separador. Retorna un arreglo.

```xs
CRIA partes = DIVIDE_TEXTO("a,b,c", ",")
```

### DECODIFICA_URL(url)

Decodifica una cadena codificada como URL.

```xs
DECODIFICA_URL("hello%20world")  // "hello world"
```

## Servidor

### CRIA_SERVIDOR(puerto, handler)

Crea un servidor HTTP. El handler recibe (req, res) con req.method, req.url, req.body y res.send(texto), res.json(obj), res.status(codigo).

```xs
CRIA_SERVIDOR(3000, (req, res) => {
  res.json({ mensagem: "ola" })
})
```

### PARA_SERVIDOR(server)

Detiene un servidor HTTP.

```xs
CRIA srv = CRIA_SERVIDOR(3000, handler)
ESPERA_AI(5000)
PARA_SERVIDOR(srv)
```

## Pruebas

### TESTE(nombre, cuerpo)

Define un bloque de prueba.

```xs
TESTE("addition test") {
  AFIRMA(1 + 1 == 2)
}
```

### AFIRMA(condicion)

Afirma que una condicion es verdadera.

```xs
AFIRMA(x > 0)
```

### ASSUNTO(real, esperado)

Afirma que dos valores son iguales.

```xs
ASSUNTO(soma(2, 3), 5)
```

## Ejecutor de Tareas

### TAREFA(nombre, cuerpo)

Define una tarea que puede ejecutarse desde la CLI.

```xs
TAREFA("build") {
  SOLTA O GRITO("building...")
}
```
