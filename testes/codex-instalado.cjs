'use strict';
/* Depois da instalação real no Windows: detectar com o PATH antigo e executar sem login/modelo. */
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { acharCodex, programaCodex, argumentosCodex } = require('../src/principal/codex');

(async () => {
  assert.equal(process.platform, 'win32');
  if (process.env.RETRO_PATH_ANTES_CODEX) process.env.PATH = process.env.RETRO_PATH_ANTES_CODEX;
  const caminho = await acharCodex();
  assert.ok(caminho, 'O Codex instalado precisa ser encontrado sem reiniciar o Retro.');
  const p = programaCodex(caminho, ['--version']);
  const { stdout } = await promisify(execFile)(p.arquivo, p.args, { env: { ...process.env, ...p.env }, timeout: 20000, windowsHide: true });
  assert.match(stdout, /codex-cli\s+\S+/i);
  console.log('Codex instalado e executado com o PATH anterior:', stdout.trim());
  // O binário real precisa aceitar o TOML da conexão que usamos nas sessões, sem chamar modelos.
  const args = argumentosCodex({ raiz: process.cwd(), mcp: { executavel: process.execPath, script: require.resolve('../src/principal/mcp-retro') } }).filter((a) => a !== '--no-alt-screen');
  const lista = programaCodex(caminho, [...args, 'mcp', 'list', '--json']);
  const r = await promisify(execFile)(lista.arquivo, lista.args, { env: { ...process.env, ...lista.env }, timeout: 20000, windowsHide: true });
  assert.ok(JSON.parse(r.stdout).some((s) => s.name === 'retro-computer' && s.enabled !== false), 'O CLI real precisa aceitar o servidor MCP do Retro.');
  console.log('Configuração do MCP aceita pelo CLI real.');
})().catch((e) => { console.error(e); process.exitCode = 1; });
