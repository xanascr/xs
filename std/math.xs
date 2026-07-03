PARTIU()

CHAMA ESSE CARA soma(a, b) {
  VOLTA a + b
}

CHAMA ESSE CARA sub(a, b) {
  VOLTA a - b
}

CHAMA ESSE CARA mul(a, b) {
  VOLTA a * b
}

CHAMA ESSE CARA div(a, b) {
  VOLTA a / b
}

CHAMA ESSE CARA mod(a, b) {
  VOLTA a % b
}

CHAMA ESSE CARA abs(n) {
  SE LIGA SO (n < 0) {
    VOLTA -n
  }
  VOLTA n
}

CHAMA ESSE CARA max(a, b) {
  SE LIGA SO (a > b) {
    VOLTA a
  }
  VOLTA b
}

CHAMA ESSE CARA min(a, b) {
  SE LIGA SO (a < b) {
    VOLTA a
  }
  VOLTA b
}

CHAMA ESSE CARA clamp(val, min, max) {
  SE LIGA SO (val < min) { VOLTA min }
  SE LIGA SO (val > max) { VOLTA max }
  VOLTA val
}

EXPORTA soma
EXPORTA sub
EXPORTA mul
EXPORTA div
EXPORTA mod
EXPORTA abs
EXPORTA max
EXPORTA min
EXPORTA clamp

ACABOU()