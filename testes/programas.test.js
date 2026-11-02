'use strict';
/* As atualizações dos programas: a comparação de versões e a busca (com a internet de mentira). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Programas, compararVersoes, comLimite } = require('../src/principal/programas.js');

test('compara versões', () => {
  assert.ok(compararVersoes('0.8.0', '0.7.0') > 0);
  assert.ok(compararVersoes('v1.10.0', '1.9.3') > 0);
  assert.equal(compararVersoes('0.7.0', 'v0.7.0'), 0);
  assert.ok(compararVersoes('0.7.0', '0.7.1') < 0);
  assert.ok(compararVersoes('0.7', '0.7.1') < 0);
});

test('o tempo limite desiste', async () => {
  await assert.rejects(comLimite(new Promise(() => { }), 30));
  assert.equal(await comLimite(Promise.resolve(5), 1000), 5);
});

/** Uma pasta com o WordCraft "instalado" na versão dada e uma internet que responde a versão nova. */
function cenario(instalada, publicada) {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-prog-'));
  fs.mkdirSync(path.join(pasta, 'wordcraft'));
  fs.writeFileSync(path.join(pasta, 'wordcraft', 'programa.json'), JSON.stringify({ id: 'wordcraft', nome: 'WordCraft', versao: instalada }));
  const pedidos = [];
  const buscar = async (url) => {
    pedidos.push(url);
    return { ok: true, status: 200, json: async () => ({ tag_name: 'v' + publicada, html_url: 'https://exemplo', assets: [{ name: `wordcraft-web-${publicada}.zip`, browser_download_url: `https://github.com/storytold/wordcraft/releases/download/v${publicada}/wordcraft-web-${publicada}.zip`, size: 1 }] }), headers: new Map() };
  };
  return { prog: new Programas(pasta, buscar), pedidos };
}

test('acha a atualização e guarda a busca por algumas horas', async () => {
  const { prog, pedidos } = cenario('0.7.0', '0.8.0');
  const v = await prog.verificar('wordcraft');
  assert.equal(v.temAtualizacao, true);
  assert.equal(v.nova, '0.8.0');
  assert.equal(v.atual, '0.7.0');
  await prog.verificar('wordcraft');
  assert.equal(pedidos.length, 1, 'a segunda busca usa a guardada');
  await prog.verificar('wordcraft', { forcar: true });
  assert.equal(pedidos.length, 2);
});

test('sem versão nova, nada a fazer', async () => {
  const { prog } = cenario('0.8.0', '0.8.0');
  const [v] = await prog.verificarTodos();
  assert.equal(v.temAtualizacao, false);
});

test('um programa instalado de arquivo não é atualizado sozinho', async () => {
  const { prog, pedidos } = cenario('local', '0.8.0');
  assert.equal((await prog.verificar('wordcraft')).temAtualizacao, false);
  assert.equal(pedidos.length, 0, 'nem pergunta à internet');
});

test('sem internet, a busca falha e os outros seguem', async () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-prog-'));
  fs.mkdirSync(path.join(pasta, 'wordcraft'));
  fs.writeFileSync(path.join(pasta, 'wordcraft', 'programa.json'), JSON.stringify({ id: 'wordcraft', nome: 'WordCraft', versao: '0.7.0' }));
  const prog = new Programas(pasta, async () => { throw new Error('sem rede'); });
  assert.deepEqual(await prog.verificarTodos(), []);
});

test('atualizar nunca reinstala a mesma versão nem volta atrás', async () => {
  const { prog } = cenario('0.8.0', '0.8.0');
  await assert.rejects(prog.instalar('wordcraft', () => { }, { atualizar: true }), (e) => e.codigo === 'sem-novidade');
  const antigo = cenario('0.8.0', '0.7.0');
  await assert.rejects(antigo.prog.instalar('wordcraft', () => { }, { atualizar: true }), (e) => e.codigo === 'sem-novidade');
});

test('sem internet, atualizar não cai na versão conhecida do catálogo', async () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-prog-'));
  fs.mkdirSync(path.join(pasta, 'wordcraft'));
  fs.writeFileSync(path.join(pasta, 'wordcraft', 'programa.json'), JSON.stringify({ id: 'wordcraft', nome: 'WordCraft', versao: '0.9.0' }));
  const pedidos = [];
  const prog = new Programas(pasta, async (url) => { pedidos.push(url); throw new Error('sem rede'); });
  await assert.rejects(prog.instalar('wordcraft', () => { }, { atualizar: true }), /versão mais recente/);
  assert.ok(pedidos.every((u) => !u.includes('/download/')), 'não tentou baixar nada');
});

test('os ícones novos aparecem nas instalações antigas sem mudar o manifesto nem a versão', (t) => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-icones-')); t.after(() => fs.rmSync(pasta, { recursive: true, force: true }));
  const arq = path.join(pasta, 'solidcraft/programa.json'); fs.mkdirSync(path.dirname(arq));
  const anterior = JSON.stringify({ id: 'solidcraft', nome: 'SolidCraft', versao: '0.20.0', origem: 'arquivo local', icone: 'programa' }); fs.writeFileSync(arq, anterior);
  const prog = new Programas(pasta, async () => { throw new Error('Não deveria consultar a rede.'); });
  assert.equal(prog.instalados()[0].icone, 'craft-auto-solidcraft'); assert.equal(prog.instalados()[0].versao, '0.20.0');
  assert.equal(fs.readFileSync(arq, 'utf8'), anterior);
});
