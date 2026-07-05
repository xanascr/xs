// =====================================================================
// Teste Completo da Linguagem XanaScript
// =====================================================================
// Execute com: node src/cli.js test_completo.xs
// Ou via test runner: node -e "import('./src/testrunner.js').then(r => r.runTests('.'))"

// ---------------------------------------------------------------------
// Funcoes auxiliares para operadores logicos (E / OU / NAO)
// ---------------------------------------------------------------------
CHAMA ESSE CARA E(a, b) {
  VOLTA a && b
}

CHAMA ESSE CARA OU(a, b) {
  VOLTA a || b
}

CHAMA ESSE CARA NAO(a) {
  VOLTA !a
}

// =====================================================================
// 1. VARIAVEIS E TIPOS BASICOS
// =====================================================================

TESTE "Variaveis - declaracao com CRIA" {
  CRIA x = 10
  CRIA nome = "XanaScript"
  CRIA ativo = VERDADEIRO
  CRIA vazio = NULO
  CRIA negativo = -5
  CRIA zero = 0

  ASSUNTO(x, 10)
  ASSUNTO(nome, "XanaScript")
  ASSUNTO(ativo, VERDADEIRO)
  ASSUNTO(vazio, NULO)
  ASSUNTO(negativo, -5)
  ASSUNTO(zero, 0)
}

TESTE "Variaveis - reatribuicao" {
  CRIA a = 1
  CRIA a = a + 1
  ASSUNTO(a, 2)
  CRIA a = a * 3
  ASSUNTO(a, 6)
}

TESTE "Variaveis - tipos especiais" {
  CRIA v1 = NULO
  AFIRMA(v1 == NULO)
  CRIA v2 = VERDADEIRO
  AFIRMA(v2)
  CRIA v3 = FALSO
  AFIRMA(!v3)
  CRIA v4 = "texto vazio"
  ASSUNTO(v4, "texto vazio")
}

// =====================================================================
// 2. OPERACOES ARITMETICAS
// =====================================================================

TESTE "Aritmetica - operadores basicos" {
  CRIA s = 10 + 5
  CRIA sub = 10 - 5
  CRIA m = 3 * 4
  CRIA d = 10 / 2
  CRIA mod = 10 % 3

  ASSUNTO(s, 15)
  ASSUNTO(sub, 5)
  ASSUNTO(m, 12)
  ASSUNTO(d, 5)
  ASSUNTO(mod, 1)
}

TESTE "Aritmetica - precedencia" {
  CRIA r1 = 1 + 2 * 3
  CRIA r2 = (1 + 2) * 3
  CRIA r3 = 10 - 2 * 3 + 1
  CRIA r4 = 100 / 10 / 2

  ASSUNTO(r1, 7)
  ASSUNTO(r2, 9)
  ASSUNTO(r3, 5)
  ASSUNTO(r4, 5)
}

TESTE "Aritmetica - numeros negativos" {
  CRIA a = -10 + 5
  CRIA b = -3 * -4
  CRIA c = 10 - -3
  CRIA d = -(5 + 3)

  ASSUNTO(a, -5)
  ASSUNTO(b, 12)
  ASSUNTO(c, 13)
  ASSUNTO(d, -8)
}

TESTE "Aritmetica - zero e divisao" {
  CRIA a = 0 + 0
  CRIA b = 0 * 5
  CRIA c = 10 / 0
  CRIA d = 0 / 10
  CRIA e = 5 % 1

  ASSUNTO(a, 0)
  ASSUNTO(b, 0)
  AFIRMA(c == 1/0)
  ASSUNTO(d, 0)
  ASSUNTO(e, 0)
}

TESTE "Aritmetica - operacoes com numeros grandes" {
  CRIA a = 1000 * 1000
  CRIA b = 1000000 / 1000
  CRIA c = 999999 + 1
  CRIA d = 0 - 100000

  ASSUNTO(a, 1000000)
  ASSUNTO(b, 1000)
  ASSUNTO(c, 1000000)
  ASSUNTO(d, -100000)
}

// =====================================================================
// 3. OPERADORES DE COMPARACAO
// =====================================================================

