# Referencia de Sintaxe

XanaScript usa palavras-chave em portugues. A sintaxe e similar a C com blocos delimitados por chaves.

## Estrutura do Programa

Todo programa e envolvido por `PARTIU()` e `ACABOU()`:

```xs
PARTIU()
  SOLTA O GRITO("Hello World!")
ACABOU()
```

## Comentarios

```xs
// comentario de uma linha
```

## Variaveis

```xs
CRIA x = 10
CRIA nome = "Maria"
CRIA ativo = VERDADEIRO
CRIA valor = NULO
CRIA resultado = 10 + 20
```

## Tipos de Dados

| Tipo | Exemplos |
|------|----------|
| Numero | `10`, `3.14`, `-5` |
| Texto | `"texto"`, `'texto'` |
| Booleano | `VERDADEIRO`, `FALSO` |
| Nulo | `NULO` |
| Vetor | `[1, 2, 3]` |
| Objeto | `{ nome: "Joao", idade: 30 }` |

### Strings Template

```xs
CRIA nome = "Maria"
SOLTA O GRITO(`Ola, ${nome}!`)
```

## Operadores

### Aritmeticos

| Operador | Significado |
|----------|-------------|
| `+` | Adicao |
| `-` | Subtracao |
| `*` | Multiplicacao |
| `/` | Divisao |
| `%` | Modulo |

### Comparacao

| Operador | Significado |
|----------|-------------|
| `==` | Igual |
| `!=` | Diferente |
| `>` | Maior que |
| `<` | Menor que |
| `>=` | Maior ou igual |
| `<=` | Menor ou igual |

### Logicos

| Operador | Significado |
|----------|-------------|
| `&&` | E |
| `\|\|` | OU |
| `!` | NAO |

### Atribuicao Composta

| Operador | Significado |
|----------|-------------|
| `+=` | Adiciona e atribui |
| `-=` | Subtrai e atribui |
| `*=` | Multiplica e atribui |
| `/=` | Divide e atribui |
| `%=` | Modulo e atribui |

## Fluxo de Controle

### Se / Senao

```xs
SE LIGA SO (x > 10) {
  SOLTA O GRITO("maior que 10")
} SENAO {
  SOLTA O GRITO("menor ou igual a 10")
}
```

### Senao Se

```xs
SE LIGA SO (x > 10) {
  SOLTA O GRITO("maior")
} SENAO SE LIGA SO (x == 10) {
  SOLTA O GRITO("igual")
} SENAO {
  SOLTA O GRITO("menor")
}
```

### Enquanto

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

### Interromper / Continuar

```xs
REPETE NA MORAL (CRIA i = 0; i < 10; i += 1) {
  SE LIGA SO (i == 3) { CONTINUA() }
  SE LIGA SO (i == 7) { VOA() }
  SOLTA O GRITO(i)
}
```

## Funcoes

### Declaracao

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

### Funcoes Arrow

```xs
CRIA dobrar = (x) => x * 2
CRIA somar = (a, b) => {
  VOLTA a + b
}
```

### Funcoes Assincronas

```xs
CRIA buscar = ASSINCRONO (url) => {
  CRIA resp = AGORA_VAI(url)
  SOLTA O GRITO(resp)
}
```

## Objetos e Vetores

### Vetores

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

## Classes / POO

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

## Tratamento de Erros

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

## Escolha

```xs
ESCOLHE (cor) {
  CASO "vermelho": SOLTA O GRITO("red")
  CASO "azul": SOLTA O GRITO("blue")
  PADRAO: SOLTA O GRITO("unknown")
}
```

## Correspondencia de Padroes

```xs
COMBINA (valor) {
  CASO 1: SOLTA O GRITO("um")
  CASO 2: SOLTA O GRITO("dois")
  CASO _: SOLTA O GRITO("outro")
}
```

## Macros (Tempo de Compilacao)

```xs
MACRO quadrado(x) {
  x * x
}

CRIA y = quadrado(5)  // expande para 5 * 5
```

## Operador Ternario

```xs
CRIA resultado = x > 10 ? "grande" : "pequeno"
```
