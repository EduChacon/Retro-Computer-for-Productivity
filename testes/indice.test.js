'use strict';
/* A busca pelo conteúdo: o texto de cada tipo de arquivo (extrair-texto.js) e o índice (indice.js). Rodar: npm test */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const yazl = require('yazl');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const { extrair, decodificar } = require('../src/principal/extrair-texto.js');
const { Indice, normalizar, palavrasDe, trecho } = require('../src/principal/indice.js');
const { Disco } = require('../src/principal/disco.js');

/** Um zip na memória com as partes dadas ({ nome: texto }). */
function zipDe(partes) {
  const zip = new yazl.ZipFile();
  for (const [nome, texto] of Object.entries(partes)) zip.addBuffer(Buffer.from(texto), nome);
  zip.end();
  return new Promise((ok, falha) => {
    const pedacos = [];
    zip.outputStream.on('data', (b) => pedacos.push(b)).on('end', () => ok(Buffer.concat(pedacos))).on('error', falha);
  });
}

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const docx = () => zipDe({
  '[Content_Types].xml': '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  '_rels/.rels': '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  'word/document.xml': `<?xml version="1.0"?><w:document ${W}><w:body><w:p><w:r><w:t>Contrato de locação</w:t></w:r></w:p><w:p><w:r><w:t>O aluguel vence no dia cinco.</w:t></w:r></w:p></w:body></w:document>`,
});

async function pdfComTexto(linhas) {
  const doc = await PDFDocument.create();
  const f = await doc.embedFont(StandardFonts.Helvetica);
  for (const l of linhas) doc.addPage([400, 200]).drawText(l, { x: 20, y: 150, size: 12, font: f });
  return Buffer.from(await doc.save());
}

test('texto: as codificações dos textos simples', () => {
  assert.equal(decodificar(Buffer.from('ação', 'utf8')), 'ação');
  assert.equal(decodificar(Buffer.from([0xe7, 0xe3, 0x6f])), 'ção'); // o Windows-1252 de antes
  assert.equal(decodificar(Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('São', 'utf16le')])), 'São');
});

test('texto: de cada tipo de documento', async () => {
  assert.equal(await extrair(Buffer.from('Linha 1\r\n\r\n\r\n\r\nLinha   2'), 'txt'), 'Linha 1\n\nLinha 2');
  assert.equal(await extrair(await docx(), 'docx'), 'Contrato de locação\n\nO aluguel vence no dia cinco.');
  assert.equal(await extrair(await zipDe({ 'content.xml': '<office:document-content><office:body><office:text><text:h>Ata</text:h><text:p>Reunião de <text:span>outubro</text:span></text:p></office:text></office:body></office:document-content>' }), 'odt'), 'Ata\nReunião de outubro');
  const xlsx = await extrair(await zipDe({
    'xl/sharedStrings.xml': '<sst><si><t>Orçamento</t></si><si><t>Despesas &amp; receitas</t></si></sst>',
    'xl/worksheets/sheet1.xml': '<worksheet><sheetData><row><c t="inlineStr"><is><t>Nota escrita</t></is></c><c><v>42</v></c></row></sheetData></worksheet>',
  }), 'xlsx');
  assert.equal(xlsx, 'Orçamento\nDespesas & receitas\n\nNota escrita');
  assert.equal(await extrair(await zipDe({ 'ppt/slides/slide2.xml': '<p:sld><a:p><a:r><a:t>Segundo</a:t></a:r></a:p></p:sld>', 'ppt/slides/slide1.xml': '<p:sld><a:p><a:r><a:t>Primeiro</a:t></a:r></a:p></p:sld>' }), 'pptx'), 'Primeiro\n\nSegundo');
  assert.equal(await extrair(Buffer.from('<html><head><style>p{}</style><script>x()</script></head><body><p>Olá</p><p>mundo</p></body></html>'), 'html'), 'Olá\nmundo');
  assert.equal(await extrair(Buffer.from("{\\rtf1\\ansi{\\fonttbl\\f0 Arial;}\\f0 A\\'e7\\'e3o\\par Fim}"), 'rtf'), 'Ação\nFim');
  assert.equal(await extrair(await pdfComTexto(['Primeira folha', 'Segunda folha']), 'pdf'), 'Primeira folha\n\nSegunda folha');
  assert.equal(await extrair(Buffer.from('x'), 'png'), '');
  await assert.rejects(extrair(Buffer.from('não sou zip'), 'docx'));
});

