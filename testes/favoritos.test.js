'use strict';
// As pastas de favoritos do Navegador (favoritos.js da área de trabalho): mover, tirar, reordenar.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const modulo = () => import(pathToFileURL(path.join(__dirname, '../src/sistema/js/favoritos.js')).href);

const A = { nome: 'A', url: 'https://a.example/' };
const B = { nome: 'B', url: 'https://b.example/' };
const C = { nome: 'C', url: 'https://c.example/' };
const pasta = (nome, itens) => ({ nome, pasta: true, itens });

test('o lugar de um favorito é achado também dentro das pastas', async () => {
  const { lugarDe, todosFavoritos, favoritoEm } = await modulo();
  const lista = [A, pasta('Trabalho', [B, C])];
  assert.deepEqual(lugarDe(lista, B.url), [1, 0]);
  assert.deepEqual(lugarDe(lista, A.url), [0]);
  assert.equal(lugarDe(lista, 'https://outro.example/'), null);
  assert.deepEqual(todosFavoritos(lista).map((x) => x.f.nome), ['A', 'B', 'C']);
  assert.equal(favoritoEm(lista, [1, 1]), C);
  assert.equal(favoritoEm(lista, [0, 0]), undefined);
});

test('mover para uma pasta e de volta para a barra, sem perder nada', async () => {
  const { moverFavorito, todosFavoritos } = await modulo();
  const lista = [A, B, pasta('Trabalho', [])];
  // A entra na pasta, que estava depois dele (o índice da pasta muda ao tirar o A).
  const um = moverFavorito(lista, [0], 2);
  assert.deepEqual(um.map((f) => f.nome), ['B', 'Trabalho']);
  assert.deepEqual(um[1].itens.map((f) => f.nome), ['A']);
  // De volta para o fim da barra.
  const dois = moverFavorito(um, [1, 0], null);
  assert.deepEqual(dois.map((f) => f.nome), ['B', 'Trabalho', 'A']);
  assert.deepEqual(dois[1].itens, []);
  // A lista de antes não muda.
  assert.deepEqual(lista.map((f) => f.nome), ['A', 'B', 'Trabalho']);
  assert.equal(todosFavoritos(dois).length, 2);
});

test('uma pasta não entra em outra, e o que já está no lugar fica como está', async () => {
  const { moverFavorito } = await modulo();
  const lista = [pasta('X', [A]), pasta('Y', [])];
  assert.equal(moverFavorito(lista, [0], 1), lista);
  assert.equal(moverFavorito(lista, [0, 0], 0), lista);
  const ab = [A, B];
  assert.equal(moverFavorito(ab, [0], null), ab);
  // Para um lugar que não é pasta, nada muda.
  const l = [A, B];
  assert.equal(moverFavorito(l, [0], 1), l);
});

test('excluir uma pasta deixa os favoritos dela na barra, no lugar dela', async () => {
  const { semPasta, comPasta } = await modulo();
  const lista = [A, pasta('Trabalho', [B, C])];
  assert.deepEqual(semPasta(lista, 1).map((f) => f.nome), ['A', 'B', 'C']);
  assert.equal(semPasta(lista, 0), lista);
  const nova = comPasta([A], 'Leitura');
  assert.deepEqual(nova[1], { nome: 'Leitura', pasta: true, itens: [] });
});

test('reordenar pelos índices à vista; os do » vão para o fim', async () => {
  const { reordenada, reordenadaNaPasta } = await modulo();
  assert.deepEqual(reordenada(['a', 'b', 'c', 'd'], [2, 0]), ['c', 'a', 'b', 'd']);
  assert.deepEqual(reordenada(['a', 'b'], [1, 1, 7, -1]), ['b', 'a']);
  const lista = [A, pasta('Trabalho', [B, C])];
  const nova = reordenadaNaPasta(lista, 1, [1, 0]);
  assert.deepEqual(nova[1].itens.map((f) => f.nome), ['C', 'B']);
  assert.equal(nova[0], A);
});

test('renomear, tirar e guardar o ícone valem dentro das pastas', async () => {
  const { comFavorito, semFavorito, comIcone } = await modulo();
  const lista = [A, pasta('Trabalho', [B])];
  assert.equal(comFavorito(lista, [1, 0], (f) => ({ ...f, nome: 'Bê' }))[1].itens[0].nome, 'Bê');
  assert.equal(comFavorito(lista, [1], (f) => ({ ...f, nome: 'Projetos' }))[1].nome, 'Projetos');
  assert.deepEqual(semFavorito(lista, [1, 0])[1].itens, []);
  assert.deepEqual(semFavorito(lista, [0]).map((f) => f.nome), ['Trabalho']);
  const comI = comIcone(lista, (url) => url.startsWith('https://b.'), 'data:image/png;base64,x');
  assert.equal(comI[1].itens[0].icone, 'data:image/png;base64,x');
  assert.equal(comI[0].icone, undefined);
});
