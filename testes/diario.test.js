'use strict';
// O Diário de trabalho: um .txt por dia, que só recebe linhas no fim (o que o usuário escreveu fica).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Disco } = require('../src/principal/disco');
const { Diario, nomeDoDia, linhaDe, IGNORAR } = require('../src/principal/diario');

const tr = (t, v = {}) => t.replace(/\{(\w+)\}/g, (_, k) => v[k]);

async function novo(ligado = true) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-diario-'));
  const disco = new Disco(raiz);
  await disco.preparar(['Meus documentos']);
  const estado = { ligado, agora: new Date(2026, 9, 16, 9, 5) };
  const d = new Diario({ disco: () => disco, pasta: () => 'Meus documentos/Diário de trabalho', ligado: () => estado.ligado, tr, localidade: () => 'pt-BR', agora: () => estado.agora });
  return { raiz, disco, d, estado, ler: () => fs.readFileSync(path.join(raiz, 'Meus documentos', 'Diário de trabalho', '2026-10-16.txt'), 'utf8') };
}

test('diário: o nome do dia, a linha e os arquivos de trabalho ignorados', () => {
  assert.strictEqual(nomeDoDia(new Date(2026, 0, 5)), '2026-01-05.txt');
  assert.strictEqual(linhaDe(new Date(2026, 0, 5, 7, 3), ' uma\nnota\t '), '07:03  uma nota\n');
  assert.strictEqual(linhaDe(new Date(), '   '), '');
  for (const f of ['a/.~lock.x#', 'a/~$doc.docx', 'a/x.tmp', 'a/x.swp', 'a/x.crdownload', 'a/x~', 'a/.oculto']) assert.ok(IGNORAR.test(f), f);
  assert.ok(!IGNORAR.test('Meus documentos/carta.txt'));
});

test('diário: o cabeçalho na primeira linha do dia, e o que o usuário escreveu fica', async () => {
  const { d, ler, raiz } = await novo();
  await d.anotar('Foco concluído (25 minutos)');
  assert.match(ler(), /^Diário de trabalho — sexta-feira, 16 de outubro de 2026\n=+\n\n09:05  Foco concluído \(25 minutos\)\n$/);
  fs.appendFileSync(path.join(raiz, 'Meus documentos', 'Diário de trabalho', '2026-10-16.txt'), 'Uma anotação minha.\n');
  await d.anotar('Outra linha');
  assert.match(ler(), /Uma anotação minha\.\n09:05  Outra linha\n$/);
});

test('diário: cada arquivo alterado uma vez por dia; o próprio diário e os excluídos ficam de fora', async () => {
  const { d, disco, ler, estado } = await novo();
  await disco.gravar('Meus documentos/carta.txt', Buffer.from('a'));
  assert.strictEqual(await d.arquivoMudou('Meus documentos/carta.txt'), true);
  assert.strictEqual(await d.arquivoMudou('Meus documentos/carta.txt'), false);
  assert.strictEqual(await d.arquivoMudou('Meus documentos/sumiu.txt'), false);
  assert.strictEqual(await d.arquivoMudou('Meus documentos/Diário de trabalho/2026-10-16.txt'), false);
  assert.strictEqual(await d.arquivoMudou('Meus documentos'), false); // uma pasta
  assert.match(ler(), /09:05  Arquivo alterado: C:\\Meus documentos\\carta\.txt\n$/);
  // Desligado, só as notas escritas pelo usuário entram.
  estado.ligado = false;
  await disco.gravar('Meus documentos/outra.txt', Buffer.from('b'));
  assert.strictEqual(await d.arquivoMudou('Meus documentos/outra.txt'), false);
  assert.strictEqual(await d.anotar('automática'), false);
  assert.strictEqual(await d.anotar('Nota minha', { sempre: true }), true);
  assert.match(ler(), /Nota minha\n$/);
  // No dia seguinte, o arquivo é outro, e a carta volta a ser anotada.
  estado.ligado = true;
  estado.agora = new Date(2026, 9, 17, 8, 0);
  assert.strictEqual(await d.arquivoMudou('Meus documentos/carta.txt'), true);
  assert.strictEqual(await d.garantirHoje(), 'Meus documentos/Diário de trabalho/2026-10-17.txt');
});

test('diário: vários avisos da mesma gravação ao mesmo tempo dão uma linha só', async () => {
  const { d, disco, ler } = await novo();
  await disco.gravar('Meus documentos/carta.txt', Buffer.from('a'));
  const r = await Promise.all([1, 2, 3].map(() => d.arquivoMudou('Meus documentos/carta.txt')));
  assert.deepStrictEqual(r.filter(Boolean).length, 1);
  assert.strictEqual(ler().match(/carta\.txt/g).length, 1);
});
