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

  assert.deepEqual(await ops.info(a), { paginas: 3, senha: false, assinado: false });
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
  assert.deepEqual(await ops.info(pdfProtegido()), { paginas: 0, senha: true, assinado: false });
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
  const tarefas = { 'pdf:info': (d) => ops.info(d.bytes), 'pdf:combinar': (d) => ops.combinar(d.itens, d.opcoes), 'pdf:extrair': (d) => ops.extrair(d.bytes, d.intervalo), 'pdf:separar': (d) => ops.separar(d.bytes), 'pdf:girar': (d) => ops.girar(d.bytes, d.graus), 'pdf:marcar': (d) => ops.marcar(d.bytes, d.marcas) };
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

/* ---------- As marcas do Leitor de PDF ---------- */

const { PDFName, PDFString, PDFHexString } = require('pdf-lib');

/** As anotações de cada página: [subtipo, o texto do /Contents]. */
async function anotacoesDe(bytes) {
  const d = await PDFDocument.load(bytes);
  return d.getPages().map((p) => (p.node.Annots() ? p.node.Annots().asArray() : []).map((r) => {
    const a = d.context.lookup(r);
    const c = a.lookup(PDFName.of('Contents'));
    return [String(a.get(PDFName.of('Subtype'))).slice(1), c ? c.decodeText() : null];
  }));
}

/** Um PDF com uma assinatura digital preenchida (o campo /Sig com o /V) e um link. */
async function pdfAssinado() {
  const d = await PDFDocument.create();
  const p = d.addPage([400, 400]);
  const ctx = d.context;
  const v = ctx.register(ctx.obj({ Type: 'Sig', Filter: 'Adobe.PPKLite', ByteRange: [0, 0, 0, 0], Contents: PDFHexString.of('00') }));
  const campo = ctx.register(ctx.obj({ FT: 'Sig', T: PDFString.of('Assinatura'), V: v, Type: 'Annot', Subtype: 'Widget', Rect: [0, 0, 0, 0], P: p.ref }));
  const link = ctx.register(ctx.obj({ Type: 'Annot', Subtype: 'Link', Rect: [10, 10, 50, 50] }));
  p.node.set(PDFName.of('Annots'), ctx.obj([campo, link]));
  d.catalog.set(PDFName.of('AcroForm'), ctx.obj({ Fields: [campo], SigFlags: 3 }));
  return Buffer.from(await d.save());
}

test('pdf: marcar põe os destaques e as notas como anotações, com o desenho e o texto com acentos', async () => {
  const b0 = await pdfDeLarguras([300, 300]);
  const b1 = await ops.marcar(b0, {
    adicionar: [
      { tipo: 'destaque', pagina: 0, quads: [[10, 110, 200, 110, 10, 90, 200, 90], [10, 80, 150, 80, 10, 60, 150, 60]], cor: 'verde', texto: 'prazo de quinze dias' },
      { tipo: 'nota', pagina: 1, x: 250, y: 480, cor: 'amarelo', texto: 'Conferir a cláusula 5ª — ação nº 123' },
    ],
    autor: 'Eduardo',
  });
  assert.deepEqual(await anotacoesDe(b1), [[['Highlight', 'prazo de quinze dias']], [['Text', 'Conferir a cláusula 5ª — ação nº 123']]]);
  const d = await PDFDocument.load(b1);
  const destaque = d.context.lookup(d.getPage(0).node.Annots().get(0));
  assert.equal(destaque.lookup(PDFName.of('QuadPoints')).size(), 16);
  assert.deepEqual(destaque.lookup(PDFName.of('Rect')).asArray().map((n) => n.asNumber()), [10, 60, 200, 110]);
  assert.ok(destaque.lookup(PDFName.of('AP')).lookup(PDFName.of('N')), 'o destaque tem o desenho (/AP)');
  assert.equal(destaque.lookup(PDFName.of('T')).decodeText(), 'Eduardo');
  const nota = d.context.lookup(d.getPage(1).node.Annots().get(0));
  // O ponto da nota é o canto de cima à esquerda; a nota tem 20 pontos.
  assert.deepEqual(nota.lookup(PDFName.of('Rect')).asArray().map((n) => n.asNumber()), [250, 460, 270, 480]);
  assert.deepEqual((await ops.info(b1)), { paginas: 2, senha: false, assinado: false });
});

