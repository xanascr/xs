// =====================================================================
// Teste Completo da Linguagem XanaScript
// =====================================================================
// Execute com: node src/cli.js test_completo.xs
// Ou via test runner: node -e "import('./src/testrunner.js').then(r => r.runTests('.'))"

// ---------------------------------------------------------------------
// Funcoes auxiliares para operadores logicos (E / OU / NAO)
// ---------------------------------------------------------------------
resolve E(a, b) {
  volta a && b
}

resolve OU(a, b) {
  volta a || b
}

resolve NAO(a) {
  volta !a
}

// =====================================================================
// 1. VARIAVEIS E TIPOS BASICOS
// =====================================================================

crush "Variaveis - declaracao com cria" {
  cria x = 10
  cria nome = "XanaScript"
  cria ativo = verdadeiro
  cria vazio = nulo
  cria negativo = -5
  cria zero = 0

  date(x, 10)
  date(nome, "XanaScript")
  date(ativo, verdadeiro)
  date(vazio, nulo)
  date(negativo, -5)
  date(zero, 0)
}

crush "Variaveis - reatribuicao" {
  cria a = 1
  cria a = a + 1
  date(a, 2)
  cria a = a * 3
  date(a, 6)
}

crush "Variaveis - tipos especiais" {
  cria v1 = nulo
  deu-match(v1 == nulo)
  cria v2 = verdadeiro
  deu-match(v2)
  cria v3 = falso
  deu-match(!v3)
  cria v4 = "texto vazio"
  date(v4, "texto vazio")
}

// =====================================================================
// 2. OPERACOES ARITMETICAS
// =====================================================================

crush "Aritmetica - operadores basicos" {
  cria s = 10 + 5
  cria sub = 10 - 5
  cria m = 3 * 4
  cria d = 10 / 2
  cria mod = 10 % 3

  date(s, 15)
  date(sub, 5)
  date(m, 12)
  date(d, 5)
  date(mod, 1)
}

crush "Aritmetica - precedencia" {
  cria r1 = 1 + 2 * 3
  cria r2 = (1 + 2) * 3
  cria r3 = 10 - 2 * 3 + 1
  cria r4 = 100 / 10 / 2

  date(r1, 7)
  date(r2, 9)
  date(r3, 5)
  date(r4, 5)
}

crush "Aritmetica - numeros negativos" {
  cria a = -10 + 5
  cria b = -3 * -4
  cria c = 10 - -3
  cria d = -(5 + 3)

  date(a, -5)
  date(b, 12)
  date(c, 13)
  date(d, -8)
}

crush "Aritmetica - zero e divisao" {
  cria a = 0 + 0
  cria b = 0 * 5
  cria c = 10 / 0
  cria d = 0 / 10
  cria e = 5 % 1

  date(a, 0)
  date(b, 0)
  deu-match(c == 1/0)
  date(d, 0)
  date(e, 0)
}

crush "Aritmetica - operacoes com numeros grandes" {
  cria a = 1000 * 1000
  cria b = 1000000 / 1000
  cria c = 999999 + 1
  cria d = 0 - 100000

  date(a, 1000000)
  date(b, 1000)
  date(c, 1000000)
  date(d, -100000)
}

// =====================================================================
// 3. OPERADORES DE COMPARACAO
// =====================================================================

crush "Comparacao - todos os operadores" {
  deu-match(10 == 10)
  deu-match(!(10 == 5))
  deu-match(10 != 5)
  deu-match(!(10 != 10))
  deu-match(10 > 5)
  deu-match(!(5 > 10))
  deu-match(5 < 10)
  deu-match(!(10 < 5))
  deu-match(10 >= 10)
  deu-match(10 >= 5)
  deu-match(!(5 >= 10))
  deu-match(5 <= 10)
  deu-match(5 <= 5)
  deu-match(!(10 <= 5))
}

crush "Comparacao - valores especiais" {
  deu-match(0 == 0)
  deu-match(-1 < 0)
  deu-match(-5 >= -5)
  deu-match(0 >= -1)
  deu-match(!(nulo == verdadeiro))
  deu-match(nulo != verdadeiro)
  deu-match(!(falso == verdadeiro))
}

crush "Comparacao - strings" {
  deu-match("a" == "a")
  deu-match("abc" != "xyz")
  deu-match(!("abc" == "ABC"))
}

// =====================================================================
// 4. OPERADORES LOGICOS
// =====================================================================

crush "Logico - nativos && || !" {
  deu-match(verdadeiro && verdadeiro)
  deu-match(!(verdadeiro && falso))
  deu-match((falso && verdadeiro) == falso)
  deu-match(verdadeiro || falso)
  deu-match(falso || verdadeiro)
  deu-match(!(falso || falso))
  deu-match(!verdadeiro == falso)
  deu-match(!falso == verdadeiro)
  deu-match(!!verdadeiro)
  deu-match(!(!verdadeiro))
}

