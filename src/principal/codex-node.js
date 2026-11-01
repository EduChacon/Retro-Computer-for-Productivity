'use strict';
/* O CLI do npm usa o Node do Electron, sem deixar essa escolha nos comandos do agente. */
const { pathToFileURL } = require('node:url');
const [script, ...args] = process.argv.slice(2);
delete process.env.ELECTRON_RUN_AS_NODE;
if (!script) process.exitCode = 1;
else {
  process.argv = [process.execPath, script, ...args];
  import(pathToFileURL(script).href).catch((e) => { console.error(e.message); process.exitCode = 1; });
}