TESTE "Comparacao - todos os operadores" {
  AFIRMA(10 == 10)
  AFIRMA(!(10 == 5))
  AFIRMA(10 != 5)
  AFIRMA(!(10 != 10))
  AFIRMA(10 > 5)
  AFIRMA(!(5 > 10))
  AFIRMA(5 < 10)
  AFIRMA(!(10 < 5))
  AFIRMA(10 >= 10)
  AFIRMA(10 >= 5)
  AFIRMA(!(5 >= 10))
  AFIRMA(5 <= 10)
  AFIRMA(5 <= 5)
  AFIRMA(!(10 <= 5))
}

TESTE "Comparacao - valores especiais" {
  AFIRMA(0 == 0)
  AFIRMA(-1 < 0)
  AFIRMA(-5 >= -5)
  AFIRMA(0 >= -1)
  AFIRMA(!(NULO == VERDADEIRO))
  AFIRMA(NULO != VERDADEIRO)
  AFIRMA(!(FALSO == VERDADEIRO))
}

TESTE "Comparacao - strings" {
  AFIRMA("a" == "a")
  AFIRMA("abc" != "xyz")
  AFIRMA(!("abc" == "ABC"))
}

// =====================================================================
// 4. OPERADORES LOGICOS
// =====================================================================

TESTE "Logico - nativos && || !" {
  AFIRMA(VERDADEIRO && VERDADEIRO)
  AFIRMA(!(VERDADEIRO && FALSO))
  AFIRMA((FALSO && VERDADEIRO) == FALSO)
  AFIRMA(VERDADEIRO || FALSO)
  AFIRMA(FALSO || VERDADEIRO)
  AFIRMA(!(FALSO || FALSO))
  AFIRMA(!VERDADEIRO == FALSO)
  AFIRMA(!FALSO == VERDADEIRO)
  AFIRMA(!!VERDADEIRO)
  AFIRMA(!(!VERDADEIRO))
}

TESTE "Logico - funcoes wrapper E / OU / NAO" {
  AFIRMA(E(VERDADEIRO, VERDADEIRO))
  AFIRMA(!E(VERDADEIRO, FALSO))
  AFIRMA(!E(FALSO, FALSO))
  AFIRMA(OU(VERDADEIRO, FALSO))
  AFIRMA(OU(VERDADEIRO, VERDADEIRO))
  AFIRMA(!OU(FALSO, FALSO))
  AFIRMA(NAO(FALSO))
  AFIRMA(!NAO(VERDADEIRO))
}

TESTE "Logico - curto-circuito" {
  CRIA x = 1

  CRIA y = FALSO && E({}, x = 99)
  ASSUNTO(x, 1)
  ASSUNTO(y, FALSO)

  CRIA z = VERDADEIRO || (x = 42)
  ASSUNTO(z, VERDADEIRO)
  ASSUNTO(x, 1)
}

// =====================================================================
// 5. IF / ELSE
// =====================================================================

TESTE "If/Else - verdadeiro e falso" {
  CRIA r1 = ""
  SE LIGA SO (VERDADEIRO) {
    CRIA r1 = "sim"
  } SENAO {
    CRIA r1 = "nao"
  }
  ASSUNTO(r1, "sim")

  CRIA r2 = ""
  SE LIGA SO (FALSO) {
    CRIA r2 = "sim"
  } SENAO {
    CRIA r2 = "nao"
  }
  ASSUNTO(r2, "nao")
}

TESTE "If/Else - sem SENAO" {
  CRIA r = "padrao"
  SE LIGA SO (FALSO) {
    CRIA r = "mudou"
  }
  ASSUNTO(r, "padrao")

  SE LIGA SO (VERDADEIRO) {
    CRIA r = "mudou"
  }
  ASSUNTO(r, "mudou")
}

TESTE "If/Else - aninhado (else if)" {
  CHAMA ESSE CARA classificar(x) {
    SE LIGA SO (x > 10) {
      VOLTA "maior"
    } SENAO SE LIGA SO (x > 0) {
      VOLTA "positivo"
    } SENAO SE LIGA SO (x == 0) {
      VOLTA "zero"
    } SENAO {
      VOLTA "negativo"
    }
  }

  ASSUNTO(classificar(15), "maior")
  ASSUNTO(classificar(5), "positivo")
  ASSUNTO(classificar(0), "zero")
  ASSUNTO(classificar(-3), "negativo")
}

