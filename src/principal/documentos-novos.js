'use strict';
/* Modelos próprios, sem macros, links externos ou programas executados ao criar o arquivo. */
const path = require('node:path');
const { ZipFile } = require('yazl');
const { tr } = require('./idioma');
const marcar = (s) => s;
const TIPOS = [
  ['texto', 'txt', marcar('&Documento de texto'), marcar('Novo documento de texto'), 'texto', ''],
  ['documento', 'docx', marcar('Documento do Word (.docx)'), marcar('Novo documento'), 'wordcraft'],
  ['planilha', 'xlsx', marcar('Planilha (.xlsx)'), marcar('Nova planilha'), 'gridcraft'],
  ['apresentacao', 'pptx', marcar('Apresentação (.pptx)'), marcar('Nova apresentação'), 'deckcraft'],
  ['markdown', 'md', marcar('Documento Markdown (.md)'), marcar('Novo documento Markdown'), 'texto', '# \n'],
  ['rtf', 'rtf', marcar('Texto formatado (.rtf)'), marcar('Novo texto formatado'), 'texto', '{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 sans-serif;}}\\f0\\fs24 \\par}'],
  ['html', 'html', marcar('Página HTML (.html)'), marcar('Nova página'), 'internet', '<!doctype html>\n<html>\n<head><meta charset="utf-8"><title>Retro Computer</title></head>\n<body>\n\n</body>\n</html>\n'],
  ['json', 'json', marcar('Arquivo JSON (.json)'), marcar('Novo arquivo'), 'texto', '{}\n'],
  ['c', 'c', 'C (.c)', marcar('Novo programa'), 'texto', '#include <stdio.h>\n\nint main(void) {\n    return 0;\n}\n', 'codigo'],
  ['cpp', 'cpp', 'C++ (.cpp)', marcar('Novo programa'), 'texto', '#include <iostream>\n\nint main() {\n    return 0;\n}\n', 'codigo'],
  ['csharp', 'cs', 'C# (.cs)', marcar('Novo programa'), 'texto', 'using System;\n\nclass Program {\n    static void Main() {\n    }\n}\n', 'codigo'],
  ['python', 'py', 'Python (.py)', marcar('Novo programa'), 'texto', 'def main():\n    pass\n\n\nif __name__ == "__main__":\n    main()\n', 'codigo'],
  ['rust', 'rs', 'Rust (.rs)', marcar('Novo programa'), 'texto', 'fn main() {\n}\n', 'codigo'],
  ['java', 'java', 'Java (.java)', 'Main', 'texto', 'class Main {\n    public static void main(String[] args) {\n    }\n}\n', 'codigo'],
];
const NS = 'http://schemas.openxmlformats.org/';
const rel = (alvo, tipo, id = 'rId1') => `<Relationship Id="${id}" Type="${NS}officeDocument/2006/relationships/${tipo}" Target="${alvo}"/>`;
const rels = (...r) => `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${NS}package/2006/relationships">${r.join('')}</Relationships>`;
async function office(ext) {
  const partes = {}, tipos = [];
  const por = (nome, xml, tipo) => { partes[nome] = xml; if (tipo) tipos.push(`<Override PartName="/${nome}" ContentType="application/vnd.openxmlformats-officedocument.${tipo}+xml"/>`); };
  if (ext === 'docx') {
    por('word/document.xml', `<w:document xmlns:w="${NS}wordprocessingml/2006/main"><w:body><w:p/><w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`, 'wordprocessingml.document.main');
    por('_rels/.rels', rels(rel('word/document.xml', 'officeDocument')));
  } else if (ext === 'xlsx') {
    por('xl/workbook.xml', `<workbook xmlns="${NS}spreadsheetml/2006/main" xmlns:r="${NS}officeDocument/2006/relationships"><sheets><sheet name="${tr('Planilha')}" sheetId="1" r:id="rId1"/></sheets></workbook>`, 'spreadsheetml.sheet.main');
    por('xl/worksheets/sheet1.xml', `<worksheet xmlns="${NS}spreadsheetml/2006/main"><sheetData/></worksheet>`, 'spreadsheetml.worksheet');
    por('xl/_rels/workbook.xml.rels', rels(rel('worksheets/sheet1.xml', 'worksheet')));
    por('_rels/.rels', rels(rel('xl/workbook.xml', 'officeDocument')));
  } else {
    const p = `${NS}presentationml/2006/main`, a = `${NS}drawingml/2006/main`, r = `${NS}officeDocument/2006/relationships`;
    const arvore = '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree>';
    const mapa = '<p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/>';
    por('ppt/presentation.xml', `<p:presentation xmlns:p="${p}" xmlns:r="${r}"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`, 'presentationml.presentation.main');
    por('ppt/_rels/presentation.xml.rels', rels(rel('slideMasters/slideMaster1.xml', 'slideMaster'), rel('slides/slide1.xml', 'slide', 'rId2')));
    por('ppt/slides/slide1.xml', `<p:sld xmlns:p="${p}" xmlns:a="${a}"><p:cSld>${arvore}</p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`, 'presentationml.slide');
    por('ppt/slides/_rels/slide1.xml.rels', rels(rel('../slideLayouts/slideLayout1.xml', 'slideLayout')));
    por('ppt/slideLayouts/slideLayout1.xml', `<p:sldLayout xmlns:p="${p}" xmlns:a="${a}" type="blank" preserve="1"><p:cSld name="Retro">${arvore}</p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`, 'presentationml.slideLayout');
    por('ppt/slideLayouts/_rels/slideLayout1.xml.rels', rels(rel('../slideMasters/slideMaster1.xml', 'slideMaster')));
    por('ppt/slideMasters/slideMaster1.xml', `<p:sldMaster xmlns:p="${p}" xmlns:a="${a}" xmlns:r="${r}"><p:cSld>${arvore}</p:cSld>${mapa}<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`, 'presentationml.slideMaster');
    por('ppt/slideMasters/_rels/slideMaster1.xml.rels', rels(rel('../slideLayouts/slideLayout1.xml', 'slideLayout'), rel('../theme/theme1.xml', 'theme', 'rId2')));
    const cores = ['000000', 'FFFFFF', '333333', 'EEEEEE', '008080', '000080', '800000', '808000', '800080', '008000', '0000FF', '800080'];
    const nomes = ['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'];
    const preenchimento = '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>';
    por('ppt/theme/theme1.xml', `<a:theme xmlns:a="${a}" name="Retro"><a:themeElements><a:clrScheme name="Retro">${nomes.map((n, i) => `<a:${n}><a:srgbClr val="${cores[i]}"/></a:${n}>`).join('')}</a:clrScheme><a:fontScheme name="Retro"><a:majorFont><a:latin typeface="sans-serif"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="sans-serif"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Retro"><a:fillStyleLst>${preenchimento.repeat(3)}</a:fillStyleLst><a:lnStyleLst>${('<a:ln w="12700">' + preenchimento + '<a:prstDash val="solid"/></a:ln>').repeat(3)}</a:lnStyleLst><a:effectStyleLst>${'<a:effectStyle><a:effectLst/></a:effectStyle>'.repeat(3)}</a:effectStyleLst><a:bgFillStyleLst>${preenchimento.repeat(3)}</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`, 'theme');
    por('_rels/.rels', rels(rel('ppt/presentation.xml', 'officeDocument')));
  }
  partes['[Content_Types].xml'] = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="${NS}package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${tipos.join('')}</Types>`;
  const zip = new ZipFile(), pedacos = [];
  const pronto = new Promise((resolve, reject) => { zip.outputStream.on('data', (b) => pedacos.push(b)); zip.outputStream.on('error', reject); zip.outputStream.on('end', () => resolve(Buffer.concat(pedacos))); });
  for (const [nome, xml] of Object.entries(partes)) zip.addBuffer(Buffer.from(xml), nome);
  zip.end(); return pronto;
}
function tiposNovos() { return TIPOS.map(([id, ext, rotulo, , icone, , grupo]) => ({ id, ext, rotulo: tr(rotulo), icone, grupo: grupo || 'documento' })); }
async function criarDocumento(disco, pai, tipo) {
  const t = TIPOS.find((x) => x[0] === tipo); if (!t) throw new Error(tr('Tipo de arquivo desconhecido.'));
  const dados = t[5] === undefined ? await office(t[1]) : Buffer.from(t[5]);
  for (let tentativa = 0; tentativa < 100; tentativa++) {
    const nome = await disco.nomeLivre(pai, tr(t[3]) + '.' + t[1]);
    try { return await disco.gravar(path.posix.join(pai, nome), dados, { esperado: null, versao: false }); }
    catch (e) { if (e.codigo !== 'alterado') throw e; }
  }
  throw new Error(tr('Não foi possível achar um nome livre.'));
}
module.exports = { tiposNovos, criarDocumento, office };
