# Referencia da CLI

## Uso

```
xs <comando> [opcoes] [arquivo]
```

## Comandos

| Comando | Descricao |
|---------|-----------|
| `xs run <arquivo>` | Executar arquivo .xs (Interpretador AST) |
| `xs vm <arquivo>` | Executar arquivo .xs (VM de Bytecode) |
| `xs check <arquivo>` | Verificar sintaxe |
| `xs build <arquivo>` | Gerar JavaScript |
| `xs build --opt <arquivo>` | Gerar JavaScript otimizado |
| `xs build --wasm <arquivo>` | Gerar WebAssembly (.wat + .wasm) |
| `xs build --standalone <arquivo>` | Gerar .js unico com runtime |
| `xs test <dir>` | Executar testes |
| `xs dev <arquivo>` | Recarregamento automatico ao alterar arquivo |
| `xs fmt <arquivo>` | Formatador de arquivo .xs |
| `xs repl` | Modo REPL interativo |
| `xs lsp` | Iniciar Protocolo de Servidor de Linguagem |
| `xs docs <src> <out>` | Gerar documentacao HTML |
| `xs init <nome>` | Criar novo projeto |
| `xs install <pkg>` | Instalar pacote |
| `xs publish` | Publicar pacote |
| `xs bench` | Executar benchmarks |

## Exemplos

```bash
xs run app.xs
xs check app.xs
xs build app.xs
xs build --opt app.xs -o output.js
xs build --wasm app.xs
xs build --standalone app.xs
xs test .
xs dev app.xs
xs fmt app.xs
xs init meu-projeto
xs install pacote
```

## LSP (Protocolo de Servidor de Linguagem)

O servidor LSP se comunica via stdin/stdout. Ele oferece:

- Autocompletar
- Informacoes ao passar o mouse
- Ir para definicao
- Diagnostico (erros e avisos)
- Ajuda deassinatura

Conecte seu editor a `xs lsp` para suporte completo de IDE.

## Saidas de Compilacao

| Bandeira | Saida | Descricao |
|----------|-------|-----------|
| (nenhuma) | stdout | JavaScript padrao |
| `--opt` | stdout | JavaScript otimizado com TypedArrays |
| `--wasm` | `.wat` + `.wasm` | WebAssembly texto + binario |
| `--standalone` | arquivo `.js` | Arquivo unico com runtime embutido |
