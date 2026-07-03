# Getting Started

XanaScript is a programming language with Portuguese syntax, an optimizing compiler (JavaScript + WebAssembly), built-in ORM, compile-time macros, LSP, and zero runtime dependencies.

## Installation

### Via npm (requires Node.js)

```bash
npm install -g xanascript
xs run app.xs
```

### Via installer (Windows)

Download `xs-install.exe` from [releases](https://github.com/xanascr/xs-installer/releases) and run it. It installs everything and configures PATH automatically.

### Via source

```bash
git clone https://github.com/xanascr/xs.git
cd xs
npm install
npm install -g bun
node scripts/build-all.js
./dist/xs run app.xs
```

### VS Code Extension

```bash
git clone https://github.com/xanascr/xs-vscode.git
cd xs-vscode
npm install -g vsce
vsce package
code --install-extension xanascript-*.vsix
```

## Quick Start

Create a file `hello.xs`:

```xs
PARTIU()
  SOLTA O GRITO("Hello World!")
ACABOU()
```

Run it:

```bash
xs run hello.xs
```

## LLM Documentation

XanaScript includes an `llms.txt` file with a complete reference for AI assistants. This file covers all syntax, built-in functions, CLI commands, architecture, and API details in a single document optimized for LLM context.

```bash
cat llms.txt  # Full reference for AI
```

## Next Steps

- [Syntax Reference](syntax.md)
- [CLI Reference](cli.md)
- [Standard Library](stdlib.md)
- [ORM Documentation](orm.md)
- [Examples](examples.md)
