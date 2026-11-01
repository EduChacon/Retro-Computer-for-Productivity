'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { argumentosCodex, programaCodex, comandoInstalarCodex, candidatosCodex } = require('../src/principal/codex');
const { migrar } = require('../src/principal/config');

test('Codex: o pedido é um argumento literal, depois do fim das opções', () => {
  const pedido = '--dangerously-bypass-approvals-and-sandbox $(touch /tmp/nao-criar) `comando` "aspas"\nsegunda linha';
  const args = argumentosCodex({ pedido, raiz: '/pasta com espaços' });
  assert.deepEqual(args.slice(-2), ['--', pedido]);
  assert.ok(!args.slice(0, -2).includes('--dangerously-bypass-approvals-and-sandbox'));
  assert.ok(!args.includes('--ask-for-approval')); assert.ok(!args.includes('--sandbox'));
});

test('Codex: MCP só nesta sessão, com os segredos fora dos argumentos', () => {
  const mcp = { executavel: 'C:\\Program Files\\Retro Computer.exe', script: 'C:\\pasta com espaços\\mcp-retro.js' };
  const args = argumentosCodex({ raiz: 'C:\\Documentos', idioma: 'es', mcp });
  const servidor = args.find((a) => a.startsWith('mcp_servers.'));
  assert.ok(servidor.includes(JSON.stringify(mcp.executavel)));
  assert.ok(servidor.includes(JSON.stringify(mcp.script)));
  assert.ok(servidor.includes('env_vars=["RETRO_MCP_ENDERECO","RETRO_MCP_TOKEN"]'));
  assert.ok(args.some((a) => a.includes('Responde en español.')));
  assert.ok(!argumentosCodex({ raiz: '/c' }).some((a) => a.startsWith('mcp_servers.')));
});

test('Codex: login e retomada têm ações fixas, sem pedido nem MCP no login', () => {
  assert.deepEqual(argumentosCodex({ acao: 'entrar' }), ['login']);
  assert.deepEqual(argumentosCodex({ acao: 'entrar-codigo' }), ['login', '--device-auth']);
  assert.equal(argumentosCodex({ acao: 'retomar', raiz: '/c' }).at(-1), 'resume');
  assert.throws(() => argumentosCodex({ acao: 'exec' }), /inválida/);
});

test('Codex: o npm do Windows roda como JavaScript, sem executar o .cmd pelo shell', (t) => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-codex-'));
  t.after(() => fs.rmSync(pasta, { recursive: true, force: true }));
  const script = path.join(pasta, 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
  fs.mkdirSync(path.dirname(script), { recursive: true }); fs.writeFileSync(script, '');
  const p = programaCodex(path.join(pasta, 'codex.cmd'), ['--', 'um pedido'], { plataforma: 'win32', executavel: 'electron.exe' });
  assert.equal(p.arquivo, 'electron.exe');
  assert.equal(path.basename(p.args[0]), 'codex-node.js');
  assert.deepEqual(p.args.slice(1), [script, '--', 'um pedido']);
  assert.deepEqual(p.env, { ELECTRON_RUN_AS_NODE: '1' });
});

test('Codex: instalador oficial e procura nos caminhos nativos', () => {
  assert.equal(comandoInstalarCodex('win32'), 'winget install --id OpenAI.Codex --exact --source winget');
  assert.equal(comandoInstalarCodex('darwin'), 'curl -fsSL https://chatgpt.com/codex/install.sh | sh');
  assert.ok(candidatosCodex({ plataforma: 'linux', casa: '/casa' }).includes('/casa/.local/bin/codex'));
});

test('Codex: acha as instalações do Windows sem herdar o PATH atualizado', () => {
  const caminhos = candidatosCodex({ plataforma: 'win32', casa: 'C:\\Users\\Teste', env: { LOCALAPPDATA: 'D:\\Dados locais', ProgramFiles: 'C:\\Program Files', CODEX_INSTALL_DIR: 'D:\\Codex' } });
  assert.ok(caminhos.includes('D:\\Dados locais\\Programs\\OpenAI\\Codex\\bin\\codex.exe'));
  assert.ok(caminhos.includes('D:\\Dados locais\\Microsoft\\WinGet\\Links\\codex.exe'));
  assert.ok(caminhos.includes('C:\\Program Files\\WinGet\\Links\\codex.exe'));
  assert.ok(caminhos.includes('D:\\Codex\\codex.exe'));
});

test('Codex: a atualização só acrescenta o ícone à mesa padrão', () => {
  const antes = ['meu-computador', 'meus-documentos', 'lixeira', 'navegador', 'correio', 'claude'];
  assert.deepEqual(migrar({ versao: 5, mesa: { atalhos: antes } }).mesa.atalhos, [...antes, 'codex', 'assistente']);
  assert.deepEqual(migrar({ versao: 5, mesa: { atalhos: ['claude', 'bloco'] } }).mesa.atalhos, ['claude', 'bloco']);
});