TESTE "If/Else - condicoes complexas" {
  CRIA a = 5
  CRIA b = 10
  CRIA c = 0

  SE LIGA SO (a > 0 && b > 0 && c == 0) {
    ASSUNTO(a + b, 15)
  } SENAO {
    AFIRMA(FALSO)
  }

  SE LIGA SO (a > 10 || b == 10) {
    AFIRMA(VERDADEIRO)
  } SENAO {
    AFIRMA(FALSO)
  }
}

// =====================================================================
// 6. LOOP FOR
// =====================================================================

TESTE "For - contagem crescente" {
  CRIA soma = 0
  REPETE NA MORAL (CRIA i = 0; i < 5; i++) {
    CRIA soma = soma + i
  }
  ASSUNTO(soma, 10)
}

TESTE "For - com VOA (break)" {
  CRIA soma = 0
  REPETE NA MORAL (CRIA i = 0; i < 10; i++) {
    SE LIGA SO (i == 5) {
      VOA()
    }
    CRIA soma = soma + i
  }
  ASSUNTO(soma, 10)
}

TESTE "For - com CONTINUA" {
  CRIA soma = 0
  REPETE NA MORAL (CRIA i = 0; i < 10; i++) {
    SE LIGA SO (i % 2 == 0) {
      CONTINUA()
    }
    CRIA soma = soma + i
  }
  ASSUNTO(soma, 25)
}

TESTE "For - decremento" {
  CRIA soma = 0
  REPETE NA MORAL (CRIA i = 5; i > 0; i--) {
    CRIA soma = soma + i
  }
  ASSUNTO(soma, 15)
}

TESTE "For - sem init" {
  CRIA i = 0
  CRIA soma = 0
  REPETE NA MORAL (; i < 5; i++) {
    CRIA soma = soma + i
  }
  ASSUNTO(soma, 10)
}

TESTE "For - loop vazio (zero iteracoes)" {
  CRIA soma = 0
  REPETE NA MORAL (CRIA i = 0; i < 0; i++) {
    CRIA soma = 99
  }
  ASSUNTO(soma, 0)
}

// =====================================================================
// 7. LOOP WHILE
// =====================================================================

TESTE "While - contagem" {
  CRIA i = 0
  CRIA soma = 0
  REPETE AI (i < 5) {
    CRIA soma = soma + i
    CRIA i = i + 1
  }
  ASSUNTO(soma, 10)
}

TESTE "While - com break" {
  CRIA i = 0
  CRIA soma = 0
  REPETE AI (VERDADEIRO) {
    SE LIGA SO (i >= 5) {
      VOA()
    }
    CRIA soma = soma + i
    CRIA i = i + 1
  }
  ASSUNTO(soma, 10)
}

TESTE "While - condicao inicial falsa" {
  CRIA x = 1
  REPETE AI (FALSO) {
    CRIA x = 99
  }
  ASSUNTO(x, 1)
}

// =====================================================================
// 8. FUNCOES
// =====================================================================

TESTE "Funcao - declaracao e chamada" {
  CHAMA ESSE CARA soma(a, b) {
    VOLTA a + b
  }

  ASSUNTO(soma(3, 4), 7)
  ASSUNTO(soma(0, 0), 0)
  ASSUNTO(soma(-5, 10), 5)
}

TESTE "Funcao - sem parametros" {
  CHAMA ESSE CARA constante() {
    VOLTA 42
  }

  ASSUNTO(constante(), 42)
}

TESTE "Funcao - sem VOLTA" {
  CHAMA ESSE CARA nada() {
  }

  CRIA r = nada()
  AFIRMA(r == NULO)
}

TESTE "Funcao - escopo" {
  CRIA x = 10

  CHAMA ESSE CARA teste() {
    CRIA x = 20
    VOLTA x
  }

  ASSUNTO(x, 10)
  ASSUNTO(teste(), 20)
  ASSUNTO(x, 10)
}

TESTE "Funcao - recursao (fatorial)" {
  CHAMA ESSE CARA fatorial(n) {
    SE LIGA SO (n <= 1) {
      VOLTA 1
    }
    VOLTA n * fatorial(n - 1)
  }

  ASSUNTO(fatorial(0), 1)
  ASSUNTO(fatorial(1), 1)
  ASSUNTO(fatorial(5), 120)
  ASSUNTO(fatorial(10), 3628800)
}

