# 🚀 XanaScript (.xs)

> “Linguagem experimental com sintaxe em português que transpila para JS e executa em ambiente isolado.”

Ela possui:

* Lexer próprio
* Parser Pratt
* AST própria
* Interpreter direto
* VM stack-based experimental
* Optimizer simples
* Sistema de módulos
* Async runtime
* Built-ins úteis
* Execução isolada

Tudo escrito em JavaScript.

---

# ✨ Features

* **Sintaxe em português** (memes + DSL)
* **Lexer próprio**
* **Parser Pratt**
* **AST própria**
* **Interpreter AST direto**
* **Bytecode VM experimental**
* **Optimizer simples (constant folding)**
* **Funções** (`CHAMA ESSE CARA`)
* **Retorno** (`VOLTA`)
* **Condições** (`SE LIGA SO / SENAO`)
* **Loops** (`REPETE NA MORAL`)
* **Operadores lógicos**
  * `&&`
  * `||`
  * `!`
* **Comparações**
  * `==`
  * `!=`
  * `>`
  * `<`
  * `>=`
  * `<=`
* **Booleanos e null**
  * `VERDADEIRO`
  * `FALSO`
  * `NULO`
* **Módulos `.xs`**
  * `IMPORTA`
  * `EXPORTA`
* **Async real**
  * `AGORA VAI`
  * `ESPERA AI`
* **HTTP integrado**
* **Built-ins úteis**
  * `SORTEIA`
  * `PARSEIA`
  * `OUVE AQUI`
* **Execução isolada**
* **Arquitetura extensível**
* **Pipeline de compilação completo**
* **VM stack-based**
* **Imports recursivos**
* **Cache de módulos**
* **Sem eval**
* **Sem JS string no interpreter principal**

---

# 📦 Instalação

```bash
git clone https://github.com/flazo0/xs.git /XanaScript

cd XanaScript

npm install
````

> Requer Node.js 18+

---

# ▶️ Uso

## Executar programa

```bash
node src/cli.js run examples/app.xs
```

---

## Executar VM

```bash
node src/cli.js vm examples/app.xs
```

Mostra:

* bytecode gerado
* execução da VM

---

## CLI global

```bash
npm link
```

Depois:

```bash
xs run arquivo.xs
xs vm arquivo.xs
```

---

# 🧠 Sintaxe básica

---

## Programa

```xs
PARTIU()

SOLTA O GRITO("fala tropa")

ACABOU()
```

---

## Variáveis

```xs
CRIA nome = "joao"

CRIA idade = 20

CRIA ativo = VERDADEIRO
```

---

## Operações matemáticas

```xs
CRIA x = 10 + 20 * 3

SOLTA O GRITO(x)
```

---

## Operadores lógicos

```xs
CRIA x = VERDADEIRO && FALSO

CRIA y = VERDADEIRO || FALSO

CRIA z = !FALSO
```

---

## Comparações

```xs
SE LIGA SO (10 > 5) {
  SOLTA O GRITO("ok")
}
```

---

## Null

```xs
CRIA x = NULO
```

---

# 🔁 Condicional

```xs
SE LIGA SO (x > 10) {

  SOLTA O GRITO("maior")

} SENAO {

  SOLTA O GRITO("menor")

}
```

---

# 🔄 Loop

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

CRIA r = soma(2, 3)

SOLTA O GRITO(r)
```

---

# 📦 Módulos (.xs)

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
CRIA mod = IMPORTA "./utils.xs"

CRIA r = mod.soma(2, 3)
```

---

## Import direto

```xs
CRIA { soma } = IMPORTA "./utils.xs"

CRIA r = soma(10, 20)
```

---

# ⚡ Async / Await

---

## HTTP

```xs
CRIA data = AGORA VAI(
  "https://jsonplaceholder.typicode.com/todos/1"
)

SOLTA O GRITO(data)
```

---

## Sleep

```xs
SOLTA O GRITO("esperando")

ESPERA AI(1000)

SOLTA O GRITO("foi")
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
CRIA obj = PARSEIA('{"a":1}')

SOLTA O GRITO(obj.a)
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

# 🧱 Exemplo completo

