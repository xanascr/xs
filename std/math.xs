resolve soma(a, b) {
  volta a + b
}

resolve sub(a, b) {
  volta a - b
}

resolve mul(a, b) {
  volta a * b
}

resolve div(a, b) {
  volta a / b
}

resolve mod(a, b) {
  volta a % b
}

resolve abs(n) {
  se-pah (n < 0) {
    volta -n
  }
  volta n
}

resolve max(a, b) {
  se-pah (a > b) {
    volta a
  }
  volta b
}

resolve min(a, b) {
  se-pah (a < b) {
    volta a
  }
  volta b
}

resolve clamp(val, min, max) {
  se-pah (val < min) { volta min }
  se-pah (val > max) { volta max }
  volta val
}

manda-ai soma
manda-ai sub
manda-ai mul
manda-ai div
manda-ai mod
manda-ai abs
manda-ai max
manda-ai min
manda-ai clamp