// String helpers
resolve maiuscula(s) {
  volta s.toUpperCase()
}

resolve minuscula(s) {
  volta s.toLowerCase()
}

resolve aparada(s) {
  volta s.trim()
}

resolve começa-com(s, pref) {
  volta s.startsWith(pref)
}

resolve termina-com(s, suf) {
  volta s.endsWith(suf)
}

resolve tem(s, sub) {
  volta s.includes(sub)
}

resolve troca(s, de, para) {
  volta s.split(de).join(para)
}

resolve invertida(s) {
  volta s.split("").reverse().join("")
}

resolve repete(s, n) {
  volta s.repeat(n)
}

resolve primeira-maiuscula(s) {
  se-pah (s.length === 0) {
    volta s
  }
  volta s[0].toUpperCase() + s.slice(1)
}

resolve fatia(s, inicio, fim) {
  se-pah (fim === nulo) {
    volta s.slice(inicio)
  }
  volta s.slice(inicio, fim)
}

manda-ai maiuscula
manda-ai minuscula
manda-ai aparada
manda-ai começa-com
manda-ai termina-com
manda-ai tem
manda-ai troca
manda-ai invertida
manda-ai repete
manda-ai primeira-maiuscula
manda-ai fatia