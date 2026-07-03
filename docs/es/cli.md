# Referencia de CLI

## Uso

```
xs <comando> [opciones] [archivo]
```

## Comandos

| Comando | Descripcion |
|---------|-------------|
| `xs run <archivo>` | Ejecutar archivo .xs (Interpretador AST) |
| `xs vm <archivo>` | Ejecutar archivo .xs (MV de Bytecode) |
| `xs check <archivo>` | Verificar sintaxis |
| `xs build <archivo>` | Generar JavaScript |
| `xs build --opt <archivo>` | Generar JavaScript optimizado |
| `xs build --wasm <archivo>` | Generar WebAssembly (.wat + .wasm) |
| `xs build --standalone <archivo>` | Generar .js unico con runtime |
| `xs test <dir>` | Ejecutar pruebas |
| `xs dev <archivo>` | Recarga automatica al modificar archivo |
| `xs fmt <archivo>` | Formatear archivo .xs |
| `xs repl` | Modo REPL interactivo |
| `xs lsp` | Iniciar Protocolo de Servidor de Lenguaje |
| `xs docs <src> <out>` | Generar documentacion HTML |
| `xs init <nombre>` | Crear nuevo proyecto |
| `xs install <pkg>` | Instalar paquete |
| `xs publish` | Publicar paquete |
| `xs bench` | Ejecutar benchmarks |

## Ejemplos

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
xs init mi-proyecto
xs install paquete
```

## LSP (Protocolo de Servidor de Lenguaje)

El servidor LSP se comunica via stdin/stdout. Proporciona:

- Autocompletado
- Informacion al pasar el raton
- Ir a definicion
- Diagnosticos (errores y advertencias)
- Ayuda de firma

Conecte su editor a `xs lsp` para soporte completo de IDE.

## Salidas de Compilacion

| Bandera | Salida | Descripcion |
|---------|--------|-------------|
| (ninguna) | stdout | JavaScript estandar |
| `--opt` | stdout | JavaScript optimizado con TypedArrays |
| `--wasm` | `.wat` + `.wasm` | WebAssembly texto + binario |
| `--standalone` | archivo `.js` | Archivo unico con runtime integrado |