```xs
PARTIU()

CRIA { soma } = IMPORTA "./utils.xs"

CRIA r = soma(5, 7)

SOLTA O GRITO(r)

CRIA n = SORTEIA(1, 10)

SOLTA O GRITO(n)

CRIA json = PARSEIA('{"ok":true}')

SOLTA O GRITO(json.ok)

CRIA ativo = VERDADEIRO

SE LIGA SO (ativo && r > 10) {

  SOLTA O GRITO("passou")

}

CRIA data = AGORA VAI(
  "https://jsonplaceholder.typicode.com/todos/1"
)

SOLTA O GRITO(data)

ESPERA AI(500)

CRIA env = OUVE AQUI("HOME")

SOLTA O GRITO(env)

ACABOU()
```

---

# ⚙️ Como funciona (pipeline)

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
↓                  |
│ VM Stack-Based   │
└──────────────────┘
```

---

# 🔍 Etapas

---

## 1. Lexer

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

## 2. Parser Pratt

Constrói AST respeitando precedência.

Exemplo:

```xs
10 + 20 * 3
```

vira:

```text
     +
   /   \
 10     *
      /   \
    20     3
```

---

## 3. AST

Estrutura intermediária:

```js
Binary(
  "+",
  Num(10),
  Binary("*", Num(20), Num(3))
)
```

---

## 4. Optimizer

Faz otimizações simples.

### Constant Folding

```xs
10 + 20 * 3
```

vira:

```xs
70
```

---

# 🧠 Execution Engines

XanaScript possui dois motores.

---

## AST Interpreter

Executa AST diretamente.

Sem:

* eval
* Function()
* JS string

Mais seguro e mais controlável.

---

## Bytecode VM

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

## Exemplo

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

| Sintaxe            | Equivalente    |
| ------------------ | -------------- |
| `SOLTA O GRITO(x)` | `console.log`  |
| `FALA BAIXO(x)`    | `console.warn` |
| `AGORA VAI(url)`   | HTTP GET       |
| `ESPERA AI(ms)`    | sleep          |
| `SORTEIA(a,b)`     | random int     |
| `PARSEIA(str)`     | JSON.parse     |
| `OUVE AQUI(k)`     | process.env    |
| `IMPORTA(path)`    | loader `.xs`   |

---

# 🔐 Segurança

* Execução isolada
* VM sandbox
* Sem eval
* Sem acesso direto ao filesystem
* Imports controlados
* Contexto isolado
* Cache de módulos
* Runtime encapsulado

⚠️ Ainda não é sandbox perfeito.

Não execute código malicioso em produção.

---

# 🧪 Estrutura do projeto

```text
src/
  ast.js
  lexer.js
  parser.js
  optimizer.js
  interpreter.js
  compiler.js
  vm.js
  runtime.js
  cli.js

examples/
  app.xs
  utils.xs
```

---

# 🧠 AST Nodes

## Literais

```js
Num
Str
Bool
Nil
```

---

## Expressões

```js
Binary
Unary
Assign
Call
Member
```

---

## Statements

```js
VarDecl
IfStmt
ForStmt
ReturnStmt
FunctionDecl
ImportStmt
ExportStmt
```

---

# 🔮 Roadmap

## Parser / Linguagem

* arrays
* objetos
* switch
* try/catch
* classes
* enums
* pattern matching

---

## Runtime

* fs sandbox
* timers
* websockets
* fetch nativo
* scheduler

---

## VM

* registradores
* GC simples
* optimizer SSA
* JIT experimental

---

## Tooling

* LSP
* syntax highlight
* formatter
* debugger
* source maps

---

# ⚠️ Limitações

* Sem tipagem
* Sem GC próprio
* Sem closures completas
* VM ainda experimental
* Imports ainda simples
* Erros ainda crus
* Sem source maps

---

# 🤝 Contribuição

PRs são bem-vindos.

Ideias úteis:

* novos built-ins
* melhorias no parser
* otimizações
* novos opcodes
* debugger
* syntax highlight
* tooling
* macros
* stdlib

---

# 🧃 Exemplo meme total

```xs
PARTIU()

CHAMA ESSE CARA tropa(x) {

  SE LIGA SO (x > 10 && x != 20) {

    SOLTA O GRITO("ta forte")

  } SENAO {

    FALA BAIXO("ta fofo")

  }

}

CRIA n = SORTEIA(1, 100)

tropa(n)

ACABOU()
```