crush "Logico - funcoes wrapper E / OU / NAO" {
  deu-match(E(verdadeiro, verdadeiro))
  deu-match(!E(verdadeiro, falso))
  deu-match(!E(falso, falso))
  deu-match(OU(verdadeiro, falso))
  deu-match(OU(verdadeiro, verdadeiro))
  deu-match(!OU(falso, falso))
  deu-match(NAO(falso))
  deu-match(!NAO(verdadeiro))
}

crush "Logico - curto-circuito" {
  cria x = 1

  cria y = falso && E({}, x = 99)
  date(x, 1)
  date(y, falso)

  cria z = verdadeiro || (x = 42)
  date(z, verdadeiro)
  date(x, 1)
}

// =====================================================================
// 5. IF / ELSE
// =====================================================================

crush "se-pah/ai - verdadeiro e falso" {
  cria r1 = ""
  se-pah (verdadeiro) {
    r1 = "sim"
  } ai {
    r1 = "nao"
  }
  date(r1, "sim")

  cria r2 = ""
  se-pah (falso) {
    r2 = "sim"
  } ai {
    r2 = "nao"
  }
  date(r2, "nao")
}

crush "se-pah/ai - sem ai" {
  cria r = "padrao"
  se-pah (falso) {
    r = "mudou"
  }
  date(r, "padrao")

  se-pah (verdadeiro) {
    r = "mudou"
  }
  date(r, "mudou")
}

crush "se-pah/ai - aninhado (else if)" {
  resolve classificar(x) {
    se-pah (x > 10) {
      volta "maior"
    } ai se-pah (x > 0) {
      volta "positivo"
    } ai se-pah (x == 0) {
      volta "zero"
    } ai {
      volta "negativo"
    }
  }

  date(classificar(15), "maior")
  date(classificar(5), "positivo")
  date(classificar(0), "zero")
  date(classificar(-3), "negativo")
}

crush "se-pah/ai - condicoes complexas" {
  cria a = 5
  cria b = 10
  cria c = 0

  se-pah (a > 0 && b > 0 && c == 0) {
    date(a + b, 15)
  } ai {
    deu-match(falso)
  }

  se-pah (a > 10 || b == 10) {
    deu-match(verdadeiro)
  } ai {
    deu-match(falso)
  }
}

// =====================================================================
// 6. LOOP FOR
// =====================================================================

crush "repete-na-moral - contagem crescente" {
  cria soma = 0
  repete-na-moral (cria i = 0; i < 5; i++) {
    soma = soma + i
  }
  date(soma, 10)
}

crush "repete-na-moral - com mete-o-pe (break)" {
  cria soma = 0
  repete-na-moral (cria i = 0; i < 10; i++) {
    se-pah (i == 5) {
      mete-o-pe()
    }
    soma = soma + i
  }
  date(soma, 10)
}

crush "repete-na-moral - com segue-o-baile" {
  cria soma = 0
  repete-na-moral (cria i = 0; i < 10; i++) {
    se-pah (i % 2 == 0) {
      segue-o-baile()
    }
    soma = soma + i
  }
  date(soma, 25)
}

crush "repete-na-moral - decremento" {
  cria soma = 0
  repete-na-moral (cria i = 5; i > 0; i--) {
    soma = soma + i
  }
  date(soma, 15)
}

crush "repete-na-moral - sem init" {
  cria i = 0
  cria soma = 0
  repete-na-moral (; i < 5; i++) {
    soma = soma + i
  }
  date(soma, 10)
}

crush "repete-na-moral - loop vazio (zero iteracoes)" {
  cria soma = 0
  repete-na-moral (cria i = 0; i < 0; i++) {
    soma = 99
  }
  date(soma, 0)
}

// =====================================================================
// 7. LOOP WHILE
// =====================================================================

crush "repete-enquanto - contagem" {
  cria i = 0
  cria soma = 0
  repete-enquanto (i < 5) {
    soma = soma + i
    i = i + 1
  }
  date(soma, 10)
}

crush "repete-enquanto - com break" {
  cria i = 0
  cria soma = 0
  repete-enquanto (verdadeiro) {
    se-pah (i >= 5) {
      mete-o-pe()
    }
    soma = soma + i
    i = i + 1
  }
  date(soma, 10)
}

crush "repete-enquanto - condicao inicial falsa" {
  cria x = 1
  repete-enquanto (falso) {
    x = 99
  }
  date(x, 1)
}

// =====================================================================
// 8. FUNCOES
// =====================================================================

crush "resolve - declaracao e chamada" {
  resolve soma(a, b) {
    volta a + b
  }

  date(soma(3, 4), 7)
  date(soma(0, 0), 0)
  date(soma(-5, 10), 5)
}

crush "resolve - sem parametros" {
  resolve constante() {
    volta 42
  }

  date(constante(), 42)
}

crush "resolve - sem volta" {
  resolve nada() {
  }

  cria r = nada()
  deu-match(r == nulo || !r)
}