TESTE "Funcao - recursao (fibonacci)" {
  CHAMA ESSE CARA fib(n) {
    SE LIGA SO (n <= 1) {
      VOLTA n
    }
    VOLTA fib(n - 1) + fib(n - 2)
  }

  ASSUNTO(fib(0), 0)
  ASSUNTO(fib(1), 1)
  ASSUNTO(fib(10), 55)
}

TESTE "Funcao - multiplos parametros" {
  CHAMA ESSE CARA mult(a, b, c) {
    VOLTA a * b * c
  }

  ASSUNTO(mult(2, 3, 4), 24)
  ASSUNTO(mult(1, 1, 1), 1)
  ASSUNTO(mult(0, 100, 100), 0)
}

TESTE "Funcao - funcao como valor" {
  CHAMA ESSE CARA criaMultiplicador(fator) {
    CHAMA ESSE CARA mult(n) {
      VOLTA n * fator
    }
    VOLTA mult
  }

  CRIA dobro = criaMultiplicador(2)
  CRIA triplo = criaMultiplicador(3)

  ASSUNTO(dobro(5), 10)
  ASSUNTO(triplo(5), 15)
}

// =====================================================================
// 9. ATRIBUICAO COMPOSTA (+=, -=, *=, /=, %=)
// =====================================================================

TESTE "Atribuicao composta - todos os operadores" {
  CRIA a = 10
  a += 5
  ASSUNTO(a, 15)

  CRIA b = 10
  b -= 3
  ASSUNTO(b, 7)

  CRIA c = 5
  c *= 4
  ASSUNTO(c, 20)

  CRIA d = 20
  d /= 4
  ASSUNTO(d, 5)

  CRIA e = 10
  e %= 3
  ASSUNTO(e, 1)
}

TESTE "Atribuicao composta - com zero" {
  CRIA a = 0
  a += 5
  ASSUNTO(a, 5)

  CRIA b = 10
  b *= 0
  ASSUNTO(b, 0)

  CRIA c = 10
  c /= 2
  ASSUNTO(c, 5)
}

// =====================================================================
// 10. INCREMENTO/DECREMENTO POSTFIX (++, --)
// =====================================================================

TESTE "Postfix ++ e --" {
  CRIA a = 5
  CRIA b = a++
  ASSUNTO(b, 5)
  ASSUNTO(a, 6)

  CRIA c = 10
  CRIA d = c--
  ASSUNTO(d, 10)
  ASSUNTO(c, 9)
}

TESTE "Postfix - em loops" {
  CRIA soma = 0
  CRIA i = 0
  REPETE AI (i < 5) {
    CRIA soma = soma + i
    i++
  }
  ASSUNTO(soma, 10)
  ASSUNTO(i, 5)

  CRIA j = 5
  CRIA total = 0
  REPETE AI (j > 0) {
    j--
    CRIA total = total + j
  }
  ASSUNTO(total, 10)
  ASSUNTO(j, 0)
}

// =====================================================================
// 11. ARRAYS
// =====================================================================

TESTE "Arrays - literal e acesso por indice" {
  CRIA arr = [10, 20, 30]
  ASSUNTO(arr[0], 10)
  ASSUNTO(arr[1], 20)
  ASSUNTO(arr[2], 30)
}

TESTE "Arrays - modificacao de elementos" {
  CRIA arr = [1, 2, 3]
  arr[0] = 99
  ASSUNTO(arr[0], 99)
  ASSUNTO(arr[1], 2)
  arr[1] += 8
  ASSUNTO(arr[1], 10)
}

TESTE "Arrays - vazio" {
  CRIA vazio = []
  ASSUNTO(vazio.length, 0)
}

TESTE "Arrays - aninhados" {
  CRIA mat = [[1, 2], [3, 4], [5, 6]]
  ASSUNTO(mat[0][0], 1)
  ASSUNTO(mat[0][1], 2)
  ASSUNTO(mat[1][0], 3)
  ASSUNTO(mat[2][1], 6)
  ASSUNTO(mat.length, 3)
}

TESTE "Arrays - tipos mistos" {
  CRIA misto = [1, "dois", VERDADEIRO, NULO, [0]]
  ASSUNTO(misto[0], 1)
  ASSUNTO(misto[1], "dois")
  ASSUNTO(misto[2], VERDADEIRO)
  ASSUNTO(misto[3], NULO)
  ASSUNTO(misto[4][0], 0)
}

