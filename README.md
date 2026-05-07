# 🚀 XanaScript (.xs)

> “Linguagem experimental com sintaxe em português que transpila para JS e executa em ambiente isolado.”

Tudo escrito em JavaScript.

XanaScript mistura:

* DSL em português
* memes
* runtime async
* AST própria
* VM stack-based
* interpreter próprio
* pipeline de compilação

---

# ✨ Features

* Sintaxe em português
* Lexer próprio
* Parser Pratt
* AST própria
* Interpreter AST direto
* Bytecode VM experimental
* Optimizer simples
* Funções
* Loops
* Condicionais
* Async real
* Sistema de módulos
* Arrays
* Objetos
* Booleanos
* Null
* Try/Catch
* Imports recursivos
* Cache de módulos
* Runtime isolado
* VM stack-based
* Constant folding
* Sem eval no interpreter principal

---

# 🧠 Arquitetura

```text
.xs
 ↓
Lexer
 ↓
Parser Pratt
 ↓
AST
 ↓
Optimizer
 ↓
┌──────────────────┐
│ AST Interpreter  │
└──────────────────┘

ou

┌──────────────────┐
│ Bytecode Compiler│
↓                  │
│ VM Stack-Based   │
└──────────────────┘
```

---

# 📦 Instalação

```bash
git clone https://github.com/flazo0/xs.git /XanaScript

cd XanaScript

npm install
```

---

# ▶️ Uso

## Executar AST Interpreter

```bash
node src/cli.js run index.xs
```

---

## Executar VM

```bash
node src/cli.js vm index.xs
```

---

## CLI global

```bash
npm link
```

Depois:

```bash
xs run index.xs
xs vm index.xs
```

---

# 🧪 Sintaxe

---

# Programa

```xs
PARTIU()

SOLTA O GRITO("fala tropa")

ACABOU()
```

---

# Variáveis

```xs
CRIA nome = "idris"

CRIA idade = 99
```

---

# Operações matemáticas

```xs
CRIA x = 10 + 20 * 3

SOLTA O GRITO(x)
```

---

# Operadores lógicos

```xs
CRIA x = VERDADEIRO && FALSO

CRIA y = VERDADEIRO || FALSO

CRIA z = !FALSO
```

---

# Comparações

```xs
10 == 10
10 != 5

10 > 5
10 < 5

10 >= 5
10 <= 5
```

---

# Booleanos

```xs
CRIA ativo = VERDADEIRO

CRIA morto = FALSO
```

---

# Null

```xs
CRIA x = NULO
```

---

# 🔁 Condicionais

```xs
SE LIGA SO (10 > 5) {

    SOLTA O GRITO("maior")

} SENAO {

    SOLTA O GRITO("menor")

}
```

---

# 🔄 Loops

```xs
REPETE NA MORAL (
    CRIA i = 0;
    i < 5;
    i = i + 1
) {

    SOLTA O GRITO(i)

}
```

---

# 🧪 Funções

```xs
CHAMA ESSE CARA soma(a, b) {

    VOLTA a + b

}

CRIA r = soma(10, 20)

SOLTA O GRITO(r)
```

---

# 📦 Módulos

---

## Export

```xs
CHAMA ESSE CARA soma(a, b) {

    VOLTA a + b

}

EXPORTA soma
```

---

## Import

```xs
CRIA math = IMPORTA "./utils.xs"

CRIA r = math.soma(2, 3)

SOLTA O GRITO(r)
```

---

# ⚡ Async

---

# HTTP

```xs
CRIA data = AGORA VAI(
    "https://jsonplaceholder.typicode.com/todos/1"
)

SOLTA O GRITO(data)
```

---

# Sleep

```xs
SOLTA O GRITO("esperando")

ESPERA AI(1000)

SOLTA O GRITO("voltou")
```

---

# 🎲 Aleatório

```xs
CRIA n = SORTEIA(1, 100)

SOLTA O GRITO(n)
```

---

# 🧾 JSON

```xs
CRIA obj = PARSEIA('{"nome":"idris"}')

SOLTA O GRITO(obj.nome)
```

---

# 🌱 ENV

```xs
CRIA home = OUVE AQUI("HOME")

SOLTA O GRITO(home)
```

---

# 🗣️ Logs

```xs
SOLTA O GRITO("normal")

FALA BAIXO("warning")
```

---

# 📚 Arrays

```xs
CRIA nums = [1, 2, 3]

SOLTA O GRITO(nums)

SOLTA O GRITO(nums[0])
```

---

# 🧱 Objetos

```xs
CRIA user = {
    nome: "idris",
    idade: 99
}

SOLTA O GRITO(user.nome)
```

