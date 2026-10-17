/*
 * O texto de um arquivo, para a busca pelo conteúdo (indice.js): os textos simples, o Word (.docx,
 * pelo mammoth), o OpenDocument (.odt, .ods, .odp), o Excel (.xlsx), o PowerPoint (.pptx), o RTF e o
 * PDF (pelo pdf.js, sem eval). Roda no processo de trabalho, sobre os bytes: os arquivos podem vir
 * malfeitos de propósito, e um que trave ou estoure a memória só derruba aquele processo.
 */
'use strict';
const path = require('path');
const yauzl = require('yauzl');
const { textoXml } = require('./visualizar');

const MAX_TEXTO = 400 * 1024; // os primeiros 400 mil caracteres de cada arquivo
const ENTRADA_MAX = 30 * 1024 * 1024; // cada parte de dentro de um .docx, .xlsx…, já descompactada
const PAGINAS_MAX = 300;

const TEXTOS = new Set(['txt', 'md', 'markdown', 'csv', 'tsv', 'log', 'json', 'xml', 'ini', 'cfg', 'conf', 'yml', 'yaml', 'tex', 'srt', 'vtt', 'js', 'mjs', 'ts', 'py', 'c', 'h', 'cpp', 'java', 'css', 'sql', 'sh', 'bat']);
const EXTS = new Set([...TEXTOS, 'html', 'htm', 'rtf', 'docx', 'odt', 'ods', 'odp', 'xlsx', 'pptx', 'pdf']);

/** Os bytes de um texto: UTF-8 (com ou sem a marca), UTF-16 com a marca ou, sem jeito de UTF-8, o Windows-1252. */
function decodificar(b) {
  const u = b instanceof Uint8Array ? b : new Uint8Array(b);
  if (u[0] === 0xff && u[1] === 0xfe) return new TextDecoder('utf-16le').decode(u.subarray(2));
  if (u[0] === 0xfe && u[1] === 0xff) return new TextDecoder('utf-16be').decode(u.subarray(2));
  try { return new TextDecoder('utf-8', { fatal: true }).decode(u); } catch { return new TextDecoder('windows-1252').decode(u); }
}

/** Os espaços juntos e as linhas em branco repetidas fora; o tamanho máximo. */
const arrumar = (s) => String(s || '').replace(/\r\n?/g, '\n').replace(/[ \t\f\v ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_TEXTO);

/** As partes de um zip (o .docx, o .xlsx e o .odt são zips) cujo nome passa no teste: { nome: texto }. */
function partesDoZip(bytes, quer) {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength), { lazyEntries: true }, (e, zip) => {
      if (e) return reject(e);
      const partes = {};
      let total = 0;
      zip.on('error', reject);
      zip.on('end', () => resolve(partes));
      zip.on('entry', (ent) => {
        if (!quer(ent.fileName)) return zip.readEntry();
        total += ent.uncompressedSize;
        if (ent.uncompressedSize > ENTRADA_MAX || total > 4 * ENTRADA_MAX) { zip.close(); return reject(new Error('grande')); }
        zip.openReadStream(ent, (e2, fluxo) => {
          if (e2) return reject(e2);
          const pedacos = [];
          let n = 0;
          fluxo.on('data', (b) => { n += b.length; if (n > ENTRADA_MAX) { fluxo.destroy(); zip.close(); reject(new Error('grande')); } else pedacos.push(b); });
          fluxo.on('error', reject);
          fluxo.on('end', () => { partes[ent.fileName] = Buffer.concat(pedacos).toString('utf8'); zip.readEntry(); });
        });
      });
      zip.readEntry();
    });
  });
}

/** O texto de um XML de documento, com uma quebra no fim de cada parágrafo, linha ou célula. */
const textoDeXml = (xml, fins) => textoXml(String(xml || '').replace(fins, '$&\n'));

const porNumero = (a, b) => Number((/(\d+)\.xml$/.exec(a) || [0, 0])[1]) - Number((/(\d+)\.xml$/.exec(b) || [0, 0])[1]);

