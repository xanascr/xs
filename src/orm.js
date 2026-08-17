import fs from "fs";
import path from "path";

let lockMap = new Map();

async function withLock(key, fn) {
  while (lockMap.get(key)) {
    await new Promise((r) => setTimeout(r, 10));
  }
  lockMap.set(key, true);
  try {
    return await fn();
  } finally {
    lockMap.set(key, false);
  }
}

export const TYPE_MAP = {
  TEXTO: "string",
  NUMERO: "number",
  BOOLEANO: "boolean",
  DATA: "string",
  QUALQUER: "any",
  "eh-palavra": "string",
  "eh-numero": "number",
  "eh-booleano": "boolean",
  "eh-data": "string",
  "eh-qualquer": "any",
  "vdd?": "boolean",
  data: "string",
};

const nextIds = new Map();

export function createRepository(tableName, props, directory) {
  const dir = directory || process.cwd();
  const dbDir = path.join(dir, ".db");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbFile = path.join(dbDir, `${tableName}.json`);
  const backupFile = dbFile + ".bak";

  let records = [];
  if (fs.existsSync(dbFile)) {
    try {
      records = JSON.parse(fs.readFileSync(dbFile, "utf-8"));
    } catch (e) {
      try {
        const bak = fs.readFileSync(backupFile, "utf-8");
        records = JSON.parse(bak);
        fs.writeFileSync(dbFile, bak, "utf-8");
        console.warn(`   Backup restored to ${tableName}.json`);
      } catch {
        records = [];
        fs.writeFileSync(dbFile, "[]", "utf-8");
      }
    }
  } else {
    fs.writeFileSync(dbFile, "[]", "utf-8");
  }

  let saveQueue = Promise.resolve();
  function save() {
    saveQueue = saveQueue.then(() => {
      try {
        if (fs.existsSync(dbFile)) {
          fs.copyFileSync(dbFile, backupFile);
        }
        fs.writeFileSync(dbFile, JSON.stringify(records, null, 2), "utf-8");
      } catch (e) {
        console.error(`   Error saving ${tableName}: ${e.message}`);
      }
    });
    return saveQueue;
  }

  if (!nextIds.has(tableName)) {
    const maxId = records.reduce((m, d) => Math.max(m, d.id || 0), 0);
    nextIds.set(tableName, maxId);
  }

  function generateId() {
    const id = (nextIds.get(tableName) || 0) + 1;
    nextIds.set(tableName, id);
    return id;
  }

  function deepCopy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function validate(input, partial = false) {
    const errors = [];
    for (const p of props) {
      const val = input[p.name];
      if (val === undefined && !partial) {
        errors.push(`Campo "${p.name}" (${p.type}) is required`);
        continue;
      }
      if (val === undefined) continue;

      const expectedType = TYPE_MAP[p.type] || "any";
      if (expectedType === "string" && typeof val !== "string") {
        errors.push(`Campo "${p.name}" expects TEXT, got ${typeof val}`);
      } else if (expectedType === "number" && typeof val !== "number") {
        errors.push(`Campo "${p.name}" expects NUMBER, got ${typeof val}`);
      } else if (expectedType === "boolean" && typeof val !== "boolean") {
        errors.push(`Campo "${p.name}" expects BOOLEAN, got ${typeof val}`);
      }
    }
    for (const k of Object.keys(input)) {
      if (
        k !== "id" &&
        k !== "criadoEm" &&
        k !== "atualizadoEm" &&
        !props.some((p) => p.name === k)
      ) {
        errors.push(`Campo "${k}" is not declared in the ${tableName} schema`);
      }
    }
    return errors;
  }

  const repo = {
    async "bota-ai"(input) {
      const errors = validate(input);
      if (errors.length > 0) throw new Error("Validation errors:\n" + errors.join("\n"));
      const item = { id: generateId(), ...input, criadoEm: new Date().toISOString() };
      records.push(item);
      await save();
      return deepCopy(item);
    },

    vê() {
      return deepCopy(records);
    },

    acha(id) {
      const found = records.find((d) => d.id === id);
      return found ? deepCopy(found) : null;
    },

    async altera(id, changes) {
      const idx = records.findIndex((d) => d.id === id);
      if (idx === -1) throw new Error(`Registro ${id} not found in ${tableName}`);
      const errors = validate(changes, true);
      if (errors.length > 0) throw new Error("Validation errors:\n" + errors.join("\n"));
      const next = { ...records[idx], ...changes, atualizadoEm: new Date().toISOString() };
      next.id = records[idx].id;
      next.criadoEm = records[idx].criadoEm;
      records[idx] = next;
      await save();
      return deepCopy(records[idx]);
    },

    async alterakkkk(id, changes) {
      return repo.altera(id, changes);
    },

    async "apaga-ae"(id) {
      const idx = records.findIndex((d) => d.id === id);
      if (idx === -1) throw new Error(`Registro ${id} not found in ${tableName}`);
      const removed = records.splice(idx, 1)[0];
      await save();
      return deepCopy(removed);
    },

    achaOnde(filter) {
      return deepCopy(
        records.filter((d) => {
          for (const [k, v] of Object.entries(filter)) {
            if (d[k] !== v) return false;
          }
          return true;
        })
      );
    },

    select(fields) {
      return deepCopy(
        records.map((d) => {
          const obj = {};
          for (const c of fields) obj[c] = d[c];
          return obj;
        })
      );
    },

    "quantos?"() {
      return records.length;
    },

    async limpar() {
      records = [];
      nextIds.set(tableName, 0);
      await save();
    },
  };

  return repo;
}