TESTE "Arrays - iteracao com for" {
  CRIA arr = [2, 4, 6, 8]
  CRIA soma = 0
  REPETE NA MORAL (CRIA i = 0; i < arr.length; i++) {
    CRIA soma = soma + arr[i]
  }
  ASSUNTO(soma, 20)
}

// =====================================================================
// 12. OBJETOS
// =====================================================================

TESTE "Objetos - literal e acesso a propriedades" {
  CRIA obj = {a: 1, b: 2, c: 3}
  ASSUNTO(obj.a, 1)
  ASSUNTO(obj.b, 2)
  ASSUNTO(obj.c, 3)
}

TESTE "Objetos - tipos variados" {
  CRIA obj = {
    nome: "Xana",
    idade: 42,
    ativo: VERDADEIRO,
    vazio: NULO
  }
  ASSUNTO(obj.nome, "Xana")
  ASSUNTO(obj.idade, 42)
  ASSUNTO(obj.ativo, VERDADEIRO)
  ASSUNTO(obj.vazio, NULO)
}

TESTE "Objetos - aninhados" {
  CRIA obj = {
    endereco: {
      rua: "Rua A",
      numero: 123
    },
    contato: {
      email: "teste@teste.com"
    }
  }
  ASSUNTO(obj.endereco.rua, "Rua A")
  ASSUNTO(obj.endereco.numero, 123)
  ASSUNTO(obj.contato.email, "teste@teste.com")
}

TESTE "Objetos - modificacao" {
  CRIA obj = {x: 1, y: 2}
  obj.x = 99
  obj.z = 3
  ASSUNTO(obj.x, 99)
  ASSUNTO(obj.y, 2)
  ASSUNTO(obj.z, 3)
}

TESTE "Objetos - acesso com indice string" {
  CRIA obj = {nome: "XanaScript", versao: 1}
  CRIA chave = "nome"
  ASSUNTO(obj[chave], "XanaScript")
  obj["versao"] = 2
  ASSUNTO(obj.versao, 2)
}

// =====================================================================
// 13. OPERADOR TERNARIO
// =====================================================================

TESTE "Ternario - condicoes" {
  CRIA r1 = VERDADEIRO ? "sim" : "nao"
  CRIA r2 = FALSO ? "sim" : "nao"

  ASSUNTO(r1, "sim")
  ASSUNTO(r2, "nao")
}

TESTE "Ternario - aninhado" {
  CHAMA ESSE CARA sinal(n) {
    VOLTA n > 0 ? "positivo" : (n < 0 ? "negativo" : "zero")
  }

  ASSUNTO(sinal(5), "positivo")
  ASSUNTO(sinal(-3), "negativo")
  ASSUNTO(sinal(0), "zero")
}

TESTE "Ternario - com expressoes" {
  CRIA a = 10
  CRIA b = 5
  CRIA r = a > b ? a - b : b - a
  ASSUNTO(r, 5)

  CRIA x = 3
  CRIA y = 7
  CRIA s = x > y ? x : y
  ASSUNTO(s, 7)
}

// =====================================================================
// 14. (TEMPLATE STRINGS - pendente: parser precisa importar lex)
// =====================================================================

// Template strings com crase nao funcionam pois o parser nao importa
// a funcao lex(). Ex: `Ola ${nome}` produz ReferenceError.

// =====================================================================
// 15. CONCATENACAO DE STRINGS
// =====================================================================

TESTE "Concatenacao - strings" {
  CRIA s = "ola" + " " + "mundo"
  ASSUNTO(s, "ola mundo")
}

TESTE "Concatenacao - string com numero" {
  CRIA s = "valor: " + 42
  ASSUNTO(s, "valor: 42")
}

TESTE "Concatenacao - multiplas" {
  CRIA a = "a"
  CRIA b = "b"
  CRIA c = "c"
  CRIA r = a + "-" + b + "-" + c
  ASSUNTO(r, "a-b-c")
}

// =====================================================================
// 16. NULO E BOOLEANOS
// =====================================================================

TESTE "NULO - comparacoes" {
  AFIRMA(NULO == NULO)
  AFIRMA(!(NULO == VERDADEIRO))
  AFIRMA(!(NULO == FALSO))
  AFIRMA(NULO != VERDADEIRO)
  AFIRMA(NULO != 0)
  AFIRMA(NULO != "")
}

