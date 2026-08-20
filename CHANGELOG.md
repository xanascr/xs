# Changelog

Todas as mudanças notáveis do XanaScript.

O formato segue [Keep a Changelog](https://keepachangelog.com/), e o versionamento segue [SemVer](https://semver.org/).

## [3.1.0] - 2026-08-20

### Novas features

- **Globals JS no runtime**: `Object`, `Array`, `JSON`, `Math`, `Number`, `String`, `Boolean`, `Date`, `Buffer`, `Uint8Array`, `Int8Array`, `Int16Array`, `Int32Array`, `Uint16Array`, `Uint32Array`, `Float32Array`, `Float64Array`, `ArrayBuffer`, `DataView`, `RegExp`, `Error`, `TypeError`, `parseInt`, `parseFloat`, `isNaN`, `isFinite`, `decodeURIComponent`, `encodeURIComponent` disponíveis como identificadores.
- **Novos helpers de tipo**: `typeof(x)`, `eh-numero(x)`, `eh-palavra(x)`, `eh-booleano(x)`, `eh-objeto(x)`, `eh-array(x)`, `eh-nulo(x)`.
- **Escapes em strings**: `\n`, `\t`, `\r`, `\"`, `\'`, `\\`, `\b`, `\f`, `\0` agora são interpretados em literais de string.
- **Shorthand em objetos**: `{ nome, idade }` cria `{ nome: nome, idade: idade }`.

### Correções

- **Igualdade `==`/`!=`**: agora seguem a semântica de coerção do JavaScript (`undefined == nulo` é `verdadeiro`), mantendo `===`/`!==` estritos.
- **Instalação de pacotes**: runtime agora resolve módulos a partir do cache `~/.xs/packages/<mod>` quando não há `node_modules` local.
- **Publicação**: tarball agora inclui `src/index.xs` na raiz do pacote (usando a raiz do pacote como base), com separadores `/` cross-platform e checksum tar correto (campo preenchido com 8 espaços antes de somar).
- **Login**: envio de `email` no corpo do login do registry.

## [3.0.1] - 2026-08-17

### Correções

- **Formatter (`xana fmt`)**: consertado o `formatAST` que aplicava indentação em nós de expressão aninhados (init, test, args), gerando espaços duplicados e quebrando o código formatado.
- **Formatter**: adicionado suporte a `UpdateExpr` (`i++` / `++i`) em loops `repete-na-moral`.
- **Formatter**: binários agora respeitam precedência de operadores, sem parênteses redundantes.
- **Módulos locais**: corrigidos os caminhos de importação de módulos locais.
- **Servidor HTTP**: corrigido o exemplo de desligamento do servidor (`terminamos!(srv)`).
- **CLI**: corrigida a ordem de inicialização das constantes usadas pelo handler de `fmt` (erro de TDZ na carga do módulo).

## [3.0.0] - 2026-08-17

### Destaques

- **Type checker (`xana check` / `verifica`)**: inferência estática de tipos com suporte a builtins, genéricos `sus<T>`, consts por escopo e métodos de classe.
- **Debug Adapter Protocol (`xana debuga`)**: depuração com breakpoints, step, inspeção de variáveis e call stack.
- **Test runner**: comando `xana test --watch` (`teste --olha`) e novos helpers de teste.
- **WebAssembly**: geração de binários Wasm mais robusta (fix de locals/params, `main` de usuário, `**` via `pow`, atualização de globals) com fallback para WAT.
- **ORM**: validação de campos (`vdd?`, `data`), proteção de `id` e `criadoEm`, e deep copies nas leituras.
- **Docs unificadas**: documentação consolidada em `docs/` (en), removidos os arquivos duplicados por idioma.

### Novas features

- Palavras-chave de tipo: `tipo-de`, `instancia-de`, `vdd?`.
- Arrow functions assíncronas (`assincrono (x) => ...`).
- `date` fora do testrunner (disponível no runtime geral).
- `escuta` agora trata erro `EADDRINUSE`.
- `fofoca` não polui mais `Object.prototype`.
- Macros com guard de recursão no optimizer.
- Constant folding type-safe no optimizer.

### Melhorias

- Parser: erro de sintaxe claro para declaração de membro sem inicialização.
- CLI: alias `xana`, comando `verifica`/`check`, e `crush(...)` para testes.
- 122 testes passando no suite principal.
- Prettier como devDependency para formatação do código-fonte.

### Correções

- Diversas correções no bytecode VM e compilador.
- Correções na geração Wasm (validação de builtins + fallback WAT).

## [2.2.8] - 2026-07

### Novas features

- **Auto-instalação de dependências**: `xana install` baixa pacotes do registry.
- **Bun binary path**: correção do caminho do binário.

### Correções

- Auditoria de segurança: todas as vulnerabilidades mitigadas.
- Pacotes resolvidos a partir do cache `~/.xs/packages/`.

## [2.2.x] - 2026-06/07

### Novas features

- Operadores bitwise (`|`, `&`, `^`, `~`, `<<`, `>>`) + biblioteca nativa Base64.
- Comando `-v` / `--version` / `version` na CLI.
- Executar `.xs` diretamente sem subcomando (`xana arquivo.xs`).

### Correções

- Interpreter: binding de `this` em chamadas de método, ordem de resolução de builtins, `String` no runtime.
- Codegen: builtins que faltavam.

---

Histórico completo disponível via `git log`.