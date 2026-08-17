# Syntax Reference

XanaScript uses Portuguese keywords and a C-like syntax with curly-braced blocks.

## Program Structure

A program is a sequence of statements:

```xs
grita-ae("Hello, World!")
```

## Comments

```xs
// single-line comment

/* multi-line
   comment */
```

## Variables

```xs
cria x = 10                 // let/var — mutable
cria nome = "Maria"
cria ativo = verdadeiro     // boolean
cria vazio = nulo           // null
lei PI = 3.14159            // const — immutable
fofoca app = { v: 1 }       // global
```

## Data Types

| Type     | Example                       |
| -------- | ----------------------------- |
| Number   | `10`, `3.14`, `-5`            |
| String   | `"texto"`, `'texto'`          |
| Boolean  | `verdadeiro`, `falso`         |
| Null     | `nulo`                        |
| Array    | `[1, 2, 3]`                   |
| Object   | `{ nome: "Joao", idade: 30 }` |
| Template | `` `Ola, ${nome}!` ``         |

## Operators

### Arithmetic

`+` `-` `*` `/` `%` `**` (exponentiation)

### Comparison

`==` `!=` `===` (strict) `!==` (strict not-equal) `>` `<` `>=` `<=` `~=` (regex match)

### Logical

`&&` `||` `!` `??` (null coalescing)

### Optional Chaining

`?.` — safe member access:

```xs
cria rua = usuario?.endereco?.rua   // null if any link is null
```

### Spread

`...` in arrays and objects:

```xs
cria nums = [...[1, 2], 3]        // [1, 2, 3]
cria copia = { ...obj, extra: 1 }
```

### Compound Assignment

`+=` `-=` `*=` `/=` `%=` `**=` `&&=` `||=` `??=` `|=` `&=` `^=` `<<=` `>>=`

### Ternary

```xs
cria resultado = x > 10 ? "grande" : "pequeno"
```

## Control Flow

### If / Else

```xs
se-pah (x > 10) {
  grita-ae("maior que 10")
} ai {
  grita-ae("menor ou igual a 10")
}
```

### Else If

```xs
se-pah (x > 10) {
  grita-ae("maior")
} ai se-pah (x == 10) {
  grita-ae("igual")
} ai {
  grita-ae("menor")
}
```

### While

```xs
cria i = 0
repete-enquanto (i < 5) {
  grita-ae(i)
  i += 1
}
```

### For

```xs
repete-na-moral (cria i = 0; i < 5; i += 1) {
  grita-ae(i)
}
```

### Break / Continue

```xs
repete-na-moral (cria i = 0; i < 10; i += 1) {
  se-pah (i == 3) { segue-o-baile }   // continue
  se-pah (i == 7) { mete-o-pe }       // break
  grita-ae(i)
}
```

`mete-o-pe` and `segue-o-baile` are statements — parentheses are optional (`mete-o-pe()` / `segue-o-baile()` also work).

## Functions

### Declaration

```xs
resolve soma(a, b) {
  volta a + b
}
```

### Typed

```xs
resolve soma(a: eh-numero, b: eh-numero): eh-numero {
  volta a + b
}
```

### Return

```xs
resolve dobro(x) {
  volta x * 2
}
```

### Arrow Functions

```xs
cria dobrar = (x) => x * 2
cria somar = (a, b) => {
  volta a + b
}
```

### Async Functions

```xs
cria buscar = assincrono (url) => {
  cria resp = stalkeia(url)
  grita-ae(resp)
}
```

## Objects and Arrays

### Arrays

```xs
cria nums = [1, 2, 3]
grita-ae(nums[0])
tamanho(nums)
```

### Objects

```xs
cria pessoa = {
  nome: "Joao",
  idade: 30
}
grita-ae(pessoa.nome)
```

## Classes / OOP

```xs
classe Animal {
  spawna(nome) {
    esse-cara.nome = nome
  }
  metodo falar() {
    grita-ae(esse-cara.nome)
  }
}

classe Cachorro herda Animal {
  metodo falar() {
    grita-ae(esse-cara.nome + " diz au au")
  }
}

cria rex = novo Cachorro("Rex")
rex.falar()
```

## Error Handling

```xs
tenta {
  cria x = desembola("invalido")
} fodeu(erro) {
  grita-ae("Erro:", erro)
} no-fim {
  grita-ae("sempre roda")
}
```

## Modules

```xs
// math.xs
resolve soma(a, b) {
  volta a + b
}
manda-ai soma

// main.xs
traz-ai "./math.xs"
grita-ae(soma(2, 3))
```

## Switch

```xs
vai-de (cor) {
  se-for "vermelho": grita-ae("red")
  se-for "azul": grita-ae("blue")
  se-nao-der: grita-ae("unknown")
}
```

## Pattern Matching

```xs
ve-se (valor) {
  bateu-com 1: grita-ae("um")
  bateu-com 2: grita-ae("dois")
  qualquer-coisa: grita-ae("outro")
}
```

## Type Guards

```xs
se-pah (tipo-de(x) == "eh-numero") {
  grita-ae("x é um número")
}

se-pah (instancia-de(dog, Animal)) {
  grita-ae("é um animal")
}
```

## Macros (Compile-time)

```xs
tpm quadrado(x) {
  x * x
}

cria y = quadrado(5)   // expands to 5 * 5
```

## Tests

```xs
crush("addition works") {
  date(1 + 1, 2)
  deu-match(2 > 1)
}
```

`crush` accepts both `crush "name"` and `crush("name")` forms.

## Tasks

```xs
tarefa "build" {
  grita-ae("building...")
}
```

Run a task with `xana <tarefa>`.