crush "resolve - escopo" {
  cria x = 10

  resolve teste() {
    cria x = 20
    volta x
  }

  date(x, 10)
  date(teste(), 20)
  date(x, 10)
}

crush "resolve - recursao (fatorial)" {
  resolve fatorial(n) {
    se-pah (n <= 1) {
      volta 1
    }
    volta n * fatorial(n - 1)
  }

  date(fatorial(0), 1)
  date(fatorial(1), 1)
  date(fatorial(5), 120)
  date(fatorial(10), 3628800)
}

crush "resolve - recursao (fibonacci)" {
  resolve fib(n) {
    se-pah (n <= 1) {
      volta n
    }
    volta fib(n - 1) + fib(n - 2)
  }

  date(fib(0), 0)
  date(fib(1), 1)
  date(fib(10), 55)
}

crush "resolve - multiplos parametros" {
  resolve mult(a, b, c) {
    volta a * b * c
  }

  date(mult(2, 3, 4), 24)
  date(mult(1, 1, 1), 1)
  date(mult(0, 100, 100), 0)
}

crush "resolve - funcao como valor" {
  resolve criaMultiplicador(fator) {
    resolve mult(n) {
      volta n * fator
    }
    volta mult
  }

  cria dobro = criaMultiplicador(2)
  cria triplo = criaMultiplicador(3)

  date(dobro(5), 10)
  date(triplo(5), 15)
}

// =====================================================================
// 9. ATRIBUICAO COMPOSTA (+=, -=, *=, /=, %=)
// =====================================================================

crush "Atribuicao composta - todos os operadores" {
  cria a = 10
  a += 5
  date(a, 15)

  cria b = 10
  b -= 3
  date(b, 7)

  cria c = 5
  c *= 4
  date(c, 20)

  cria d = 20
  d /= 4
  date(d, 5)

  cria e = 10
  e %= 3
  date(e, 1)
}

crush "Atribuicao composta - com zero" {
  cria a = 0
  a += 5
  date(a, 5)

  cria b = 10
  b *= 0
  date(b, 0)

  cria c = 10
  c /= 2
  date(c, 5)
}

// =====================================================================
// 10. INCREMENTO/DECREMENTO POSTFIX (++, --)
// =====================================================================

crush "Postfix ++ e --" {
  cria a = 5
  cria b = a++
  date(b, 5)
  date(a, 6)

  cria c = 10
  cria d = c--
  date(d, 10)
  date(c, 9)
}

crush "Postfix - em loops" {
  cria soma = 0
  cria i = 0
  repete-enquanto (i < 5) {
    soma = soma + i
    i++
  }
  date(soma, 10)
  date(i, 5)

  cria j = 5
  cria total = 0
  repete-enquanto (j > 0) {
    j--
    total = total + j
  }
  date(total, 10)
  date(j, 0)
}

// =====================================================================
// 11. ARRAYS
// =====================================================================

crush "Arrays - literal e acesso por indice" {
  cria arr = [10, 20, 30]
  date(arr[0], 10)
  date(arr[1], 20)
  date(arr[2], 30)
}

crush "Arrays - modificacao de elementos" {
  cria arr = [1, 2, 3]
  arr[0] = 99
  date(arr[0], 99)
  date(arr[1], 2)
  arr[1] += 8
  date(arr[1], 10)
}

crush "Arrays - vazio" {
  cria vazio = []
  date(vazio.length, 0)
}

crush "Arrays - aninhados" {
  cria mat = [[1, 2], [3, 4], [5, 6]]
  date(mat[0][0], 1)
  date(mat[0][1], 2)
  date(mat[1][0], 3)
  date(mat[2][1], 6)
  date(mat.length, 3)
}

crush "Arrays - tipos mistos" {
  cria misto = [1, "dois", verdadeiro, nulo, [0]]
  date(misto[0], 1)
  date(misto[1], "dois")
  date(misto[2], verdadeiro)
  date(misto[3], nulo)
  date(misto[4][0], 0)
}

crush "Arrays - iteracao com for" {
  cria arr = [2, 4, 6, 8]
  cria soma = 0
  repete-na-moral (cria i = 0; i < arr.length; i++) {
    soma = soma + arr[i]
  }
  date(soma, 20)
}

// =====================================================================
// 12. OBJETOS
// =====================================================================

crush "Objetos - literal e acesso a propriedades" {
  cria obj = {a: 1, b: 2, c: 3}
  date(obj.a, 1)
  date(obj.b, 2)
  date(obj.c, 3)
}

crush "Objetos - tipos variados" {
  cria obj = {
    nome: "Xana",
    idade: 42,
    ativo: verdadeiro,
    vazio: nulo
  }
  date(obj.nome, "Xana")
  date(obj.idade, 42)
  date(obj.ativo, verdadeiro)
  date(obj.vazio, nulo)
}

