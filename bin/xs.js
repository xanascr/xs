#!/usr/bin/env node
import("./src/cli.js").catch(e => { console.error(e); process.exit(1); });
