// Array helpers
resolve primeiro(arr) {
  volta arr[0]
}

resolve ultimo(arr) {
  volta arr[arr.length - 1]
}

resolve tem-elemento(arr, valor) {
  volta arr.includes(valor)
}

resolve acha-indice(arr, valor) {
  volta arr.indexOf(valor)
}

resolve fatia-arr(arr, inicio, fim) {
  se-pah (fim === nulo) {
    volta arr.slice(inicio)
  }
  volta arr.slice(inicio, fim)
}

resolve junta-arr(arr, sep) {
  volta arr.join(sep)
}

resolve inverte-arr(arr) {
  volta arr.slice().reverse()
}

resolve soma-arr(arr) {
  cria total = 0
  repete-na-moral (cria i = 0; i < arr.length; i++) {
    total = total + arr[i]
  }
  volta total
}

resolve media(arr) {
  se-pah (arr.length === 0) {
    volta 0
  }
  volta soma-arr(arr) / arr.length
}

resolve maior(arr) {
  se-pah (arr.length === 0) {
    volta null
  }
  cria m = arr[0]
  repete-na-moral (cria i = 1; i < arr.length; i++) {
    se-pah (arr[i] > m) {
      m = arr[i]
    }
  }
  volta m
}

resolve menor(arr) {
  se-pah (arr.length === 0) {
    volta null
  }
  cria m = arr[0]
  repete-na-moral (cria i = 1; i < arr.length; i++) {
    se-pah (arr[i] < m) {
      m = arr[i]
    }
  }
  volta m
}

resolve empurra(arr, valor) {
  arr.push(valor)
  volta arr
}

resolve tira-ultimo(arr) {
  volta arr.pop()
}

resolve unico(arr) {
  cria visto = {}
  cria resultado = []
  repete-na-moral (cria i = 0; i < arr.length; i++) {
    se-pah (!visto[arr[i]]) {
      visto[arr[i]] = verdadeiro
      resultado.push(arr[i])
    }
  }
  volta resultado
}

manda-ai primeiro
manda-ai ultimo
manda-ai tem-elemento
manda-ai acha-indice
manda-ai fatia-arr
manda-ai junta-arr
manda-ai inverte-arr
manda-ai soma-arr
manda-ai media
manda-ai maior
manda-ai menor
manda-ai empurra
manda-ai tira-ultimo
manda-ai unico