crush "Objetos - aninhados" {
  cria obj = {
    endereco: {
      rua: "Rua A",
      numero: 123
    },
    contato: {
      email: "teste@teste.com"
    }
  }
  date(obj.endereco.rua, "Rua A")
  date(obj.endereco.numero, 123)
  date(obj.contato.email, "teste@teste.com")
}

crush "Objetos - modificacao" {
  cria obj = {x: 1, y: 2}
  obj.x = 99
  obj.z = 3
  date(obj.x, 99)
  date(obj.y, 2)
  date(obj.z, 3)
}

crush "Objetos - acesso com indice string" {
  cria obj = {nome: "XanaScript", versao: 1}
  cria chave = "nome"
  date(obj[chave], "XanaScript")
  obj["versao"] = 2
  date(obj.versao, 2)
}

// =====================================================================
// 13. OPERADOR TERNARIO
// =====================================================================

crush "Ternario - condicoes" {
  cria r1 = verdadeiro ? "sim" : "nao"
  cria r2 = falso ? "sim" : "nao"

  date(r1, "sim")
  date(r2, "nao")
}

crush "Ternario - aninhado" {
  resolve sinal(n) {
    volta n > 0 ? "positivo" : (n < 0 ? "negativo" : "zero")
  }

  date(sinal(5), "positivo")
  date(sinal(-3), "negativo")
  date(sinal(0), "zero")
}

crush "Ternario - com expressoes" {
  cria a = 10
  cria b = 5
  cria r = a > b ? a - b : b - a
  date(r, 5)

  cria x = 3
  cria y = 7
  cria s = x > y ? x : y
  date(s, 7)
}

// =====================================================================
// 14. CONCATENACAO DE STRINGS
// =====================================================================

crush "Concatenacao - strings" {
  cria s = "ola" + " " + "mundo"
  date(s, "ola mundo")
}

crush "Concatenacao - string com numero" {
  cria s = "valor: " + 42
  date(s, "valor: 42")
}

crush "Concatenacao - multiplas" {
  cria a = "a"
  cria b = "b"
  cria c = "c"
  cria r = a + "-" + b + "-" + c
  date(r, "a-b-c")
}

// =====================================================================
// 15. NULO E BOOLEANOS
// =====================================================================

crush "NULO - comparacoes" {
  deu-match(nulo == nulo)
  deu-match(!(nulo == verdadeiro))
  deu-match(!(nulo == falso))
  deu-match(nulo != verdadeiro)
  deu-match(nulo != 0)
  deu-match(nulo != "")
}

crush "Booleanos - verdadeiro e falso" {
  deu-match(verdadeiro)
  deu-match(!falso)
  deu-match(verdadeiro != falso)
  deu-match(verdadeiro == verdadeiro)
  deu-match(falso == falso)
  deu-match(!(verdadeiro == falso))
}

crush "Booleanos - em condicoes" {
  se-pah (verdadeiro) {
    deu-match(verdadeiro)
  }

  se-pah (falso) {
    deu-match(falso)
  } ai {
    deu-match(verdadeiro)
  }

  cria r = verdadeiro ? "ok" : "fail"
  date(r, "ok")
}

// =====================================================================
// 16. MEMBER ACCESS E INDEX EXPR
// =====================================================================

crush "Member access - notacao de ponto" {
  cria obj = {nome: "Xana", versao: 15, tags: ["br", "pt"]}
  date(obj.nome, "Xana")
  date(obj.versao, 15)
  date(obj.tags.length, 2)
  date(obj.tags[0], "br")
}

crush "Index access - colchetes" {
  cria arr = [10, 20, 30, 40]
  date(arr[0], 10)
  date(arr[3], 40)

  cria i = 2
  date(arr[i], 30)
  date(arr[i + 1], 40)

  cria obj = {chave: "valor"}
  cria k = "chave"
  date(obj[k], "valor")
}

crush "Index access - modificacao via colchetes" {
  cria arr = [1, 2, 3]
  arr[1] = 99
  date(arr[1], 99)

  cria obj = {a: 1}
  obj["a"] = 42
  date(obj.a, 42)
}

// =====================================================================
// 17. TRY / CATCH / FINALLY
// =====================================================================

crush "tenta/fodeu - captura erro de variavel indefinida" {
  cria estado = {capturou: falso, msg: ""}

  tenta {
    cria x = variavelInexistente
  } fodeu(e) {
    estado.capturou = verdadeiro
    estado.msg = e.message
  }

  deu-match(estado.capturou)
  deu-match(estado.msg != nulo && estado.msg != "")
}

crush "tenta/fodeu - sem erro (nao captura)" {
  cria estado = {capturou: falso}

  tenta {
    cria x = 42
  } fodeu(e) {
    estado.capturou = verdadeiro
  }

  deu-match(!estado.capturou)
}

crush "tenta/fodeu - erro em expressao" {
  cria estado = {erro: nulo}

  tenta {
    cria arr = [1, 2, 3]
    cria fn = arr
    fn()
  } fodeu(e) {
    estado.erro = e
  }

  deu-match(estado.erro != nulo)
}

