'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { CatalogoCraft, lerLista } = require('../src/principal/catalogo-craft');
const linha = (id, repo = 'storytold/' + id) => `| | **${id}** | Descrição | [GitHub](https://github.com/${repo}) |`;
const documento = (...linhas) => '## The Crafting Apps\n' + linhas.join('\n') + '\n## License\n';

test('catálogo: só descobre a tabela oficial e repositórios permitidos', () => {
  const s = linha('fora') + '\n' + documento(linha('novocraft'), linha('solidcraft', 'tangency-labs/solidcraft'), linha('outrocraft', 'terceiro/outrocraft'), linha('../pasta')) + linha('depois');
  assert.deepEqual(lerLista(s).map((p) => p.id), ['novocraft', 'solidcraft']);
});
test('catálogo: confirma o pacote web, deduplica buscas, guarda offline e não troca os conhecidos', async (t) => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-catalogo-')); t.after(() => fs.rmSync(pasta, { recursive: true, force: true }));
  const pedidos = []; let offline = false, agora = Date.now();
  const buscar = async (url) => {
    pedidos.push(url); if (offline) throw new Error('offline');
    if (url.includes('README')) return { ok: true, text: async () => documento(linha('novocraft'), linha('semweb'), linha('foracraft'), linha('wordcraft')) };
    const id = /repos\/storytold\/([^/]+)/.exec(url)[1];
    return { ok: true, json: async () => ({ tag_name: 'v1.0.0', assets: [{ name: id === 'semweb' ? 'programa.exe' : `${id}-web-1.0.0.zip`, browser_download_url: id === 'foracraft' ? 'https://outro.example/pacote.zip' : `https://github.com/storytold/${id}/releases/download/v1.0.0/${id}-web-1.0.0.zip` }] }) };
  };
  const c = new CatalogoCraft(pasta, buscar, { agora: () => agora });
  const [a, b] = await Promise.all([c.atualizar(), c.atualizar()]); assert.deepEqual(a, b); assert.equal(a.novos, 1);
  assert.equal(c.lista().filter((p) => p.id === 'wordcraft').length, 1);
  assert.equal(c.lista().find((p) => p.id === 'novocraft').versaoConhecida, '1.0.0');
  assert.equal(c.lista().some((p) => ['semweb', 'foracraft'].includes(p.id)), false);
  assert.ok(pedidos.every((u) => !u.includes('/download/')), 'a descoberta não baixa nem instala os programas');
  const total = pedidos.length; await c.atualizar(); assert.equal(pedidos.length, total);
  offline = true; agora += 7 * 3600000;
  const outra = new CatalogoCraft(pasta, buscar, { agora: () => agora });
  assert.equal((await outra.atualizar()).offline, true); assert.ok(outra.lista().some((p) => p.id === 'novocraft'));
  await outra.atualizar(); assert.equal(pedidos.length, total + 1, 'uma falha não consulta a cada abertura');
  await outra.atualizar({ forcar: true }); assert.equal(pedidos.length, total + 2);
});
test('catálogo: uma fonte inválida não apaga a cópia salva nem suas associações', async (t) => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-catalogo-')); t.after(() => fs.rmSync(pasta, { recursive: true, force: true }));
  fs.writeFileSync(path.join(pasta, 'catalogo-remoto.json'), JSON.stringify({ programas: [{ id: 'novocraft', nome: 'Novo', repo: 'storytold/novocraft', versaoConhecida: '1.0.0', tipos: ['exe'], icone: 'https://outro.example' }, { id: 'invasor', repo: '../fora' }] }));
  const c = new CatalogoCraft(pasta, async () => ({ ok: true, text: async () => 'formato novo' }));
  assert.equal((await c.atualizar()).offline, true);
  const p = c.lista().find((p) => p.id === 'novocraft'); assert.deepEqual(p.tipos, []); assert.equal(p.icone, 'craft-auto-novocraft'); assert.equal(c.lista().some((p) => p.id === 'invasor'), false);
});

test('catálogo: novos Craft têm identificadores próprios de ícone, sem alterar o catálogo base', () => {
  const c = new CatalogoCraft(os.tmpdir(), async () => { throw new Error('offline'); });
  for (const id of ['texturecraft', 'craft-anything', 'solidcraft']) assert.equal(c.lista().find((p) => p.id === id).icone, 'craft-auto-' + id);
  assert.equal(c.lista().find((p) => p.id === 'wordcraft').icone, 'wordcraft');
  assert.equal(require('../catalogo/programas.json').programas.find((p) => p.id === 'solidcraft').icone, 'craft-auto-solidcraft', 'o catálogo usado pelos Craft nativos do Windows também recebe o desenho');
});
