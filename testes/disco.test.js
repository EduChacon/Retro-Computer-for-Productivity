'use strict';
/* Testes do disco: caminhos, lixeira, versões, importar e exportar. Rodar: npm test */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Disco, nomeValido, VERSOES_MAX } = require('../src/principal/disco.js');
const { mesclar, PADRAO } = require('../src/principal/config.js');

function novoDisco() {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-disco-'));
  return new Disco(path.join(raiz, 'C'));
}

test('prepara as pastas iniciais', async () => {
  const d = novoDisco();
  await d.preparar();
  const nomes = (await d.listar('')).map((i) => i.nome);
  assert.deepEqual(nomes.sort(), ['Meus documentos', 'Área de trabalho'].sort());
});

test('não sai da pasta do disco', async () => {
  const d = novoDisco();
  await d.preparar();
  assert.throws(() => d.real('../fora.txt'), /fora do disco/);
  assert.throws(() => d.real('Meus documentos/../../x'), /fora do disco/);
  assert.throws(() => d.normalizar('.lixeira/x'), /reservada/);
  assert.equal(d.normalizar('C:\\Meus documentos\\a.txt'.replace(/^C:/, '')), 'Meus documentos/a.txt');
});

test('nomes válidos nos três sistemas', () => {
  assert.ok(nomeValido('Relatório final.docx'));
  assert.ok(!nomeValido('a/b'));
  assert.ok(!nomeValido('con.txt'));
  assert.ok(!nomeValido('nome.'));
  assert.ok(!nomeValido('   '));
  assert.ok(!nomeValido('a:b'));
});

test('gravar por cima guarda a versão anterior', async () => {
  const d = novoDisco();
  await d.preparar();
  await d.gravar('Meus documentos/a.txt', Buffer.from('um'));
  await d.gravar('Meus documentos/a.txt', Buffer.from('dois'));
  await d.gravar('Meus documentos/a.txt', Buffer.from('três'));
  assert.equal((await d.ler('Meus documentos/a.txt')).toString(), 'três');
  const vs = await d.versoes('Meus documentos/a.txt');
  assert.equal(vs.length, 2);
  await d.restaurarVersao('Meus documentos/a.txt', vs[vs.length - 1].id);
  assert.equal((await d.ler('Meus documentos/a.txt')).toString(), 'um');
  assert.equal((await d.versoes('Meus documentos/a.txt')).length, 3);
});

test('guarda no máximo VERSOES_MAX versões', async () => {
  const d = novoDisco();
  await d.preparar();
  for (let i = 0; i < VERSOES_MAX + 5; i++) await d.gravar('v.txt', Buffer.from(String(i)));
  assert.equal((await d.versoes('v.txt')).length, VERSOES_MAX);
});

test('excluir vai para a Lixeira e restaurar volta ao lugar', async () => {
  const d = novoDisco();
  await d.preparar();
  await d.gravar('Meus documentos/carta.txt', Buffer.from('olá'));
  const m = await d.paraLixeira('Meus documentos/carta.txt');
  assert.equal(await d.existe('Meus documentos/carta.txt'), false);
  assert.equal((await d.listarLixeira()).length, 1);
  // Outro arquivo com o mesmo nome ocupou o lugar: a restauração usa um nome livre.
  await d.gravar('Meus documentos/carta.txt', Buffer.from('nova'));
  const r = await d.restaurar(m.id);
  assert.equal(r.rel, 'Meus documentos/carta (2).txt');
  assert.equal((await d.ler(r.rel)).toString(), 'olá');
  assert.equal((await d.listarLixeira()).length, 0);
});

test('esvaziar a Lixeira apaga de vez', async () => {
  const d = novoDisco();
  await d.preparar();
  await d.criarPasta('', 'Projeto');
  await d.gravar('Projeto/x.txt', Buffer.from('x'));
  await d.paraLixeira('Projeto');
  await d.esvaziarLixeira();
  assert.equal((await d.listarLixeira()).length, 0);
  assert.equal(await d.existe('Projeto'), false);
});