crush "tenta/fodeu/no-fim - finally roda" {
  cria estado = {finallyRodou: falso}

  tenta {
    cria x = 42
  } fodeu(e) {
    deu-match(falso)
  } no-fim {
    estado.finallyRodou = verdadeiro
  }

  deu-match(estado.finallyRodou)
}

crush "tenta/no-fim - only finally" {
  cria estado = {finallyRodou: falso}

  tenta {
    cria x = 1 + 1
  } no-fim {
    estado.finallyRodou = verdadeiro
  }

  deu-match(estado.finallyRodou)
}

// =====================================================================
// 18. CLASSE E HERANCA
// =====================================================================

crush "classe - spawna e propriedades" {
  classe Animal {
    spawna() {
      esse-cara.nome = "Rex"
    }
    metodo falar() {
      volta "Au au"
    }
  }

  cria a = novo Animal
  date(a.nome, "Rex")
  date(a.falar(), "Au au")
}

crush "classe - novo com argumentos" {
  classe Animal {
    spawna(nome) {
      esse-cara.nome = nome
    }
    metodo falar() {
      volta "Au au " + esse-cara.nome
    }
  }

  cria a = novo Animal("Bidu")
  date(a.nome, "Bidu")
  date(a.falar(), "Au au Bidu")
}

crush "classe - heranca com herda" {
  classe Animal {
    spawna() {
      esse-cara.tipo = "Animal"
    }
    metodo falar() {
      volta "Som generico"
    }
  }

  classe Cachorro herda Animal {
    spawna() {
      esse-cara.tipo = "Cachorro"
    }
    metodo falar() {
      volta "Au au"
    }
    metodo abanarRabo() {
      volta "Abanando o rabo"
    }
  }

  cria rex = novo Cachorro
  date(rex.falar(), "Au au")
  date(rex.abanarRabo(), "Abanando o rabo")
  date(rex.tipo, "Cachorro")

  cria gen = novo Animal
  date(gen.falar(), "Som generico")
  date(gen.tipo, "Animal")
}

crush "classe - metodo com parametros" {
  classe Calculadora {
    spawna() {
      esse-cara.memoria = 0
    }
    metodo somar(a, b) {
      cria r = a + b
      volta r
    }
    metodo getDescricao() {
      volta "Calculadora v1.0"
    }
  }

  cria calc = novo Calculadora
  date(calc.somar(3, 4), 7)
  date(calc.getDescricao(), "Calculadora v1.0")
  date(calc.somar(10, 20), 30)
  date(calc.memoria, 0)
}

crush "classe - multiplas instancias" {
  classe Contador {
    spawna() {
      esse-cara.valor = 10
    }
    metodo getDescricao() {
      volta "Contador"
    }
  }

  cria c1 = novo Contador
  cria c2 = novo Contador

  date(c1.valor, 10)
  date(c2.valor, 10)
  date(c1.getDescricao(), "Contador")
  date(c2.getDescricao(), "Contador")
}

// =====================================================================
// 19. FUNCOES EMBUTIDAS (BUILT-INS)
// =====================================================================

crush "escolhe - gera numeros no intervalo" {
  repete-na-moral (cria i = 0; i < 50; i++) {
    cria n = escolhe(1, 10)
    deu-match(n >= 1 && n <= 10)

    cria m = escolhe(-5, 5)
    deu-match(m >= -5 && m <= 5)
  }
}

crush "escolhe - valores iguais (sem variacao)" {
  cria n = escolhe(42, 42)
  date(n, 42)
}

crush "desembola - JSON valido" {
  cria obj = desembola('{"nome":"Xana","idade":30}')
  date(obj.nome, "Xana")
  date(obj.idade, 30)
}

crush "desembola - JSON array" {
  cria arr = desembola('[1,2,3]')
  date(arr[0], 1)
  date(arr[1], 2)
  date(arr[2], 3)
  date(arr.length, 3)
}

crush "tamanho - length de strings e arrays" {
  date(tamanho("Xana"), 4)
  date(tamanho([1, 2, 3]), 3)
}

crush "divide-texto - split" {
  cria partes = divide-texto("a,b,c", ",")
  date(partes[0], "a")
  date(partes[1], "b")
  date(partes[2], "c")
}

crush "juntar - join" {
  cria s = juntar(["a", "b", "c"], "-")
  date(s, "a-b-c")
}

crush "traduz-ai - converter para string" {
  date(traduz-ai(42), "42")
  date(traduz-ai(verdadeiro), "true")
}

// =====================================================================
// 20. ve-se (PATTERN MATCHING)
// =====================================================================

