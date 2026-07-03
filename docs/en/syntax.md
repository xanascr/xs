# Syntax Reference

XanaScript uses Portuguese keywords. The syntax is C-like with blocks delimited by curly braces.

## Program Structure

Every program is wrapped in `PARTIU()` and `ACABOU()`:

```xs
PARTIU()
  SOLTA O GRITO("Hello World!")
ACABOU()
```

## Comments

```xs
// single-line comment
```

## Variables

```xs
CRIA x = 10
CRIA nome = "Maria"
CRIA ativo = VERDADEIRO
CRIA valor = NULO
CRIA resultado = 10 + 20
```

## Data Types

| Type | Examples |
|------|----------|
| Number | `10`, `3.14`, `-5` |
| String | `"texto"`, `'texto'` |
| Boolean | `VERDADEIRO`, `FALSO` |
| Null | `NULO` |
| Array | `[1, 2, 3]` |
| Object | `{ nome: "Joao", idade: 30 }` |

### Template Strings

```xs
CRIA nome = "Maria"
SOLTA O GRITO(`Ola, ${nome}!`)
```

## Operators

### Arithmetic

| Operator | Meaning |
|----------|---------|
| `+` | Addition |
| `-` | Subtraction |
| `*` | Multiplication |
| `/` | Division |
| `%` | Modulo |

### Comparison

| Operator | Meaning |
|----------|---------|
| `==` | Equal |
| `!=` | Not equal |
| `>` | Greater than |
| `<` | Less than |
| `>=` | Greater or equal |
| `<=` | Less or equal |

### Logical

| Operator | Meaning |
|----------|---------|
| `&&` | AND |
| `\|\|` | OR |
| `!` | NOT |

### Compound Assignment

| Operator | Meaning |
|----------|---------|
| `+=` | Add and assign |
| `-=` | Subtract and assign |
| `*=` | Multiply and assign |
| `/=` | Divide and assign |
| `%=` | Modulo and assign |

## Control Flow

### If / Else

```xs
SE LIGA SO (x > 10) {
  SOLTA O GRITO("maior que 10")
} SENAO {
  SOLTA O GRITO("menor ou igual a 10")
}
```

### Else If

```xs
SE LIGA SO (x > 10) {
  SOLTA O GRITO("maior")
} SENAO SE LIGA SO (x == 10) {
  SOLTA O GRITO("igual")
} SENAO {
  SOLTA O GRITO("menor")
}
```

### While

```xs
CRIA i = 0
REPETE AI (i < 5) {
  SOLTA O GRITO(i)
  i += 1
}
```

### For

```xs
REPETE NA MORAL (CRIA i = 0; i < 5; i += 1) {
  SOLTA O GRITO(i)
}
```

### Break / Continue

```xs
REPETE NA MORAL (CRIA i = 0; i < 10; i += 1) {
  SE LIGA SO (i == 3) { CONTINUA() }
  SE LIGA SO (i == 7) { VOA() }
  SOLTA O GRITO(i)
}
```

## Functions

### Declaration

```xs
CHAMA ESSE CARA soma(a, b) {
  VOLTA a + b
}
```

### Return

```xs
CHAMA ESSE CARA dobro(x) {
  VOLTA x * 2
}
```

### Arrow Functions

```xs
CRIA dobrar = (x) => x * 2
CRIA somar = (a, b) => {
  VOLTA a + b
}
```

### Async Functions

```xs
CRIA buscar = ASSINCRONO (url) => {
  CRIA resp = AGORA_VAI(url)
  SOLTA O GRITO(resp)
}
```

## Objects and Arrays

### Arrays

```xs
CRIA nums = [1, 2, 3]
SOLTA O GRITO(nums[0])
TAMANHO(nums)
```

### Objects

```xs
CRIA pessoa = {
  nome: "Joao",
  idade: 30
}
SOLTA O GRITO(pessoa.nome)
```

## Classes / OOP

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

## Error Handling

```xs
TENTA {
  CRIA x = PARSEIA("invalido")
} PEGA(erro) {
  SOLTA O GRITO("Erro:", erro)
}
```

## Modules

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

## Switch

```xs
ESCOLHE (cor) {
  CASO "vermelho": SOLTA O GRITO("red")
  CASO "azul": SOLTA O GRITO("blue")
  PADRAO: SOLTA O GRITO("unknown")
}
```

## Pattern Matching

```xs
COMBINA (valor) {
  CASO 1: SOLTA O GRITO("um")
  CASO 2: SOLTA O GRITO("dois")
  CASO _: SOLTA O GRITO("outro")
}
```

## Macros (Compile-time)

```xs
MACRO quadrado(x) {
  x * x
}

CRIA y = quadrado(5)  // expands to 5 * 5
```

## Ternary Operator

```xs
CRIA resultado = x > 10 ? "grande" : "pequeno"
```