test('renomear, mover e copiar', async () => {
  const d = novoDisco();
  await d.preparar();
  await d.gravar('a.txt', Buffer.from('a'));
  await d.renomear('a.txt', 'b.txt');
  assert.ok(await d.existe('b.txt'));
  await d.mover('b.txt', 'Meus documentos');
  assert.ok(await d.existe('Meus documentos/b.txt'));
  await d.copiar('Meus documentos/b.txt', 'Meus documentos');
  assert.ok(await d.existe('Meus documentos/b (2).txt'));
  await assert.rejects(d.mover('Meus documentos', 'Meus documentos/sub'), /dentro dela mesma/);
});

test('trazer do computador principal e levar de volta', async () => {
  const d = novoDisco();
  await d.preparar();
  const fora = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-fora-'));
  fs.writeFileSync(path.join(fora, 'foto.png'), 'png');
  const feitos = await d.importar([path.join(fora, 'foto.png')], 'Área de trabalho');
  assert.equal(feitos[0].rel, 'Área de trabalho/foto.png');
  const destino = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-destino-'));
  const levados = await d.exportar(['Área de trabalho/foto.png'], destino);
  assert.equal(fs.readFileSync(levados[0], 'utf8'), 'png');
});

test('buscar pelo nome, sem acento', async () => {
  const d = novoDisco();
  await d.preparar();
  await d.gravar('Meus documentos/Relatório.txt', Buffer.from(''));
  await d.gravar('Meus documentos/Outro.txt', Buffer.from(''));
  const r = await d.buscar('relatorio');
  assert.deepEqual(r.map((x) => x.nome), ['Relatório.txt']);
});

test('configurações: null apaga a chave', () => {
  let c = mesclar(PADRAO, { mesa: { posicoes: { a: [1, 2], b: [0, 0] } } });
  c = mesclar(c, { mesa: { posicoes: { a: null } } });
  assert.deepEqual(c.mesa.posicoes, { b: [0, 0] });
  assert.ok(Array.isArray(c.mesa.atalhos));
});

test('os arquivos de atalho dos programas: o texto, a leitura e o nome livre', async () => {
  const { lerAtalho, textoAtalho } = require('../src/principal/disco.js');
  assert.equal(lerAtalho(textoAtalho('craft:wordcraft')), 'craft:wordcraft');
  assert.equal(lerAtalho('[Retro Computer]\nprograma = nativo:win:C:\\Programas\\Firefox.lnk\n'), 'nativo:win:C:\\Programas\\Firefox.lnk');
  assert.equal(lerAtalho('qualquer coisa'), null);
  assert.equal(lerAtalho('Programa=\n'), null);
  const d = novoDisco();
  await d.preparar();
  const a = await d.criarAtalho('Meus documentos', 'Calculadora', 'calculadora');
  const b = await d.criarAtalho('Meus documentos', 'Calculadora', 'calculadora');
  const c = await d.criarAtalho('Meus documentos', 'A/B: "teste"?', 'bloco');
  assert.deepEqual([a.nome, b.nome, c.nome], ['Calculadora.atalho', 'Calculadora (2).atalho', 'A B teste .atalho'.replace(' .', '.')]);
  const lista = await d.listar('Meus documentos');
  assert.deepEqual(lista.map((x) => x.atalho), ['bloco', 'calculadora', 'calculadora']);
  assert.equal(await d.lerAtalho('Meus documentos/Calculadora (2).atalho'), 'calculadora');
  // Um arquivo qualquer não é atalho, nem um .atalho grande demais.
  await d.gravar('Meus documentos/texto.txt', Buffer.from('Programa=calculadora'));
  await d.gravar('Meus documentos/grande.atalho', Buffer.alloc(5000, 'a'));
  assert.equal(await d.lerAtalho('Meus documentos/texto.txt'), null);
  assert.equal(await d.lerAtalho('Meus documentos/grande.atalho'), null);
  assert.equal((await d.listar('Meus documentos')).find((x) => x.nome === 'texto.txt').atalho, undefined);
});