test('pdf: remover tira só os destaques e as notas pedidos (nunca um campo, uma assinatura ou um link)', async () => {
  const b0 = await pdfAssinado();
  assert.equal((await ops.info(b0)).assinado, true);
  const b1 = await ops.marcar(b0, { adicionar: [
    { tipo: 'destaque', pagina: 0, quads: [[10, 110, 200, 110, 10, 90, 200, 90]], cor: 'azul', texto: 'um' },
    { tipo: 'nota', pagina: 0, x: 100, y: 300, cor: 'rosa', texto: 'dois' },
  ] });
  const d = await PDFDocument.load(b1);
  const refs = d.getPage(0).node.Annots().asArray();
  const id = (r) => `${r.objectNumber}R${r.generationNumber || ''}`;
  assert.equal(refs.length, 4);
  // Pedir para tirar todas: o campo da assinatura e o link ficam; um id que não está na página não faz nada.
  const b2 = await ops.marcar(b1, { remover: [...refs.map((r) => ({ pagina: 0, id: id(r) })), { pagina: 0, id: '99999R' }, { pagina: 0, id: 'x' }] });
  assert.deepEqual((await anotacoesDe(b2))[0].map((a) => a[0]), ['Widget', 'Link']);
  assert.equal((await ops.info(b2)).assinado, true);
  // Sem nada a fazer, a página que não existe, o tipo desconhecido e o número malfeito são recusados.
  await assert.rejects(ops.marcar(b1, {}), (e) => e.codigo === 'vazio');
  await assert.rejects(ops.marcar(b1, { adicionar: [{ tipo: 'nota', pagina: 5, x: 1, y: 1 }] }), (e) => e.codigo === 'intervalo');
  await assert.rejects(ops.marcar(b1, { adicionar: [{ tipo: 'carimbo', pagina: 0 }] }), (e) => e.codigo === 'vazio');
  await assert.rejects(ops.marcar(b1, { adicionar: [{ tipo: 'nota', pagina: 0, x: 'NaN', y: 1 }] }), (e) => e.codigo === 'vazio');
  await assert.rejects(ops.marcar(pdfProtegido(), { adicionar: [{ tipo: 'nota', pagina: 0, x: 1, y: 1 }] }), (e) => e.codigo === 'senha');
});

test('pdf: as marcas que vêm da tela são conferidas antes de ir para o processo de trabalho', () => {
  const { limparMarcas } = require('../src/principal/pdf.js');
  const r = limparMarcas({
    adicionar: [
      { tipo: 'destaque', pagina: 0, quads: [[1, 2, 3, 4, 5, 6, 7, 8], [1, 2, 3], [1, 2, 3, 4, 5, 6, 7, Infinity]], cor: 'vermelho', texto: 'a'.repeat(30000), extra: 'x' },
      { tipo: 'destaque', pagina: 0, quads: [] },
      { tipo: 'nota', pagina: -1, x: 1, y: 2 },
      { tipo: 'nota', pagina: 1.5, x: 1, y: 2 },
      { tipo: 'nota', pagina: 2, x: 1, y: 2, cor: 'azul', texto: 'ok' },
      { tipo: 'carimbo', pagina: 0 },
      null,
    ],
    remover: [{ pagina: 0, id: '12R' }, { pagina: 0, id: '12R3' }, { pagina: 0, id: '../12R' }, { pagina: 'x', id: '3R' }],
    autor: 'b'.repeat(500),
  });
  assert.deepEqual(r.adicionar.map((a) => [a.tipo, a.pagina, a.cor, a.quads ? a.quads.length : null, a.texto.length]), [['destaque', 0, 'amarelo', 1, 20000], ['nota', 2, 'azul', null, 2]]);
  assert.equal(r.adicionar[0].extra, undefined);
  assert.deepEqual(r.remover, [{ pagina: 0, id: '12R' }, { pagina: 0, id: '12R3' }]);
  assert.equal(r.autor.length, 120);
  assert.deepEqual(limparMarcas(null), { adicionar: [], remover: [], autor: '' });
});

test('pdf: no disco, as marcas gravam por cima com a versão anterior, ou numa cópia', async () => {
  const { disco, f } = await ferramentas();
  await disco.gravar('Docs/Contrato.pdf', await pdfDeLarguras([300]));
  const original = await disco.ler('Docs/Contrato.pdf');
  const marcas = { adicionar: [{ tipo: 'nota', pagina: 0, x: 10, y: 400, texto: 'oi' }] };
  await f.marcar('Docs/Contrato.pdf', marcas, 'Docs/Contrato (marcado).pdf');
  assert.ok((await disco.ler('Docs/Contrato.pdf')).equals(original), 'o Salvar como não muda o original');
  assert.deepEqual(await anotacoesDe(await disco.ler('Docs/Contrato (marcado).pdf')), [[['Text', 'oi']]]);
  await f.marcar('Docs/Contrato.pdf', marcas);
  assert.equal((await disco.versoes('Docs/Contrato.pdf')).length, 1);
  assert.ok(fs.readFileSync(path.join(disco.pastaVersoes('Docs/Contrato.pdf'), (await disco.versoes('Docs/Contrato.pdf'))[0].id)).equals(original), 'a versão anterior é o original');
  // Sem marcas novas, o Salvar como só copia; o mesmo arquivo fica como está.
  await f.marcar('Docs/Contrato.pdf', {}, 'Docs/Cópia.pdf');
  assert.equal((await disco.versoes('Docs/Contrato.pdf')).length, 1);
  await assert.rejects(f.marcar('Docs/Contrato.pdf', marcas, 'Docs/Contrato.txt'), /terminar em \.pdf/);
  await assert.rejects(f.marcar('../fora.pdf', marcas), /fora do disco/);
});