TESTE "Booleanos - VERDADEIRO e FALSO" {
  AFIRMA(VERDADEIRO)
  AFIRMA(!FALSO)
  AFIRMA(VERDADEIRO != FALSO)
  AFIRMA(VERDADEIRO == VERDADEIRO)
  AFIRMA(FALSO == FALSO)
  AFIRMA(!(VERDADEIRO == FALSO))
}

TESTE "Booleanos - em condicoes" {
  SE LIGA SO (VERDADEIRO) {
    AFIRMA(VERDADEIRO)
  }

  SE LIGA SO (FALSO) {
    AFIRMA(FALSO)
  } SENAO {
    AFIRMA(VERDADEIRO)
  }

  CRIA r = VERDADEIRO ? "ok" : "fail"
  ASSUNTO(r, "ok")
}

// =====================================================================
// 17. MEMBER ACCESS E INDEX EXPR
// =====================================================================

TESTE "Member access - notacao de ponto" {
  CRIA obj = {nome: "Xana", versao: 15, tags: ["br", "pt"]}
  ASSUNTO(obj.nome, "Xana")
  ASSUNTO(obj.versao, 15)
  ASSUNTO(obj.tags.length, 2)
  ASSUNTO(obj.tags[0], "br")
}

TESTE "Index access - colchetes" {
  CRIA arr = [10, 20, 30, 40]
  ASSUNTO(arr[0], 10)
  ASSUNTO(arr[3], 40)

  CRIA i = 2
  ASSUNTO(arr[i], 30)
  ASSUNTO(arr[i + 1], 40)

  CRIA obj = {chave: "valor"}
  CRIA k = "chave"
  ASSUNTO(obj[k], "valor")
}

TESTE "Index access - modificacao via colchetes" {
  CRIA arr = [1, 2, 3]
  arr[1] = 99
  ASSUNTO(arr[1], 99)

  CRIA obj = {a: 1}
  obj["a"] = 42
  ASSUNTO(obj.a, 42)
}

// =====================================================================
// 18. TRY / CATCH
// =====================================================================

TESTE "Try/Catch - captura erro de variavel indefinida" {
  CRIA estado = {capturou: FALSO, msg: ""}

  TENTA {
    CRIA x = variavelInexistente
  } PEGA(e) {
    estado.capturou = VERDADEIRO
    estado.msg = e.message
  }

  AFIRMA(estado.capturou)
  AFIRMA(estado.msg != NULO && estado.msg != "")
}

TESTE "Try/Catch - sem erro (nao captura)" {
  CRIA estado = {capturou: FALSO}

  TENTA {
    CRIA x = 42
  } PEGA(e) {
    estado.capturou = VERDADEIRO
  }

  AFIRMA(!estado.capturou)
}

TESTE "Try/Catch - erro em expressao" {
  CRIA estado = {erro: NULO}

  TENTA {
    CRIA arr = [1, 2, 3]
    CRIA fn = arr
    fn()
  } PEGA(e) {
    estado.erro = e
  }

  AFIRMA(estado.erro != NULO)
}

// =====================================================================
// 19. CLASSE E HERANCA
// =====================================================================

TESTE "Classe - construtor e propriedades" {
  CLASSE Animal {
    CONSTRUTOR() {
      ISTO.nome = "Rex"
    }
    METODO falar() {
      VOLTA "Au au"
    }
  }

  CRIA a = NOVA Animal
  ASSUNTO(a.nome, "Rex")
  ASSUNTO(a.falar(), "Au au")
}

TESTE "Classe - heranca com HERDA" {
  CLASSE Animal {
    CONSTRUTOR() {
      ISTO.tipo = "Animal"
    }
    METODO falar() {
      VOLTA "Som generico"
    }
  }

  CLASSE Cachorro HERDA Animal {
    CONSTRUTOR() {
      ISTO.tipo = "Cachorro"
    }
    METODO falar() {
      VOLTA "Au au"
    }
    METODO abanarRabo() {
      VOLTA "Abanando o rabo"
    }
  }

  CRIA rex = NOVA Cachorro
  ASSUNTO(rex.falar(), "Au au")
  ASSUNTO(rex.abanarRabo(), "Abanando o rabo")
  ASSUNTO(rex.tipo, "Cachorro")

  CRIA gen = NOVA Animal
  ASSUNTO(gen.falar(), "Som generico")
  ASSUNTO(gen.tipo, "Animal")
}