/** O texto de um RTF, sem os comandos (o bastante para a busca). */
function textoRtf(s) {
  // As tabelas de fontes e de cores, os estilos e as imagens não são texto (com um nível de grupos dentro).
  return s.replace(/\{\\(?:\*\\)?(fonttbl|colortbl|stylesheet|info|pict|header|footer|listtable|listoverridetable)\b[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '')
    .replace(/\\'([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u(-?\d+)\??/g, (_, n) => String.fromCharCode((Number(n) + 65536) % 65536))
    .replace(/\\(par|line|tab)\b ?/g, '\n')
    .replace(/\{\\\*[^{}]*\}/g, '')
    .replace(/\\[a-z]+-?\d* ?/gi, '')
    .replace(/[{}]/g, '');
}

let pdfjs = null;
async function textoPdf(bytes) {
  if (!pdfjs) {
    pdfjs = await import('pdfjs-dist/legacy/build/pdf.min.mjs');
    // No Node, o "worker" roda aqui mesmo: o compactado, ao lado (o instalador só leva os dois).
    pdfjs.GlobalWorkerOptions.workerSrc = './pdf.worker.min.mjs';
  }
  // Os mapas de caracteres e as fontes padrão vêm do próprio pdfjs-dist (os PDFs com fontes CID).
  const raiz = path.dirname(require.resolve('pdfjs-dist/package.json'));
  const tarefa = pdfjs.getDocument({
    data: new Uint8Array(bytes), isEvalSupported: false, disableFontFace: true, useSystemFonts: false, verbosity: 0,
    cMapUrl: path.join(raiz, 'cmaps') + path.sep, cMapPacked: true, standardFontDataUrl: path.join(raiz, 'standard_fonts') + path.sep,
  });
  try {
    const doc = await tarefa.promise;
    const partes = [];
    let total = 0;
    for (let i = 1; i <= Math.min(doc.numPages, PAGINAS_MAX) && total < MAX_TEXTO; i++) {
      const p = await doc.getPage(i);
      const c = await p.getTextContent();
      const t = c.items.map((x) => (x.str || '') + (x.hasEOL ? '\n' : '')).join('');
      partes.push(t);
      total += t.length;
      p.cleanup();
    }
    return partes.join('\n\n');
  } finally {
    await tarefa.destroy().catch(() => { });
  }
}

/** O texto de um arquivo pelos bytes e pela extensão (sem o ponto). Uma extensão sem texto dá "". */
async function extrair(bytes, ext) {
  ext = String(ext || '').toLowerCase();
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (TEXTOS.has(ext)) return arrumar(decodificar(b.subarray(0, MAX_TEXTO * 4)));
  if (ext === 'html' || ext === 'htm') {
    return arrumar(textoXml(decodificar(b).replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr)\b[^>]*>/gi, '$&\n')));
  }
  if (ext === 'rtf') return arrumar(textoRtf(decodificar(b)));
  if (ext === 'docx') {
    const mammoth = require('mammoth');
    return arrumar((await mammoth.extractRawText({ buffer: Buffer.from(b.buffer, b.byteOffset, b.byteLength) })).value);
  }
  if (ext === 'odt' || ext === 'ods' || ext === 'odp') {
    const p = await partesDoZip(b, (n) => n === 'content.xml');
    return arrumar(textoDeXml(p['content.xml'], /<\/text:(p|h)>|<text:line-break\/>|<\/table:table-cell>/g));
  }
  if (ext === 'xlsx') {
    const p = await partesDoZip(b, (n) => n === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
    // As células de texto ficam na lista compartilhada; as escritas na própria folha, nela.
    const folhas = Object.keys(p).filter((n) => n.startsWith('xl/worksheets/')).sort(porNumero)
      .map((n) => (p[n].match(/<is>[\s\S]*?<\/is>/g) || []).join('\n'));
    return arrumar([textoDeXml(p['xl/sharedStrings.xml'], /<\/si>/g), ...folhas.map((x) => textoDeXml(x, /<\/is>/g))].join('\n'));
  }
  if (ext === 'pptx') {
    const p = await partesDoZip(b, (n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
    return arrumar(Object.keys(p).sort(porNumero).map((n) => textoDeXml(p[n], /<\/a:p>/g)).join('\n\n'));
  }
  if (ext === 'pdf') return arrumar(await textoPdf(b));
  return '';
}

module.exports = { extrair, decodificar, arrumar, textoRtf, EXTS, MAX_TEXTO };
