'use strict';
/* O OCR do lado do disco (ocr.js): o idioma, os dados dos idiomas copiados e os limites. Rodar: npm test */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Ocr, idiomaValido } = require('../src/principal/ocr.js');
const { Disco } = require('../src/principal/disco.js');

test('ocr: só os idiomas que o programa traz (o resto vira inglês)', () => {
  assert.equal(idiomaValido('por+eng'), 'por+eng');
  assert.equal(idiomaValido('spa'), 'spa');
  assert.equal(idiomaValido('por+por+spa'), 'por+spa');
  assert.equal(idiomaValido('../../etc/passwd'), 'eng');
  assert.equal(idiomaValido('chi_sim+por'), 'por');
  assert.equal(idiomaValido(''), 'eng');
});

test('ocr: os dados dos três idiomas ficam numa pasta só, copiados uma vez', async () => {
  const pasta = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'retro-ocr-')), 'ocr');
  const o = new Ocr({ disco: null, trabalhos: null, pasta });
  assert.equal(await o.preparar(), pasta);
  assert.deepEqual(fs.readdirSync(pasta).sort(), ['eng.traineddata.gz', 'por.traineddata.gz', 'spa.traineddata.gz']);
  const antes = fs.statSync(path.join(pasta, 'por.traineddata.gz')).mtimeMs;
  await new Ocr({ disco: null, trabalhos: null, pasta }).preparar();
  assert.equal(fs.statSync(path.join(pasta, 'por.traineddata.gz')).mtimeMs, antes);
});

test('ocr: só imagens do disco C:, com o limite; o idioma vai conferido para o trabalho', async () => {
  const disco = new Disco(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'retro-ocr-')), 'C'));
  await disco.preparar(['Docs']);
  await disco.gravar('Docs/foto.png', Buffer.from('png'));
  await disco.gravar('Docs/nota.txt', Buffer.from('texto'));
  const pedidos = [];
  const trabalhos = { executar: async (tipo, dados) => { pedidos.push({ tipo, idioma: dados.idioma, n: dados.bytes.length }); return { texto: 'ok', confianca: 90 }; } };
  const o = new Ocr({ disco, trabalhos, pasta: path.join(disco.raiz, '..', 'ocr') });
  assert.deepEqual(await o.imagem({ rel: 'Docs/foto.png' }, 'spa+eng'), { texto: 'ok', confianca: 90 });
  await o.imagem({ png: new Uint8Array(10) }, 'x');
  assert.deepEqual(pedidos, [{ tipo: 'ocr:reconhecer', idioma: 'spa+eng', n: 3 }, { tipo: 'ocr:reconhecer', idioma: 'eng', n: 10 }]);
  await assert.rejects(o.imagem({ rel: 'Docs/nota.txt' }, 'por'), /não pôde ser lida/);
  await assert.rejects(o.imagem({ rel: '../fora.png' }, 'por'), /fora do disco/);
  await assert.rejects(o.imagem({ png: new Uint8Array(61 * 1024 * 1024) }, 'por'), /grande demais/);
});