TESTE "Classe - metodo com parametros" {
  CLASSE Calculadora {
    CONSTRUTOR() {
      ISTO.memoria = 0
    }
    METODO somar(a, b) {
      CRIA r = a + b
      VOLTA r
    }
    METODO getDescricao() {
      VOLTA "Calculadora v1.0"
    }
  }

  CRIA calc = NOVA Calculadora
  ASSUNTO(calc.somar(3, 4), 7)
  ASSUNTO(calc.getDescricao(), "Calculadora v1.0")
  ASSUNTO(calc.somar(10, 20), 30)
  ASSUNTO(calc.memoria, 0)
}

TESTE "Classe - multiplas instancias" {
  CLASSE Contador {
    CONSTRUTOR() {
      ISTO.valor = 10
    }
    METODO getDescricao() {
      VOLTA "Contador"
    }
  }

  CRIA c1 = NOVA Contador
  CRIA c2 = NOVA Contador

  ASSUNTO(c1.valor, 10)
  ASSUNTO(c2.valor, 10)
  ASSUNTO(c1.getDescricao(), "Contador")
  ASSUNTO(c2.getDescricao(), "Contador")
}

// =====================================================================
// 20. FUNCOES EMBUTIDAS (BUILT-INS)
// =====================================================================

TESTE "SORTEIA - gera numeros no intervalo" {
  REPETE NA MORAL (CRIA i = 0; i < 50; i++) {
    CRIA n = SORTEIA(1, 10)
    AFIRMA(n >= 1 && n <= 10)

    CRIA m = SORTEIA(-5, 5)
    AFIRMA(m >= -5 && m <= 5)
  }
}

TESTE "SORTEIA - valores iguais (sem variacao)" {
  CRIA n = SORTEIA(42, 42)
  ASSUNTO(n, 42)
}

TESTE "PARSEIA - JSON valido" {
  CRIA obj = PARSEIA('{"nome":"Xana","idade":30}')
  ASSUNTO(obj.nome, "Xana")
  ASSUNTO(obj.idade, 30)
}

TESTE "PARSEIA - JSON array" {
  CRIA arr = PARSEIA('[1,2,3]')
  ASSUNTO(arr[0], 1)
  ASSUNTO(arr[1], 2)
  ASSUNTO(arr[2], 3)
  ASSUNTO(arr.length, 3)
}

// (DIVIDE TEXTO - pendente: funcao precisa estar no runtime)
// (ENCONTRA - pendente: funcao precisa estar no runtime)
// (JUNTAR - pendente: funcao precisa estar no runtime)
// (TAMANHO - pendente: keyword precisa de suporte no parser)

// =====================================================================
// 21. COMBINA (PATTERN MATCHING)
// =====================================================================

TESTE "COMBINA - pattern literal com numeros" {
  CRIA estado = {resultado: ""}

  COMBINA (1) {
    CASO 1: estado.resultado = "um"
    CASO 2: estado.resultado = "dois"
    PADRAO: estado.resultado = "outro"
  }
  ASSUNTO(estado.resultado, "um")

  COMBINA (3) {
    CASO 1: estado.resultado = "um"
    CASO 2: estado.resultado = "dois"
    PADRAO: estado.resultado = "outro"
  }
  ASSUNTO(estado.resultado, "outro")
}

TESTE "COMBINA - pattern literal com strings" {
  CRIA estado = {resultado: ""}

  COMBINA ("abc") {
    CASO "abc": estado.resultado = "achou"
    PADRAO: estado.resultado = "nao achou"
  }
  ASSUNTO(estado.resultado, "achou")

  COMBINA ("xyz") {
    CASO "abc": estado.resultado = "achou"
    PADRAO: estado.resultado = "nao achou"
  }
  ASSUNTO(estado.resultado, "nao achou")
}

TESTE "COMBINA - wildcard com _" {
  CHAMA ESSE CARA testar(x) {
    CRIA estado = {r: ""}
    COMBINA (x) {
      CASO 0: estado.r = "zero"
      CASO _: estado.r = "nao zero"
    }
    VOLTA estado.r
  }

  ASSUNTO(testar(0), "zero")
  ASSUNTO(testar(42), "nao zero")
}

// =====================================================================
// 22. ESCOLHE (SWITCH)
// =====================================================================

