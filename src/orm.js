import fs from "fs";
import path from "path";

export const TIPOS_MAP = {
  TEXTO: "string",
  NUMERO: "number",
  BOOLEANO: "boolean",
  DATA: "string",
  QUALQUER: "any",
};

export function criarRepositorio(nomeTabela, props, diretorio) {
  const dir = diretorio || process.cwd();
  const dbFile = path.join(dir, `${nomeTabela}.json`);

  let dados = [];
  if (fs.existsSync(dbFile)) {
    try {
      dados = JSON.parse(fs.readFileSync(dbFile, "utf-8"));
    } catch {
      dados = [];
    }
  } else {
    fs.writeFileSync(dbFile, "[]", "utf-8");
  }

  function salvar() {
    fs.writeFileSync(dbFile, JSON.stringify(dados, null, 2), "utf-8");
  }

  function gerarId() {
    if (dados.length === 0) return 1;
    return Math.max(...dados.map(d => d.id || 0)) + 1;
  }

  function validar(entrada, parcial = false) {
    const erros = [];
    for (const p of props) {
      const val = entrada[p.name];
      if (val === undefined && !parcial) {
        erros.push(`Campo "${p.name}" (${p.type}) é obrigatório`);
        continue;
      }
      if (val === undefined) continue;

      const tipoEsperado = TIPOS_MAP[p.type] || "any";
      if (tipoEsperado === "string" && typeof val !== "string") {
        erros.push(`Campo "${p.name}" espera TEXTO, recebeu ${typeof val}`);
      } else if (tipoEsperado === "number" && typeof val !== "number") {
        erros.push(`Campo "${p.name}" espera NUMERO, recebeu ${typeof val}`);
      } else if (tipoEsperado === "boolean" && typeof val !== "boolean") {
        erros.push(`Campo "${p.name}" espera BOOLEANO, recebeu ${typeof val}`);
      }
    }
    return erros;
  }

  return {
    criar(entrada) {
      const erros = validar(entrada);
      if (erros.length > 0) throw new Error("Erros de validação:\n" + erros.join("\n"));
      const item = { id: gerarId(), ...entrada, criadoEm: new Date().toISOString() };
      dados.push(item);
      salvar();
      return item;
    },

    listar() {
      return [...dados];
    },

    buscar(id) {
      return dados.find(d => d.id === id) || null;
    },

    atualizar(id, mudancas) {
      const idx = dados.findIndex(d => d.id === id);
      if (idx === -1) throw new Error(`Registro ${id} não encontrado em ${nomeTabela}`);
      const erros = validar(mudancas, true);
      if (erros.length > 0) throw new Error("Erros de validação:\n" + erros.join("\n"));
      dados[idx] = { ...dados[idx], ...mudancas, atualizadoEm: new Date().toISOString() };
      salvar();
      return dados[idx];
    },

    deletar(id) {
      const idx = dados.findIndex(d => d.id === id);
      if (idx === -1) throw new Error(`Registro ${id} não encontrado em ${nomeTabela}`);
      const removido = dados.splice(idx, 1)[0];
      salvar();
      return removido;
    },

    buscarOnde(filtro) {
      return dados.filter(d => {
        for (const [k, v] of Object.entries(filtro)) {
          if (d[k] !== v) return false;
        }
        return true;
      });
    },

    select(campos) {
      return dados.map(d => {
        const obj = {};
        for (const c of campos) obj[c] = d[c];
        return obj;
      });
    },

    contar() {
      return dados.length;
    },

    limpar() {
      dados = [];
      salvar();
    },
  };
}