---

# 🧨 Try/Catch

```xs
TENTA {

    SOLTA O GRITO(x)

}
PEGA(err) {

    SOLTA O GRITO("deu ruim")

}
```

---

# 🧃 Exemplo completo

```xs
PARTIU()

CHAMA ESSE CARA soma(a, b) {

    VOLTA a + b

}

CRIA nums = [1,2,3]

CRIA user = {
    nome: "idris"
}

CRIA ativo = VERDADEIRO

CRIA r = soma(10, 20)

SOLTA O GRITO(r)

SE LIGA SO (
    ativo && r > 10
) {

    SOLTA O GRITO("passou")

}

CRIA json = PARSEIA(
    '{"ok":true}'
)

SOLTA O GRITO(json.ok)

CRIA n = SORTEIA(1,100)

SOLTA O GRITO(n)

ESPERA AI(500)

TENTA {

    CRIA x = y

}
PEGA(err) {

    FALA BAIXO("deu erro")

}

ACABOU()
```

---

# ⚙️ Pipeline interno

---

# Lexer

Transforma:

```xs
CRIA x = 10
```

em:

```js
[
  { type: "CRIA" },
  { type: "IDENT", value: "x" },
  { type: "=" },
  { type: "NUMBER", value: 10 }
]
```

---

# Parser Pratt

Resolve precedência:

```xs
10 + 20 * 3
```

AST:

```text
      +
    /   \
   10    *
        / \
      20   3
```

---

# Optimizer

Constant folding:

```xs
10 + 20 * 3
```

vira:

```xs
70
```

---

# 🧠 Execution Engines

XanaScript possui 2 motores.

---

# AST Interpreter

Executa AST diretamente.

Sem:

* eval
* Function()
* JS string

Mais seguro.

---

# Bytecode VM

Compila AST → bytecode.

Exemplo:

```text
PUSH 10
PUSH 20
PUSH 3
MUL
ADD
STORE x
```

Executado numa VM stack-based.

---

# 🧪 Bytecode

Código:

```xs
CRIA x = 10 + 20 * 3
```

Bytecode:

```text
PUSH 10
PUSH 20
PUSH 3
MUL
ADD
STORE x
```

---

# 🧩 Built-ins

| XanaScript         | Equivalente  |
| ------------------ | ------------ |
| `SOLTA O GRITO(x)` | console.log  |
| `FALA BAIXO(x)`    | console.warn |
| `AGORA VAI(url)`   | HTTP GET     |
| `ESPERA AI(ms)`    | sleep        |
| `SORTEIA(a,b)`     | random int   |
| `PARSEIA(str)`     | JSON.parse   |
| `OUVE AQUI(k)`     | process.env  |
| `IMPORTA(path)`    | loader `.xs` |

---

# 🔐 Segurança

* Runtime isolado
* Contexto encapsulado
* Cache de módulos
* Imports controlados
* VM sandbox
* Sem eval no interpreter

⚠️ Ainda não é sandbox perfeito.

---

# 🧠 AST Nodes

---

# Literais

```js
Num
Str
Bool
Nil
ArrayLiteral
ObjectLiteral
```

---

# Expressões

```js
Binary
Unary
Assign
Call
Member
IndexExpr
```

---

# Statements

```js
VarDecl
IfStmt
ForStmt
FunctionDecl
ReturnStmt
ImportStmt
ExportStmt
TryCatchStmt
```

---

# 🔮 Roadmap

---

# Linguagem

* switch
* classes
* enums
* pattern matching
* destructuring
* decorators

---

# Runtime

* fetch nativo
* websockets
* fs sandbox
* timers
* scheduler

---

# VM

* registradores
* optimizer SSA
* GC simples
* JIT experimental

---

# Tooling

* syntax highlight
* formatter
* debugger
* LSP
* source maps

---

# ⚠️ Limitações

* Sem tipagem
* Sem GC próprio
* Closures parciais
* VM ainda experimental
* Errors ainda crus
* Imports simples
* Sem source maps

---

# 🤝 Contribuição

PRs são bem-vindos.

Áreas úteis:

* parser
* optimizer
* VM
* debugger
* built-ins
* tooling
* stdlib
* macros

---

# 🧃 Meme máximo

```xs
PARTIU()

CHAMA ESSE CARA tropa(x) {

    SE LIGA SO (
        x > 10 && x != 20
    ) {

        SOLTA O GRITO("ta forte")

    } SENAO {

        FALA BAIXO("ta fofo")

    }

}

CRIA n = SORTEIA(1,100)

tropa(n)

ACABOU()
```