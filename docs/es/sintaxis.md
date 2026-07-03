# Referencia de Sintaxis

XanaScript usa palabras clave en portugues. La sintaxis es similar a C con bloques delimitados por llaves.

## Estructura del Programa

Todo programa esta envuelto en `PARTIU()` y `ACABOU()`:

```xs
PARTIU()
  SOLTA O GRITO("Hello World!")
ACABOU()
```

## Comentarios

```xs
// comentario de una linea
```

## Variables

```xs
CRIA x = 10
CRIA nome = "Maria"
CRIA ativo = VERDADEIRO
CRIA valor = NULO
CRIA resultado = 10 + 20
```

## Tipos de Datos

| Tipo | Ejemplos |
|------|----------|
| Numero | `10`, `3.14`, `-5` |
| Texto | `"texto"`, `'texto'` |
| Booleano | `VERDADEIRO`, `FALSO` |
| Nulo | `NULO` |
| Arreglo | `[1, 2, 3]` |
| Objeto | `{ nome: "Joao", idade: 30 }` |

### Plantillas de Cadenas

```xs
CRIA nome = "Maria"
SOLTA O GRITO(`Ola, ${nome}!`)
```

## Operadores

### Aritmeticos

| Operador | Significado |
|----------|-------------|
| `+` | Suma |
| `-` | Resta |
| `*` | Multiplicacion |
| `/` | Division |
| `%` | Modulo |

### Comparacion

| Operador | Significado |
|----------|-------------|
| `==` | Igual |
| `!=` | Diferente |
| `>` | Mayor que |
| `<` | Menor que |
| `>=` | Mayor o igual |
| `<=` | Menor o igual |

### Logicos

| Operador | Significado |
|----------|-------------|
| `&&` | Y |
| `\|\|` | O |
| `!` | NO |

### Asignacion Compuesta

| Operador | Significado |
|----------|-------------|
| `+=` | Suma y asigna |
| `-=` | Resta y asigna |
| `*=` | Multiplica y asigna |
| `/=` | Divide y asigna |
| `%=` | Modulo y asigna |

## Flujo de Control

### Si / Sino

```xs
SE LIGA SO (x > 10) {
  SOLTA O GRITO("maior que 10")
} SENAO {
  SOLTA O GRITO("menor ou igual a 10")
}
```

### Sino Si

```xs
SE LIGA SO (x > 10) {
  SOLTA O GRITO("maior")
} SENAO SE LIGA SO (x == 10) {
  SOLTA O GRITO("igual")
} SENAO {
  SOLTA O GRITO("menor")
}
```

### Mientras

```xs
CRIA i = 0
REPETE AI (i < 5) {
  SOLTA O GRITO(i)
  i += 1
}
```

### Para

```xs
REPETE NA MORAL (CRIA i = 0; i < 5; i += 1) {
  SOLTA O GRITO(i)
}
```

### Romper / Continuar

```xs
REPETE NA MORAL (CRIA i = 0; i < 10; i += 1) {
  SE LIGA SO (i == 3) { CONTINUA() }
  SE LIGA SO (i == 7) { VOA() }
  SOLTA O GRITO(i)
}
```

## Funciones

### Declaracion

```xs
CHAMA ESSE CARA soma(a, b) {
  VOLTA a + b
}
```

### Retorno

```xs
CHAMA ESSE CARA dobro(x) {
  VOLTA x * 2
}
```

### Funciones Flecha

```xs
CRIA dobrar = (x) => x * 2
CRIA somar = (a, b) => {
  VOLTA a + b
}
```

### Funciones Asincronas

```xs
CRIA buscar = ASSINCRONO (url) => {
  CRIA resp = AGORA_VAI(url)
  SOLTA O GRITO(resp)
}
```

## Objetos y Arreglos

### Arreglos

```xs
CRIA nums = [1, 2, 3]
SOLTA O GRITO(nums[0])
TAMANHO(nums)
```

### Objetos

```xs
CRIA pessoa = {
  nome: "Joao",
  idade: 30
}
SOLTA O GRITO(pessoa.nome)
```

## Clases / POO

```xs
CLASSE Animal {
  CONSTRUTOR(nome) {
    ISTO.nome = nome
  }
  METODO falar() {
    SOLTA O GRITO(ISTO.nome)
  }
}

CLASSE Cachorro HERDA Animal {
  METODO falar() {
    SOLTA O GRITO(ISTO.nome + " diz au au")
  }
}

CRIA rex = NOVA Cachorro("Rex")
rex.falar()
```

## Manejo de Errores

```xs
TENTA {
  CRIA x = PARSEIA("invalido")
} PEGA(erro) {
  SOLTA O GRITO("Erro:", erro)
}
```

## Modulos

```xs
// math.xs
EXPORTA soma

CHAMA ESSE CARA soma(a, b) {
  VOLTA a + b
}

// main.xs
IMPORTA "math"
SOLTA O GRITO(soma(2, 3))
```

## Elegir

```xs
ESCOLHE (cor) {
  CASO "vermelho": SOLTA O GRITO("red")
  CASO "azul": SOLTA O GRITO("blue")
  PADRAO: SOLTA O GRITO("unknown")
}
```

## Coincidencia de Patrones

```xs
COMBINA (valor) {
  CASO 1: SOLTA O GRITO("um")
  CASO 2: SOLTA O GRITO("dois")
  CASO _: SOLTA O GRITO("outro")
}
```

## Macros (Tiempo de Compilacion)

```xs
MACRO quadrado(x) {
  x * x
}

CRIA y = quadrado(5)  // expande a 5 * 5
```

## Operador Ternario

```xs
CRIA resultado = x > 10 ? "grande" : "pequeno"
```