crush "ve-se - pattern literal com numeros" {
  cria estado = {resultado: ""}

  ve-se (1) {
    bateu-com 1: estado.resultado = "um"
    bateu-com 2: estado.resultado = "dois"
    qualquer-coisa: estado.resultado = "outro"
  }
  date(estado.resultado, "um")

  ve-se (3) {
    bateu-com 1: estado.resultado = "um"
    bateu-com 2: estado.resultado = "dois"
    qualquer-coisa: estado.resultado = "outro"
  }
  date(estado.resultado, "outro")
}

crush "ve-se - pattern literal com strings" {
  cria estado = {resultado: ""}

  ve-se ("abc") {
    bateu-com "abc": estado.resultado = "achou"
    qualquer-coisa: estado.resultado = "nao achou"
  }
  date(estado.resultado, "achou")

  ve-se ("xyz") {
    bateu-com "abc": estado.resultado = "achou"
    qualquer-coisa: estado.resultado = "nao achou"
  }
  date(estado.resultado, "nao achou")
}

crush "ve-se - wildcard com _" {
  resolve testar(x) {
    cria estado = {r: ""}
    ve-se (x) {
      bateu-com 0: estado.r = "zero"
      bateu-com _: estado.r = "nao zero"
    }
    volta estado.r
  }

  date(testar(0), "zero")
  date(testar(42), "nao zero")
}

// =====================================================================
// 21. vai-de (SWITCH)
// =====================================================================

crush "vai-de - case matching" {
  cria resultado = ""

  vai-de (2) {
    se-for 1: resultado = "um"
    se-for 2: resultado = "dois"
    se-for 3: resultado = "tres"
    se-nao-der: resultado = "outro"
  }
  date(resultado, "dois")
}

crush "vai-de - padrao (default)" {
  cria resultado = ""

  vai-de (99) {
    se-for 1: resultado = "um"
    se-for 2: resultado = "dois"
    se-nao-der: resultado = "padrao"
  }
  date(resultado, "padrao")
}

crush "vai-de - com strings" {
  cria resultado = ""

  vai-de ("foo") {
    se-for "bar": resultado = "achou bar"
    se-for "foo": resultado = "achou foo"
    se-nao-der: resultado = "nada"
  }
  date(resultado, "achou foo")
}

// =====================================================================
// 22. COMBINACAO DE RECURSOS
// =====================================================================

crush "Combinado - for com array e objetos" {
  cria alunos = [
    {nome: "Joao", nota: 8},
    {nome: "Maria", nota: 9},
    {nome: "Pedro", nota: 7}
  ]
  cria soma = 0
  repete-na-moral (cria i = 0; i < alunos.length; i++) {
    soma = soma + alunos[i].nota
  }
  date(soma, 24)
}

crush "Combinado - funcao com if ternario" {
  resolve abs(n) {
    volta n >= 0 ? n : -n
  }

  date(abs(5), 5)
  date(abs(-5), 5)
  date(abs(0), 0)
}

crush "Combinado - try dentro de funcao" {
  resolve safeAccessar(obj, prop) {
    tenta {
      volta obj[prop]
    } fodeu(e) {
      volta nulo
    }
  }

  cria dados = {a: 42}
  date(safeAccessar(dados, "a"), 42)
  date(safeAccessar(dados, "b"), nulo)
}

crush "Combinado - funcao que retorna funcao" {
  resolve criaContador(inicial) {
    cria estado = {count: inicial}
    resolve incrementar() {
      estado.count = estado.count + 1
      volta estado.count
    }
    volta incrementar
  }

  cria cont = criaContador(10)
  date(cont(), 11)
  date(cont(), 12)
  date(cont(), 13)
}

crush "Combinado - loop com array modificado" {
  cria arr = [1, 2, 3, 4, 5]
  repete-na-moral (cria i = 0; i < arr.length; i++) {
    arr[i] = arr[i] * 2
  }

  date(arr[0], 2)
  date(arr[1], 4)
  date(arr[2], 6)
  date(arr[3], 8)
  date(arr[4], 10)
  date(arr.length, 5)
}

// =====================================================================
// 23. STRINGS - METODO .length E OPERACOES
// =====================================================================

crush "Strings - length via member access" {
  cria s = "XanaScript"
  date(s.length, 10)

  cria vazia = ""
  date(vazia.length, 0)
}

// =====================================================================
// 24. EDGE CASES DIVERSOS
// =====================================================================

crush "Edge cases - valores extremos" {
  cria max = 2147483647
  cria min = -2147483648
  date(max + 1, 2147483648)
  date(min - 1, -2147483649)
  date(max * 0, 0)
}

crush "Edge cases - condicoes com nulo" {
  cria n = nulo

  se-pah (n == nulo) {
    deu-match(verdadeiro)
  } ai {
    deu-match(falso)
  }

  deu-match(!(n != nulo))
  deu-match(n == nulo)
}

crush "Edge cases - arrays com indice negativo" {
  cria arr = [1, 2, 3]
  deu-match(!arr[-1])
  deu-match(!arr[100])
}

crush "Edge cases - escopo de bloco" {
  cria fora = 1

  se-pah (verdadeiro) {
    cria dentro = 99
    deu-match(dentro == 99)
    fora = 2
  }

  date(fora, 2)
}

