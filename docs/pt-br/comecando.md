# Primeiros Passos

XanaScript e uma linguagem de programacao com sintaxe em portugues, compilador otimizador (JavaScript + WebAssembly), ORM embutido, macros em tempo de compilacao, LSP e zero dependencias em tempo de execucao.

## Instalacao

### Via npm (requer Node.js)

```bash
npm install -g xanascript
xs run app.xs
```

### Via instalador (Windows)

Baixe o `xs-install.exe` em [releases](https://github.com/xanascr/xs-installer/releases) e execute-o. Ele instala tudo e configura o PATH automaticamente.

### Via codigo-fonte

```bash
git clone https://github.com/xanascr/xs.git
cd xs
npm install
npm install -g bun
node scripts/build-all.js
./dist/xs run app.xs
```

### Extensao VS Code

```bash
git clone https://github.com/xanascr/xs-vscode.git
cd xs-vscode
npm install -g vsce
vsce package
code --install-extension xanascript-*.vsix
```

## Inicio Rapido

Crie um arquivo `hello.xs`:

```xs
PARTIU()
  SOLTA O GRITO("Hello World!")
ACABOU()
```

Execute:

```bash
xs run hello.xs
```

## Documentacao para IA

O XanaScript inclui um arquivo `llms.txt` com uma referencia completa para assistentes de IA. Este arquivo cobre toda a sintaxe, funcoes nativas, comandos CLI, arquitetura e detalhes da API em um unico documento otimizado para contexto de LLM.

```bash
cat llms.txt  # Referencia completa para IA
```

## Proximos Passos

- [Referencia de Sintaxe](sintaxe.md)
- [Referencia da CLI](cli.md)
- [Biblioteca Padrao](biblioteca-padrao.md)
- [Documentacao do ORM](orm.md)
- [Exemplos](exemplos.md)