test('índice: a normalização mantém o tamanho, e o trecho sai do lugar certo', () => {
  const s = 'Ação de COBRANÇA: İzmir, 😀 São Paulo';
  assert.equal(normalizar(s).length, s.length);
  assert.equal(normalizar('ÁÉÍÓÚ ç Ñ'), 'aeiou c n');
  assert.deepEqual(palavrasDe('Prazo "de 15 dias"  SÃO'), ['prazo', 'de 15 dias', 'sao']);
  const longo = 'a'.repeat(200) + ' o réu foi citado em São Paulo ' + 'b'.repeat(200);
  const t = trecho(longo, normalizar(longo), ['sao paulo']);
  assert.ok(t.startsWith('…') && t.endsWith('…') && t.includes('São Paulo'), t);
});

/** O índice sobre um disco temporário, com o texto tirado aqui mesmo (sem o processo de trabalho). */
async function indiceDeTeste() {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-indice-'));
  const disco = new Disco(path.join(raiz, 'C'));
  await disco.preparar(['Docs', 'Outros']);
  const trabalhos = { executar: async (tipo, d) => { assert.equal(tipo, 'texto:extrair'); return extrair(d.bytes, d.ext); } };
  return { disco, raiz, indice: new Indice({ disco, trabalhos, pasta: path.join(raiz, 'indice') }) };
}

test('índice: acha pelo conteúdo, sem acentos, com todas as palavras, e segue as mudanças do disco', async () => {
  const { disco, raiz, indice } = await indiceDeTeste();
  await disco.gravar('Docs/Contrato.docx', await docx());
  await disco.gravar('Docs/Ata.txt', Buffer.from('Reunião sobre o aluguel do salão.'));
  await disco.gravar('Outros/Nota.md', Buffer.from('# Lembrete\nPagar o ALUGUEL até sexta.'));
  await disco.gravar('Docs/foto.png', Buffer.from('não é texto'));
  await indice.olhar();
  assert.deepEqual(await indice.estado(), { ligado: true, arquivos: 3, comTexto: 3, faltam: 0 });

  const nomes = async (t, o) => (await indice.buscar(t, o)).map((r) => r.nome).sort();
  assert.deepEqual(await nomes('aluguel'), ['Ata.txt', 'Contrato.docx', 'Nota.md']);
  assert.deepEqual(await nomes('aluguel salao'), ['Ata.txt']);
  assert.deepEqual(await nomes('locação'), ['Contrato.docx']);
  assert.deepEqual(await nomes('"vence no dia"'), ['Contrato.docx']);
  assert.deepEqual(await nomes('aluguel', { pasta: 'Outros' }), ['Nota.md']);
  assert.deepEqual(await nomes('inexistente'), []);
  const [r] = await indice.buscar('sexta');
  assert.equal(r.trecho, '# Lembrete Pagar o ALUGUEL até sexta.');

  // Um arquivo que mudou é lido de novo; um que saiu, sai do índice. Os outros não são lidos.
  let lidos = 0;
  const executar = indice.trabalhos.executar;
  indice.trabalhos.executar = async (...a) => { lidos++; return executar(...a); };
  await new Promise((ok) => setTimeout(ok, 15));
  await disco.gravar('Docs/Ata.txt', Buffer.from('Reunião cancelada.'));
  await disco.paraLixeira('Outros/Nota.md');
  await indice.olhar();
  assert.equal(lidos, 1);
  assert.deepEqual(await nomes('aluguel'), ['Contrato.docx']);
  assert.deepEqual(await nomes('cancelada'), ['Ata.txt']);

  // Um índice novo lê o manifesto gravado e não lê nada de novo.
  const outro = new Indice({ disco, trabalhos: { executar: async () => { throw new Error('não devia ler'); } }, pasta: path.join(raiz, 'indice') });
  await outro.olhar();
  assert.deepEqual((await outro.buscar('cancelada')).map((x) => x.nome), ['Ata.txt']);

  // Desligada, a busca não acha nada e o índice é apagado.
  await outro.ligar(false);
  assert.deepEqual(await outro.buscar('cancelada'), []);
  assert.equal(fs.existsSync(path.join(raiz, 'indice')), false);
});
