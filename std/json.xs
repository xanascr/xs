// JSON helpers
resolve em-json(valor) {
  volta embrulha(valor)
}

resolve em-json-bonito(valor) {
  volta embrulha(valor, 2)
}

resolve de-json(texto) {
  volta desembola(texto)
}

resolve hash-sha256(texto) {
  volta hash(texto)
}

manda-ai em-json
manda-ai em-json-bonito
manda-ai de-json
manda-ai hash-sha256