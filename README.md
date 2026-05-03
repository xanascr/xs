# XanaScript (.xs)

Linguagem experimental com sintaxe em português que transpila para JS e executa em ambiente isolado.

---

## 🚀 Playground

[![Open Playground](https://img.shields.io/badge/Playground-Acessar-ff0077?style=for-the-badge)](https://xanascript.xyz)

## ✨ Features

* **Sintaxe em português** (frases → AST → JS)
* **Funções** (`CHAMA ESSE CARA`)
* **Retorno** (`VOLTA`)
* **Condições** (`SE LIGA SO / SENAO`)
* **Loops** (`REPETE NA MORAL`)
* **Módulos `.xs`** com `IMPORTA` e `EXPORTA`
* **Async real** (`AGORA VAI`, `ESPERA AI`)
* **HTTP** via `axios` encapsulado
* **Built-ins úteis**: `SORTEIA`, `PARSEIA`, `OUVE AQUI`
* **Execução isolada** com `vm`

---

## 📦 Instalação

```bash
git clone https://github.com/seu-user/XanaScript.git
cd XanaScript
npm install
```

> Requer Node 18+

---

## ▶️ Uso

```bash
node src/cli.js run examples/app.xs
```

CLI:

```
npm link
xs run <arquivo.xs>
```

---

## 🧠 Sintaxe básica

### Programa

```xs
PARTIU()

// código

ACABOU()
```

Módulos `.xs` **não precisam** de `PARTIU/ACABOU`.

---

## 🧩 Variáveis

```xs
CRIA x = 10
CRIA nome = "joao"
```

---

## 🔁 Condicional

```xs
SE LIGA SO (x > 10) {
  SOLTA O GRITO("maior")
} SENAO {
  SOLTA O GRITO("menor")
}
```

---

## 🔄 Loop

```xs
REPETE NA MORAL (CRIA i = 0; i < 5; i = i + 1) {
  SOLTA O GRITO(i)
}
```

---

## 🧪 Funções

```xs
CHAMA ESSE CARA soma(a, b) {
  VOLTA a + b
}

CRIA r = soma(2, 3)
SOLTA O GRITO(r)
```

---

## 📦 Módulos (.xs)

### Export

```xs
CHAMA ESSE CARA soma(a, b) {
  VOLTA a + b
}

EXPORTA soma
```

---

### Import (retorna objeto)

```xs
CRIA mod = IMPORTA "./utils.xs"

CRIA r = mod.soma(2, 3)
```

---

### Import direto (destructuring)

```xs
CRIA { soma } = IMPORTA "./utils.xs"

CRIA r = soma(2, 3)
```

---

## ⚡ Async / Await

### HTTP

```xs
CRIA data = AGORA VAI("https://jsonplaceholder.typicode.com/todos/1")

SOLTA O GRITO(data)
```

> `AGORA VAI` retorna **já o `.data`**

---

### Sleep

```xs
SOLTA O GRITO("esperando...")
ESPERA AI(1000)
SOLTA O GRITO("foi")
```

---

## 🎲 Aleatório

```xs
CRIA n = SORTEIA(1, 100)
SOLTA O GRITO(n)
```

> Intervalo inclusivo `[min, max]`

---

## 🧾 JSON

```xs
CRIA obj = PARSEIA('{"a":1}')
SOLTA O GRITO(obj.a)
```

---

## 🌱 Env

```xs
CRIA home = OUVE AQUI("HOME")
SOLTA O GRITO(home)
```

> Retorna `null` se não existir

---

## 🗣️ Logs

```xs
SOLTA O GRITO("log")   // console.log
FALA BAIXO("warn")     // console.warn
```

---

## 🧱 Exemplo completo

```xs
PARTIU()

CRIA { soma } = IMPORTA "./utils.xs"

CRIA r = soma(5, 7)
SOLTA O GRITO(r)

CRIA n = SORTEIA(1, 10)
SOLTA O GRITO(n)

CRIA json = PARSEIA('{"ok":true}')
SOLTA O GRITO(json.ok)

CRIA data = AGORA VAI("https://jsonplaceholder.typicode.com/todos/1")
SOLTA O GRITO(data)

ESPERA AI(500)

CRIA env = OUVE AQUI("HOME")
SOLTA O GRITO(env)

ACABOU()
```

---

## ⚙️ Como funciona (pipeline)

```
.xs → lexer → parser → AST → codegen → JS → vm runtime
```

### Etapas

1. **Lexer**: transforma texto em tokens
2. **Parser**: gera AST
3. **Codegen**: converte AST → JS
4. **Runtime**:

   * executa em `vm`
   * resolve `IMPORTA`
   * injeta helpers (`__http`, `__sleep`, etc.)

---

## 🔐 Segurança

* Execução isolada via `vm`
* Imports Node limitados (`ALLOWED`)
* Sem acesso direto ao filesystem no `.xs`

⚠️ Ainda **não é sandbox perfeito**. Não execute código não confiável em produção.

---

## 🧪 Estrutura do projeto

```
src/
  ast.js
  lexer.js
  parser.js
  codegen.js
  runtime.js
  cli.js

examples/
  app.xs
  utils.xs
```

---

## 🧩 Built-ins (resumo)

| Sintaxe            | Equivalente       |
| ------------------ | ----------------- |
| `SOLTA O GRITO(x)` | `console.log`     |
| `FALA BAIXO(x)`    | `console.warn`    |
| `AGORA VAI(url)`   | `await axios.get` |
| `ESPERA AI(ms)`    | `await sleep`     |
| `SORTEIA(a,b)`     | random int        |
| `PARSEIA(str)`     | `JSON.parse`      |
| `OUVE AQUI(k)`     | `process.env[k]`  |
| `IMPORTA(path)`    | loader `.xs`      |

---


## 🧠 Filosofia

XanaScript é:

* **didático** (compiladores na prática)
* **experimental**
* **não sério (aindaKKKKKKKKKKK)**

Mas com arquitetura suficiente pra evoluir.

---

## ⚠️ Limitações

* Sem tipagem
* Sem escopo de módulo isolado completo (ainda)
* Sem otimização de codegen
* Erros ainda crus (sem stack amigável)

---

## 🤝 Contribuição

PRs são bem-vindos.

Sugestões úteis:

* novos built-ins
* melhorias no parser
* erros mais claros
* features de linguagem
