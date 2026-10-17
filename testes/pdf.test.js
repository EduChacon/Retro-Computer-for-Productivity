'use strict';
/* As ferramentas de PDF: as contas com o pdf-lib (pdf-ops.js) e o lado do disco (pdf.js). Rodar: npm test */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PDFDocument } = require('pdf-lib');
const ops = require('../src/principal/pdf-ops.js');
const { FerramentasPdf } = require('../src/principal/pdf.js');
const { Disco } = require('../src/principal/disco.js');

// Um PNG de 2 × 1 pontos (vermelho e azul).
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAAEElEQVR4nGP4z8DAwMDAAAAJ/wH/SvxGgAAAAABJRU5ErkJggg==', 'base64');

/** Um PDF com uma página de cada largura (em pontos), para saber qual página foi para onde. */
async function pdfDeLarguras(larguras) {
  const doc = await PDFDocument.create();
  for (const w of larguras) doc.addPage([w, 500]);
  return Buffer.from(await doc.save());
}
const larguras = async (bytes) => (await PDFDocument.load(bytes)).getPages().map((p) => Math.round(p.getWidth()));

/** Um PDF protegido (o dicionário Encrypt no trailer, como os de banco com senha de dono). */
function pdfProtegido() {
  const objs = [null,
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>',
    '<< /Filter /Standard /V 1 /R 2 /O (aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa) /U (bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb) /P -4 >>'];
  let s = '%PDF-1.4\n';
  const pos = [];
  for (let k = 1; k < objs.length; k++) { pos[k] = s.length; s += `${k} 0 obj\n${objs[k]}\nendobj\n`; }
  const xref = s.length;
  s += `xref\n0 ${objs.length}\n0000000000 65535 f \n` + pos.slice(1).map((p) => String(p).padStart(10, '0') + ' 00000 n \n').join('');
  s += `trailer\n<< /Size ${objs.length} /Root 1 0 R /Encrypt 4 0 R /ID [<00112233445566778899aabbccddeeff> <00112233445566778899aabbccddeeff>] >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(s, 'latin1');
}

test('pdf: o intervalo de páginas ("1-3, 5", "8-", de trás para a frente, sem repetir)', () => {
  assert.deepEqual(ops.lerIntervalo('1-3, 5', 10), [0, 1, 2, 4]);
  assert.deepEqual(ops.lerIntervalo('8-', 10), [7, 8, 9]);
  assert.deepEqual(ops.lerIntervalo('3-1', 5), [2, 1, 0]);
  assert.deepEqual(ops.lerIntervalo('2; 2, 1–2', 5), [1, 0]);
  for (const ruim of ['', '0', '11', '1-11', 'a', '1-2-3', '-3']) {
    assert.throws(() => ops.lerIntervalo(ruim, 10), (e) => e.codigo === 'intervalo', ruim);
  }
});

test('pdf: a página da imagem cabe no papel, deitada se a imagem for larga', () => {
  const [w, h] = ops.paginaDaImagem(4000, 3000, [595.28, 841.89]);
  assert.ok(Math.abs(h - 595.28) < 0.01 && w < 841.89 && Math.abs(w / h - 4 / 3) < 0.001);
  const [w2, h2] = ops.paginaDaImagem(1000, 2000, [595.28, 841.89]);
  assert.ok(Math.abs(h2 - 841.89) < 0.01 && Math.abs(w2 - 420.945) < 0.01);
});

test('pdf: combinar PDFs e imagens na ordem, extrair, separar e girar', async () => {
  const a = await pdfDeLarguras([100, 200, 300]);
  const b = await pdfDeLarguras([400]);
  const junto = await ops.combinar([{ tipo: 'pdf', bytes: b }, { tipo: 'png', bytes: PNG }, { tipo: 'pdf', bytes: a }]);
  const ls = await larguras(junto);
  assert.equal(ls.length, 5);
  assert.deepEqual([ls[0], ls[2], ls[3], ls[4]], [400, 100, 200, 300]);
  assert.equal(ls[1], 842); // a imagem de 2 × 1, deitada no A4
  const doc = await PDFDocument.load(junto, { updateMetadata: false });
  assert.equal(doc.getProducer(), 'Retro Computer');

  assert.deepEqual(await larguras(await ops.extrair(a, '3, 1')), [300, 100]);
  await assert.rejects(ops.extrair(a, '4'), (e) => e.codigo === 'intervalo');

  const partes = await ops.separar(a);
  assert.equal(partes.length, 3);
  assert.deepEqual(await Promise.all(partes.map(larguras)), [[100], [200], [300]]);

  const girado = await ops.girar(a, 90);
  assert.deepEqual((await PDFDocument.load(girado)).getPages().map((p) => p.getRotation().angle), [90, 90, 90]);
  const voltou = await ops.girar(await ops.girar(girado, -90), 180);
  assert.deepEqual((await PDFDocument.load(voltou)).getPages().map((p) => p.getRotation().angle), [180, 180, 180]);
  await assert.rejects(ops.girar(a, 45), (e) => e.codigo === 'vazio');

  assert.deepEqual(await ops.info(a), { paginas: 3, senha: false });
});

test('pdf: o JPEG que chega como vista no meio de um buffer maior (como nas mensagens entre processos)', async () => {
  // Um JPEG de 4 × 2 pontos (branco), posto a 7 bytes do começo de um buffer maior.
  const jpg = Buffer.from('/9j/4AAQSkZJRgABAgAAAQABAAD//gAQTGF2YzYwLjMxLjEwMgD/2wBDAAgEBAQEBAUFBQUFBQYGBgYGBgYGBgYGBgYHBwcICAgHBwcGBgcHCAgICAkJCQgICAgJCQoKCgwMCwsODg4RERT/xABLAAEBAAAAAAAAAAAAAAAAAAAABwEBAAAAAAAAAAAAAAAAAAAAABABAAAAAAAAAAAAAAAAAAAAABEBAAAAAAAAAAAAAAAAAAAAAP/AABEIAAIABAMBIgACEQADEQD/2gAMAwEAAhEDEQA/AL+AD//Z', 'base64');
  const grande = new Uint8Array(jpg.length + 20);
  grande.set(jpg, 7);
  const vista = new Uint8Array(grande.buffer, 7, jpg.length);
  const doc = await PDFDocument.load(await ops.combinar([{ tipo: 'jpg', bytes: vista }, { tipo: 'jpg', bytes: jpg }]));
  assert.equal(doc.getPageCount(), 2);
});

test('pdf: o protegido e o que não é PDF são recusados com o código certo', async () => {
  assert.deepEqual(await ops.info(pdfProtegido()), { paginas: 0, senha: true });
  await assert.rejects(ops.girar(pdfProtegido(), 90), (e) => e.codigo === 'senha');
  await assert.rejects(ops.separar(Buffer.from('não sou um PDF')), (e) => e.codigo === 'invalido');
  await assert.rejects(ops.combinar([{ tipo: 'pdf', bytes: await pdfDeLarguras([10]) }, { tipo: 'png', bytes: Buffer.from('xx') }]),
    (e) => e.codigo === 'imagem' && e.indice === 1);
  await assert.rejects(ops.combinar([]), (e) => e.codigo === 'vazio');
});

/** As ferramentas sobre um disco temporário, com o trabalho feito aqui mesmo (sem o processo de trabalho). */
async function ferramentas() {
  const disco = new Disco(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'retro-pdf-')), 'C'));
  await disco.preparar(['Docs']);
  const tarefas = { 'pdf:info': (d) => ops.info(d.bytes), 'pdf:combinar': (d) => ops.combinar(d.itens, d.opcoes), 'pdf:extrair': (d) => ops.extrair(d.bytes, d.intervalo), 'pdf:separar': (d) => ops.separar(d.bytes), 'pdf:girar': (d) => ops.girar(d.bytes, d.graus) };
  const trabalhos = { executar: async (tipo, dados) => tarefas[tipo](dados) };
  return { disco, f: new FerramentasPdf({ disco, trabalhos, papel: () => 'Letter' }) };
}

test('pdf: no disco, o original não muda; o Girar guarda a versão anterior', async () => {
  const { disco, f } = await ferramentas();
  await disco.gravar('Docs/Relatório.pdf', await pdfDeLarguras([100, 200, 300]));
  await disco.gravar('Docs/foto.png', PNG);
  await disco.gravar('Docs/Protegido.pdf', pdfProtegido());
  const original = await disco.ler('Docs/Relatório.pdf');

  const info = await f.info(['Docs/Relatório.pdf', 'Docs/foto.png', 'Docs/Protegido.pdf']);
  assert.deepEqual(info.map((i) => [i.paginas, !!i.senha]), [[3, false], [null, false], [0, true]]);

  await f.combinar([{ rel: 'Docs/foto.png' }, { rel: 'Docs/Relatório.pdf' }], 'Docs/Junto.pdf');
  const ls = await larguras(await disco.ler('Docs/Junto.pdf'));
  assert.deepEqual(ls, [792, 100, 200, 300]); // a imagem no Carta (o papel do país)

  const r = await f.separar('Docs/Relatório.pdf');
  assert.equal(r.pasta, 'Docs/Relatório (páginas)');
  assert.deepEqual((await disco.listar(r.pasta)).map((i) => i.nome), ['Relatório - página 1.pdf', 'Relatório - página 2.pdf', 'Relatório - página 3.pdf']);
  assert.equal((await f.separar('Docs/Relatório.pdf')).pasta, 'Docs/Relatório (páginas) (2)');

  await f.extrair('Docs/Relatório.pdf', '2-3', 'Docs/Parte.pdf');
  assert.deepEqual(await larguras(await disco.ler('Docs/Parte.pdf')), [200, 300]);
  await assert.rejects(f.extrair('Docs/Relatório.pdf', '1', 'Docs/Relatório.pdf'), /outro nome/);
  assert.ok((await disco.ler('Docs/Relatório.pdf')).equals(original));

  await f.girar('Docs/Relatório.pdf', 90);
  assert.equal((await disco.versoes('Docs/Relatório.pdf')).length, 1);

  await assert.rejects(f.girar('Docs/Protegido.pdf', 90), /senha ou está protegido/);
  await assert.rejects(f.combinar([{ rel: 'Docs/foto.png' }], 'Docs/Junto.txt'), /terminar em \.pdf/);
  await assert.rejects(f.combinar([{ rel: '../fora.pdf' }], 'Docs/X.pdf'), /fora do disco/);
  await assert.rejects(f.combinar([{ rel: 'Docs/foto.gif' }], 'Docs/X.pdf'), /nem uma imagem/);
});
