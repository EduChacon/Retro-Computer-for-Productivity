'use strict';
/* Testes dos papéis de parede do usuário: a cópia, o tipo pelo conteúdo e a pasta fechada. Rodar: npm test */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PapeisDeParede, extensaoDaImagem, nomeDoPapel } = require('../src/principal/papel.js');

// Um PNG de 1 × 1 ponto.
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex');

function pastas() {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-papel-'));
  const disco = path.join(raiz, 'C');
  fs.mkdirSync(disco);
  return { raiz, disco, papeis: new PapeisDeParede(path.join(raiz, 'dados', 'papeis-de-parede')) };
}

test('o tipo da imagem vem do conteúdo, não do nome', () => {
  assert.equal(extensaoDaImagem(PNG), 'png');
  assert.equal(extensaoDaImagem(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0])), 'jpg');
  assert.equal(extensaoDaImagem(Buffer.from('GIF89a......')), 'gif');
  assert.equal(extensaoDaImagem(Buffer.from('RIFF\0\0\0\0WEBPVP8 ')), 'webp');
  assert.equal(extensaoDaImagem(Buffer.from('BM' + '\0'.repeat(20))), 'bmp');
  assert.equal(extensaoDaImagem(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')), null);
  assert.equal(extensaoDaImagem(Buffer.from('texto qualquer')), null);
  assert.equal(nomeDoPapel('/C/Meus documentos/Praia de Ubatuba.jpg'), 'Praia de Ubatuba');
});

test('a imagem é copiada uma vez só, e o arquivo do disco fica', async () => {
  const { disco, papeis } = pastas();
  const orig = path.join(disco, 'Férias.png');
  fs.writeFileSync(orig, PNG);
  const a = await papeis.adicionar(orig);
  assert.match(a.arquivo, /^[0-9a-f]{16}\.png$/);
  assert.equal(a.nome, 'Férias');
  assert.deepEqual(fs.readFileSync(papeis.caminho(a.arquivo)), PNG);
  // A mesma imagem com outro nome é a mesma cópia.
  const outra = path.join(disco, 'cópia.png');
  fs.writeFileSync(outra, PNG);
  const b = await papeis.adicionar(outra);
  assert.equal(b.arquivo, a.arquivo);
  assert.equal(fs.readdirSync(papeis.pasta).length, 1);
  // Tirar da lista apaga só a cópia.
  assert.equal(await papeis.remover(a.arquivo), true);
  assert.equal(fs.existsSync(papeis.caminho(a.arquivo)), false);
  assert.equal(fs.existsSync(orig), true);
});

test('o que não é imagem, ou é grande demais, é recusado', async () => {
  const { disco, papeis } = pastas();
  const falso = path.join(disco, 'foto.png');
  fs.writeFileSync(falso, '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  await assert.rejects(papeis.adicionar(falso), (e) => e.codigo === 'tipo');
  await assert.rejects(papeis.adicionar(disco), (e) => e.codigo === 'tipo');
  const grande = path.join(disco, 'grande.png');
  fs.writeFileSync(grande, PNG);
  fs.truncateSync(grande, 51 * 1024 * 1024);
  await assert.rejects(papeis.adicionar(grande), (e) => e.codigo === 'grande');
  assert.equal(fs.existsSync(papeis.pasta), false);
});

test('só as cópias saem da pasta: nenhum outro nome é servido nem apagado', async () => {
  const { raiz, papeis } = pastas();
  fs.mkdirSync(papeis.pasta, { recursive: true });
  fs.writeFileSync(path.join(raiz, 'dados', 'config.json'), '{}');
  for (const nome of ['../config.json', '..%2Fconfig.json', 'config.json', '0123456789abcdef.svg', '0123456789abcdef.png/../../config.json', '', null]) {
    assert.equal(papeis.caminho(nome), null, String(nome));
    assert.equal(await papeis.remover(nome), false);
    assert.equal((await papeis.servir(nome)).status, 404);
  }
  assert.equal(fs.existsSync(path.join(raiz, 'dados', 'config.json')), true);
  const ok = path.join(papeis.pasta, '0123456789abcdef.png');
  fs.writeFileSync(ok, PNG);
  const r = await papeis.servir('0123456789abcdef.png');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'image/png');
});
