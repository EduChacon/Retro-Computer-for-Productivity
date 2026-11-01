'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Assistente, ambienteAgente, prepararAgente, programaClaude } = require('../src/principal/assistente');
const { Disco } = require('../src/principal/disco');

async function montar(t, motor) {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-assistente-'));
  const disco = new Disco(path.join(pasta, 'C')); await disco.preparar([]);
  const a = new Assistente({ pasta: path.join(pasta, 'dados'), disco, preparar: async () => ({
    programa: { arquivo: process.execPath, args: [path.join(__dirname, 'assistente-falso.cjs'), ...(motor === 'codex' ? ['app-server'] : [])] },
    env: ambienteAgente(motor, { RETRO_ASSISTENTE_SEM_MCP: '1' }),
  }) });
  t.after(async () => { await a.encerrar(); fs.rmSync(pasta, { recursive: true, force: true }); });
  a.nova(motor); return { a, disco, pasta };
}
async function esperar(a, predicado) {
  for (let i = 0; i < 150; i++) { if (predicado(a.obter())) return a.obter(); await new Promise((r) => setTimeout(r, 20)); }
  assert.fail('O assistente não chegou ao estado esperado: ' + JSON.stringify(a.obter()));
}
for (const motor of ['codex', 'claude']) {
  test(`Assistente ${motor}: conversa, confirmação, UTF-8, histórico e versão do anexo`, async (t) => {
    const { a, disco } = await montar(t, motor);
    await disco.gravar('documento.txt', Buffer.from('Original'));
    const pedido = '--dangerously-bypass-approvals-and-sandbox $(comando) `crases` "aspas" Café ☕';
    await a.enviar({ texto: pedido, arquivos: ['documento.txt'] });
    const aguardando = await esperar(a, (s) => s.pedidos.length === 1);
    assert.equal(aguardando.estado, 'aguardando');
    assert.equal(aguardando.conversa.mensagens[0].texto, pedido);
    assert.ok((await disco.versoes('documento.txt')).length >= 1);
    assert.throws(() => a.nova(motor), /Interrompa/);
    a.responder(aguardando.pedidos[0].id, { permitir: true });
    const final = await esperar(a, (s) => !s.ocupado);
    assert.equal(final.estado, 'concluido');
    assert.equal(final.conversa.mensagens.filter((m) => m.papel === 'assistente').length, 1);
    assert.match(final.conversa.mensagens.at(-1).texto, /Café ☕/);
    const id = final.conversa.id;
    a.nova(motor); a.carregar(id);
    assert.equal(a.obter().conversa.mensagens.at(-1).texto, final.conversa.mensagens.at(-1).texto);
    await a.enviar({ texto: 'Outra tarefa' });
    const outra = await esperar(a, (s) => s.pedidos.length === 1);
    a.responder(outra.pedidos[0].id, { permitir: false });
    assert.match((await esperar(a, (s) => !s.ocupado)).conversa.mensagens.at(-1).texto, /recusada/);
    assert.throws(() => a.responder(outra.pedidos[0].id, { permitir: true }), /encerrado/);
  });
  test(`Assistente ${motor}: perguntas e cancelamento encerram os pedidos`, async (t) => {
    const { a } = await montar(t, motor);
    await a.enviar({ texto: 'Faça uma pergunta' });
    const s = await esperar(a, (x) => x.pedidos.length);
    const p = s.pedidos[0]; assert.equal(p.tipo, 'perguntas');
    assert.throws(() => a.responder(p.id, { permitir: true }), /perguntas/);
    a.responder(p.id, { permitir: true, respostas: { [p.perguntas[0].id]: 'Azul' } });
    await esperar(a, (x) => !x.ocupado);
    await a.enviar({ texto: 'demorar' });
    await a.parar(); assert.equal(a.obter().ocupado, false); assert.equal(a.canal, null);
  });
}
test('Assistente Codex: aprova e recusa formulários MCP na mesma conversa, preservando os tipos', async (t) => {
  const { a } = await montar(t, 'codex');
  await a.enviar({ texto: 'formulario-mcp' });
  const s = await esperar(a, (x) => x.pedidos.length);
  const p = s.pedidos[0];
  assert.equal(p.tipo, 'formulario'); assert.equal(p.servidor, 'Retro de teste');
  assert.equal(p.campos[0].padrao, false);
  assert.throws(() => a.responder(p.id, { permitir: true, respostas: { autorizar: true } }), /campo/);
  assert.equal(a.obter().pedidos.length, 1);
  a.responder(p.id, { permitir: true, respostas: { autorizar: true, motivo: 'Teste', quantidade: 2, cor: 'azul' } });
  const fim = await esperar(a, (x) => !x.ocupado);
  assert.match(fim.conversa.mensagens.at(-1).texto, /Concluído/);
  await a.enviar({ texto: 'formulario-mcp' });
  const outro = await esperar(a, (x) => x.pedidos.length);
  a.responder(outro.pedidos[0].id, { permitir: false });
  assert.match((await esperar(a, (x) => !x.ocupado)).conversa.mensagens.at(-1).texto, /recusada/);
});