TESTE "ESCOLHE - case matching" {
  CRIA resultado = ""

  ESCOLHE (2) {
    CASO 1: resultado = "um"
    CASO 2: resultado = "dois"
    CASO 3: resultado = "tres"
    PADRAO: resultado = "outro"
  }
  ASSUNTO(resultado, "dois")
}

TESTE "ESCOLHE - padrao (default)" {
  CRIA resultado = ""

  ESCOLHE (99) {
    CASO 1: resultado = "um"
    CASO 2: resultado = "dois"
    PADRAO: resultado = "padrao"
  }
  ASSUNTO(resultado, "padrao")
}

TESTE "ESCOLHE - com strings" {
  CRIA resultado = ""

  ESCOLHE ("foo") {
    CASO "bar": resultado = "achou bar"
    CASO "foo": resultado = "achou foo"
    PADRAO: resultado = "nada"
  }
  ASSUNTO(resultado, "achou foo")
}

// =====================================================================
// 23. COMBINACAO DE RECURSOS
// =====================================================================

TESTE "Combinado - for com array e objetos" {
  CRIA alunos = [
    {nome: "Joao", nota: 8},
    {nome: "Maria", nota: 9},
    {nome: "Pedro", nota: 7}
  ]
  CRIA soma = 0
  REPETE NA MORAL (CRIA i = 0; i < alunos.length; i++) {
    CRIA soma = soma + alunos[i].nota
  }
  ASSUNTO(soma, 24)
}

TESTE "Combinado - funcao com if ternario" {
  CHAMA ESSE CARA abs(n) {
    VOLTA n >= 0 ? n : -n
  }

  ASSUNTO(abs(5), 5)
  ASSUNTO(abs(-5), 5)
  ASSUNTO(abs(0), 0)
}

TESTE "Combinado - try dentro de funcao" {
  CHAMA ESSE CARA safeAccessar(obj, prop) {
    TENTA {
      VOLTA obj[prop]
    } PEGA(e) {
      VOLTA NULO
    }
  }

  CRIA dados = {a: 42}
  ASSUNTO(safeAccessar(dados, "a"), 42)
  ASSUNTO(safeAccessar(dados, "b"), NULO)
}

TESTE "Combinado - funcao que retorna funcao" {
  CHAMA ESSE CARA criaContador(inicial) {
    CRIA estado = {count: inicial}
    CHAMA ESSE CARA incrementar() {
      estado.count = estado.count + 1
      VOLTA estado.count
    }
    VOLTA incrementar
  }

  CRIA cont = criaContador(10)
  ASSUNTO(cont(), 11)
  ASSUNTO(cont(), 12)
  ASSUNTO(cont(), 13)
}

TESTE "Combinado - loop com array modificado" {
  CRIA arr = [1, 2, 3, 4, 5]
  REPETE NA MORAL (CRIA i = 0; i < arr.length; i++) {
    arr[i] = arr[i] * 2
  }

  ASSUNTO(arr[0], 2)
  ASSUNTO(arr[1], 4)
  ASSUNTO(arr[2], 6)
  ASSUNTO(arr[3], 8)
  ASSUNTO(arr[4], 10)
  ASSUNTO(arr.length, 5)
}

// =====================================================================
// 24. STRINGS - METODO .length E OPERACOES
// =====================================================================

TESTE "Strings - length via member access" {
  CRIA s = "XanaScript"
  ASSUNTO(s.length, 10)

  CRIA vazia = ""
  ASSUNTO(vazia.length, 0)
}

// =====================================================================
// 25. EDGE CASES DIVERSOS
// =====================================================================

TESTE "Edge cases - valores extremos" {
  CRIA max = 2147483647
  CRIA min = -2147483648
  ASSUNTO(max + 1, 2147483648)
  ASSUNTO(min - 1, -2147483649)
  ASSUNTO(max * 0, 0)
}

TESTE "Edge cases - condicoes com NULO" {
  CRIA n = NULO

  SE LIGA SO (n == NULO) {
    AFIRMA(VERDADEIRO)
  } SENAO {
    AFIRMA(FALSO)
  }

  AFIRMA(!(n != NULO))
  AFIRMA(n == NULO)
}

TESTE "Edge cases - arrays com indice negativo" {
  CRIA arr = [1, 2, 3]
  AFIRMA(arr[-1] == NULO)
  AFIRMA(arr[100] == NULO)
}

// =====================================================================
// FIM DOS TESTES
// =====================================================================