crush "Import/export - traz-ai e manda-ai" {
  cria mod = traz-ai "./mod_aux.xs"
  date(mod.soma(2, 3), 5)
  date(mod.dobra(4), 8)
}

crush "Import ciclico - detectado" {
  cria detectou = falso
  tenta {
    cria x = traz-ai "./mod_ciclo_a.xs"
  } fodeu(e) {
    detectou = verdadeiro
  }
  deu-match(detectou)
}

crush "ORM - DB com bota-ai e vê" {
  DB TesteUsuario {
    nome: eh-palavra,
    idade: eh-numero
  }

  TesteUsuario.limpar()
  TesteUsuario.bota-ai({ nome: "Ana", idade: 30 })
  TesteUsuario.bota-ai({ nome: "Bia", idade: 25 })

  cria lista = TesteUsuario.vê()
  date(lista.length, 2)
  date(lista[0].nome, "Ana")

  cria encontrado = TesteUsuario.acha(1)
  date(encontrado.nome, "Ana")

  cria jovens = TesteUsuario.achaOnde({ idade: 25 })
  date(jovens.length, 1)
  date(jovens[0].nome, "Bia")

  date(TesteUsuario.quantos?(), 2)

  TesteUsuario.altera(1, { nome: "Ana Maria" })
  date(TesteUsuario.acha(1).nome, "Ana Maria")

  TesteUsuario.apaga-ae(2)
  date(TesteUsuario.quantos?(), 1)
}

crush "ORM - alterakkkk (alias de altera)" {
  DB TesteUsuario2 {
    nome: eh-palavra,
    idade: eh-numero
  }

  TesteUsuario2.limpar()
  cria ana = TesteUsuario2.bota-ai({ nome: "Ana", idade: 30 })
  cria atual = TesteUsuario2.alterakkkk(ana.id, { idade: 31 })
  date(atual.idade, 31)
  date(TesteUsuario2.acha(ana.id).idade, 31)
}

// =====================================================================
// FASE 1 — Tipos
// =====================================================================

crush "Tipos - anotacao e inferencia" {
  cria idade: eh-numero = 30
  cria nome: eh-palavra = "Ana"
  cria ativo: vdd? = verdadeiro
  date(idade, 30)
  date(nome, "Ana")
  date(ativo, verdadeiro)
}

crush "Tipos - funcao tipada" {
  resolve soma(a: eh-numero, b: eh-numero): eh-numero {
    volta a + b
  }
  date(soma(2, 3), 5)
}

crush "Tipos - generico" {
  resolve identidade<T>(x: T): T {
    volta x
  }
  date(identidade(42), 42)
  date(identidade("oi"), "oi")
}

crush "Tipos - struct e sepah" {
  tipo Usuario {
    nome: eh-palavra,
    idade: eh-numero
  }
  cria u: Usuario = { nome: "Ana", idade: 25 }
  date(u.nome, "Ana")
  date(u.idade, 25)

  cria talvez: sepah<eh-palavra> = nulo
  date(talvez, nulo)
}

crush "Tipos - sus e crush" {
  cria nums: sus<eh-numero> = [1, 2, 3]
  date(nums.length, 3)
  date(nums[0], 1)

  cria par: crush<eh-numero, eh-palavra> = [1, "um"]
  date(par[0], 1)
  date(par[1], "um")
}

crush "Tipos - arrow e classe tipada" {
  cria dobra = (x: eh-numero): eh-numero => x * 2
  date(dobra(4), 8)

  classe Pessoa {
    spawna(nome: eh-palavra) {
      esse-cara.nome = nome
    }
    metodo apresenta(): eh-palavra {
      volta "Oi, eu sou " + esse-cara.nome
    }
  }

  cria p = novo Pessoa("Ana")
  date(p.apresenta(), "Oi, eu sou Ana")
}

// =====================================================================
// 22. OPERADORES NOVOS (FASE 2)
// =====================================================================

crush "Operadores - igualdade estrita" {
  date(1 === 1, verdadeiro)
  date(1 === "1", falso)
  date(1 !== "1", verdadeiro)
  date(1 !== 1, falso)
  date("a" === "a", verdadeiro)
}

crush "Operadores - coalescencia nula" {
  cria a = nulo
  date(a ?? "fallback", "fallback")
  date(0 ?? "fallback", 0)
  date(falso ?? "fallback", falso)
  date("ok" ?? "fallback", "ok")
}

crush "Operadores - exponenciacao" {
  date(2 ** 10, 1024)
  date(2 ** 0, 1)
  date(3 ** 2, 9)
}

crush "Operadores - atribuicao composta" {
  cria x = nulo
  x ??= "preenchido"
  date(x, "preenchido")

  cria y = 5
  y **= 2
  date(y, 25)

  cria z = verdadeiro
  z &&= falso
  date(z, falso)

  cria w = nulo
  w ||= 42
  date(w, 42)
}