test('Assistente Codex: autorização por endereço responde accept na conexão original', async (t) => {
  const { a } = await montar(t, 'codex');
  await a.enviar({ texto: 'url-mcp' });
  const s = await esperar(a, (x) => x.pedidos.length);
  assert.equal(s.pedidos[0].tipo, 'autorizacao-url');
  a.responder(s.pedidos[0].id, { permitir: true });
  assert.equal((await esperar(a, (x) => !x.ocupado)).estado, 'concluido');
});

test('Assistente Claude: shims do npm no Windows resolvem instalações nativas e antigas sem shell', (t) => {
  const pasta = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'retro-claude-npm-')));
  t.after(() => fs.rmSync(pasta, { recursive: true, force: true }));
  const pacote = path.join(pasta, 'node_modules', '@anthropic-ai', 'claude-code');
  fs.mkdirSync(path.join(pacote, 'bin'), { recursive: true });
  const nativo = path.join(pacote, 'bin', 'claude.exe');
  const shim = path.join(pasta, 'claude.cmd'); fs.writeFileSync(shim, ''); fs.writeFileSync(nativo, '');
  const args = ['--print', '--input-format', 'stream-json'];
  assert.deepEqual(programaClaude(shim, args), { arquivo: nativo, args, env: {} });
  fs.rmSync(nativo);
  const antigo = path.join(pacote, 'cli.js'); fs.writeFileSync(antigo, '');
  const programa = programaClaude(shim, args, 'electron-de-teste');
  assert.equal(programa.arquivo, 'electron-de-teste');
  assert.deepEqual(programa.args.slice(1), [antigo, ...args]);
  assert.deepEqual(programa.env, { ELECTRON_RUN_AS_NODE: '1' });
  // Instalação local: node_modules/.bin/claude.cmd.
  const local = path.join(pasta, 'node_modules', '.bin', 'claude.cmd');
  fs.mkdirSync(path.dirname(local)); fs.writeFileSync(local, '');
  assert.equal(programaClaude(local, args).args[1], antigo);
});

test('Assistente: cancelamento durante a preparação não lança o processo depois', async (t) => {
  const { a } = await montar(t, 'codex');
  let liberar; a.preparar = () => new Promise((r) => { liberar = r; });
  const enviando = a.enviar({ texto: 'Olá' });
  await esperar(a, (s) => s.ocupado); await a.parar();
  liberar({}); await enviando;
  assert.equal(a.canal, null); assert.equal(a.obter().ocupado, false);
});
test('Assistente: isolamento de chaves, mensagens inválidas e caminhos fora do disco', async (t) => {
  const env = ambienteAgente('codex', {}, { ANTHROPIC_API_KEY: 'segredo', ANTHROPIC_AUTH_TOKEN: 'segredo2', CLAUDE_CODE_OAUTH_TOKEN: 'oauth', RETRO_MCP_TOKEN: 'token', ELECTRON_RUN_AS_NODE: '1', PATH: 'caminho' });
  assert.deepEqual(env, { PATH: 'caminho' });
  assert.deepEqual(ambienteAgente('claude', {}, { OPENAI_API_KEY: 'segredo', PATH: 'caminho' }), { PATH: 'caminho' });
  const { a } = await montar(t, 'codex');
  await assert.rejects(a.enviar({ texto: 'Oi', arquivos: ['../fora'] }));
  assert.equal(a.canal, null); assert.equal(a.obter().ocupado, false);
  assert.throws(() => a.carregar('../segredo'), /inválida/);
  assert.throws(() => a.nova('shell'), /inválido/);
  await assert.rejects(prepararAgente({ motor: 'claude', sessao: '--dangerously-skip-permissions' }), /inválida/);
});
