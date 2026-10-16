// A leitura do painel de visualização: o Word, as planilhas (.xlsx e .ods) e o texto do .odt.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const yazl = require('yazl');
const { Visualizador, textoXml, colunaDe, aparar, linhasOds, LINHAS_MAX } = require('../src/principal/visualizar');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-vis-'));

/** Um zip com as partes dadas ({ nome: texto }). */
function zipar(arquivo, partes) {
  const z = new yazl.ZipFile();
  for (const [nome, texto] of Object.entries(partes)) z.addBuffer(Buffer.from(texto), nome);
  z.end();
  return new Promise((ok, falha) => z.outputStream.pipe(fs.createWriteStream(arquivo)).on('close', ok).on('error', falha));
}

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

test('o texto do XML troca as entidades e tira as marcas', () => {
  assert.strictEqual(textoXml('<t>A &amp; B &lt;c&gt; &#233;&#x00E7;</t>'), 'A & B <c> éç');
  assert.strictEqual(colunaDe('A1'), 0);
  assert.strictEqual(colunaDe('Z9'), 25);
  assert.strictEqual(colunaDe('AA3'), 26);
  assert.deepStrictEqual(aparar([['a', '', ''], ['', 'b', ''], ['', '', '']]), [['a', ''], ['', 'b']]);
});

test('o .docx vira HTML (o título e o negrito)', async () => {
  const arq = path.join(tmp, 'doc.docx');
  await zipar(arq, {
    '[Content_Types].xml': '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    '_rels/.rels': '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    'word/document.xml': `<?xml version="1.0"?><w:document ${W}><w:body><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Olá &lt;mundo&gt;</w:t></w:r></w:p></w:body></w:document>`,
  });
  const html = await new Visualizador().docx(arq);
  assert.match(html, /<strong>Olá &lt;mundo&gt;<\/strong>/);
});

test('o .xlsx mostra a primeira folha, com os textos compartilhados', async () => {
  const arq = path.join(tmp, 'plan.xlsx');
  await zipar(arq, {
    'xl/workbook.xml': '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Contas &amp; gastos" sheetId="1" r:id="rId7"/><sheet name="Outra" sheetId="2" r:id="rId8"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="rId8" Target="worksheets/sheet2.xml"/><Relationship Id="rId7" Target="worksheets/folha.xml"/></Relationships>',
    'xl/sharedStrings.xml': '<sst><si><t>Item</t></si><si><r><t>Va</t></r><r><t>lor</t></r></si><si><t>Café</t><rPh><t>x</t></rPh></si></sst>',
    'xl/worksheets/folha.xml': '<worksheet><sheetData>'
      + '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>'
      + '<row r="3"><c r="A3" t="s"><v>2</v></c><c r="C3"><v>12.5</v></c><c r="D3" t="b"><v>1</v></c><c r="E3" t="inlineStr"><is><t>dentro</t></is></c></row>'
      + '<row r="4"><c r="A4"/></row>'
      + '</sheetData></worksheet>',
    'xl/worksheets/sheet2.xml': '<worksheet><sheetData><row r="1"><c r="A1"><v>999</v></c></row></sheetData></worksheet>',
  });
  const r = await new Visualizador().planilha(arq, 'xlsx');
  assert.strictEqual(r.folha, 'Contas & gastos');
  assert.strictEqual(r.mais, false);
  assert.deepStrictEqual(r.linhas, [
    ['Item', 'Valor', '', '', ''],
    ['', '', '', '', ''],
    ['Café', '', '12.5', 'VERDADEIRO', 'dentro'],
  ]);
});

test('o .xlsx grande mostra só o começo', async () => {
  const arq = path.join(tmp, 'grande.xlsx');
  let linhas = '';
  for (let i = 1; i <= LINHAS_MAX + 5; i++) linhas += `<row r="${i}"><c r="A${i}"><v>${i}</v></c></row>`;
  await zipar(arq, {
    'xl/workbook.xml': '<workbook><sheets><sheet name="F" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="rId1" Target="/xl/worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml': `<worksheet><sheetData>${linhas}</sheetData></worksheet>`,
  });
  const r = await new Visualizador().planilha(arq, 'xlsx');
  assert.strictEqual(r.linhas.length, LINHAS_MAX);
  assert.strictEqual(r.mais, true);
});

test('o .ods repete as células e as linhas como o OpenDocument manda', () => {
  const xml = '<office:spreadsheet><table:table table:name="Folha1">'
    + '<table:table-row><table:table-cell office:value-type="string"><text:p>Nome</text:p></table:table-cell><table:table-cell table:number-columns-repeated="2"><text:p>x</text:p></table:table-cell><table:table-cell table:number-columns-repeated="1020"/></table:table-row>'
    + '<table:table-row table:number-rows-repeated="2"><table:table-cell><text:p>a<text:s/>b</text:p></table:table-cell></table:table-row>'
    + '<table:table-row table:number-rows-repeated="1048570"><table:table-cell table:number-columns-repeated="1024"/></table:table-row>'
    + '</table:table></office:spreadsheet>';
  const r = linhasOds(xml);
  assert.strictEqual(r.folha, 'Folha1');
  assert.strictEqual(r.mais, false);
  assert.deepStrictEqual(aparar(r.linhas), [['Nome', 'x', 'x'], ['a b', '', ''], ['a b', '', '']]);
});

test('o .odt dá os títulos e os parágrafos', async () => {
  const arq = path.join(tmp, 'texto.odt');
  await zipar(arq, {
    'content.xml': '<office:document-content><office:body><office:text><text:h text:outline-level="1">Título</text:h><text:p>Um<text:s/>parágrafo<text:line-break/>com quebra &amp; mais.</text:p><text:p/></office:text></office:body></office:document-content>',
  });
  assert.deepStrictEqual(await new Visualizador().odt(arq), [
    { titulo: true, texto: 'Título' },
    { titulo: false, texto: 'Um parágrafo\ncom quebra & mais.' },
    { titulo: false, texto: '' },
  ]);
});