crush "Operadores - encadeamento opcional" {
  cria usuario = { nome: "Ana", contato: { email: "a@b.com" } }
  date(usuario?.nome, "Ana")
  date(usuario?.contato?.email, "a@b.com")
  date(usuario?.telefone?.numero, nulo)
  cria vazio = nulo
  date(vazio?.qualquer, nulo)
}

crush "Operadores - spread em array" {
  cria a = [1, 2]
  cria b = [...a, 3, 4]
  date(b.length, 4)
  date(b[0], 1)
  date(b[2], 3)
  date([...[], 1], 1)
}

crush "Operadores - spread em objeto" {
  cria base = { nome: "Ana", idade: 30 }
  cria copia = { ...base, cidade: "SP" }
  date(copia.nome, "Ana")
  date(copia.idade, 30)
  date(copia.cidade, "SP")
  cria vazio = {}
  cria clone = { ...vazio, x: 1 }
  date(clone.x, 1)
}

crush "Operadores - tipo-de e instancia-de" {
  date(tipo-de(5), "eh-numero")
  date(tipo-de("oi"), "eh-palavra")
  date(tipo-de(verdadeiro), "vdd?")
  date(tipo-de(nulo), "eh-nada")
  date(tipo-de([1, 2]), "sus")
  date(tipo-de({}), "bagulho")

  classe Animal { spawna() {} }
  classe Cachorro herda Animal { spawna() {} }
  cria dog = novo Cachorro
  date(instancia-de(dog, Cachorro), verdadeiro)
  date(instancia-de(dog, Animal), verdadeiro)
  date(instancia-de(5, Animal), falso)
}

crush "Operadores - precedencia" {
  date(2 ** 3 ** 2, 512)
  date(1 + 2 ** 3, 9)
  date(2 * 3 + 4, 10)
  date(nulo ?? "a" + "b", "ab")
  date(!(1 === 2), verdadeiro)
}

// =====================================================================
// 23. SISTEMA DE ERROS (FASE 3)
// =====================================================================

crush "Erros - categoria de variavel indefinida" {
  tenta {
    grita-ae(varsinha_inexistente)
  } fodeu(e) {
    date(e.code, "NOME-01")
    date(tipo-de(e.message), "eh-palavra")
  }
}

crush "Erros - categoria de tipo" {
  tenta {
    cria x: eh-numero = "texto errado"
  } fodeu(e) {
    date(e.code, "TIPO-99")
  }
}

crush "Erros - stack em XanaScript" {
  tenta {
    resolve interna() {
      grita-ae(variavel_fantasma)
    }
    resolve externa() {
      interna()
    }
    externa()
  } fodeu(e) {
    date(tipo-de(e.frames), "sus")
    date(e.frames.length >= 2, verdadeiro)
  }
}

// =====================================================================
// FASE 5 - Stdlib + ORM
// =====================================================================

crush "Fase 5 - builtins de string" {
  date(tamanho([1, 2, 3]), 3)
  date(tamanho("abc"), 3)
  date(tamanho(juntar(["a", "b"], "-")), 3)
  date(decodifica-url("a%20b"), "a b")
  date(url("a b"), "a%20b")
}

crush "Fase 5 - std/string e std/array" {
  traz-ai "string"
  traz-ai "array"
  date(maiuscula("ola"), "OLA")
  date(invertida("abc"), "cba")
  date(primeira-maiuscula("xana"), "Xana")
  date(tem("olamundo", "mun"), verdadeiro)
  date(soma-arr([1, 2, 3, 4]), 10)
  date(media([2, 4, 6]), 4)
  date(maior([5, 9, 2]), 9)
  date(tamanho(unico([1, 2, 2, 3])), 3)
}

crush "Fase 5 - std/json e hash" {
  traz-ai "json"
  date(em-json({ a: 1 }), '{"a":1}')
  date(hash-sha256("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
}

crush "Fase 5 - ORM persistencia" {
  DB TestePersistencia {
    nome: eh-palavra,
    score: eh-numero
  }
  TestePersistencia.limpar()
  cria ana = TestePersistencia.bota-ai({ nome: "Ana", score: 10 })
  TestePersistencia.bota-ai({ nome: "Bia", score: 20 })
  date(TestePersistencia.quantos?(), 2)
  date(TestePersistencia.acha(ana.id).nome, "Ana")
  cria top = TestePersistencia.achaOnde({ score: 20 })
  date(tamanho(top), 1)
  date(top[0].nome, "Bia")
  TestePersistencia.altera(ana.id, { score: 99 })
  date(TestePersistencia.acha(ana.id).score, 99)
  TestePersistencia.apaga-ae(ana.id)
  date(TestePersistencia.quantos?(), 1)
  TestePersistencia.limpar()
  date(TestePersistencia.quantos?(), 0)
}

// =====================================================================
// FIM DOS TESTES
// =====================================================================