/*
 * As ferramentas de PDF (combinar, separar, extrair páginas e girar), com o pdf-lib, sobre os bytes:
 * não lê nem grava o disco (quem grava é o processo principal, pelo Disco). Roda no processo de
 * trabalho (trabalho-processo.js), longe da janela, e também no Node, para os testes.
 *
 * Os erros levam um código (err.codigo), que o processo principal traduz:
 *   senha      o PDF tem senha ou está protegido (o pdf-lib não o decifra, e a cópia sairia ilegível)
 *   invalido   o arquivo não é um PDF que se possa ler
 *   imagem     a imagem não pôde ser lida
 *   intervalo  as páginas pedidas não existem
 *   vazio      nada a fazer
 */
'use strict';
const { PDFDocument, degrees, PageSizes } = require('pdf-lib');

const MAX_PAGINAS = 5000;

function erro(codigo, extra = '') {
  const e = new Error(codigo + (extra ? ': ' + extra : ''));
  e.codigo = codigo;
  return e;
}

/** O PDF lido dos bytes, ou o erro com o código certo. */
async function abrir(bytes) {
  let doc;
  try {
    // A proteção é conferida logo abaixo (o erro próprio do pdf-lib não passa no instanceof).
    doc = await PDFDocument.load(bytes, { updateMetadata: false, ignoreEncryption: true });
  } catch (e) {
    throw erro('invalido', e && e.message);
  }
  if (doc.isEncrypted) throw erro('senha');
  const n = doc.getPageCount();
  if (n > MAX_PAGINAS) throw erro('invalido', 'páginas demais');
  return doc;
}

/**
 * Os bytes num buffer só deles. O pdf-lib lê o JPEG por "bytes.buffer" (sem o deslocamento da vista), e
 * os bytes que chegam pelas mensagens às vezes são uma vista no meio de um buffer maior.
 */
const proprio = (b) => (b instanceof Uint8Array && b.byteOffset === 0 && b.byteLength === b.buffer.byteLength ? b : new Uint8Array(b));

/** Quem fez: o Retro Computer, sem o "pdf-lib" no lugar do programa. */
function marcarAutor(doc) {
  doc.setProducer('Retro Computer');
  doc.setCreator('Retro Computer');
  doc.setModificationDate(new Date());
}

const salvar = (doc) => doc.save({ useObjectStreams: true });

/** Quantas páginas tem (e se tem senha), sem mudar nada. */
async function info(bytes) {
  try {
    const doc = await abrir(bytes);
    return { paginas: doc.getPageCount(), senha: false };
  } catch (e) {
    if (e.codigo === 'senha') return { paginas: 0, senha: true };
    throw e;
  }
}

/** O tamanho da página de uma imagem: a imagem inteira, sem margem, dentro do papel (deitado se ela for larga). */
function paginaDaImagem(w, h, papel) {
  const [pw, ph] = w > h ? [papel[1], papel[0]] : papel;
  const k = Math.min(pw / w, ph / h);
  return [w * k, h * k];
}

/**
 * Um PDF só, com os PDFs e as imagens na ordem da lista: [{ tipo: 'pdf' | 'jpg' | 'png', bytes }].
 * papel: 'A4' ou 'Letter' (o tamanho máximo das páginas das imagens).
 */
async function combinar(itens, { papel = 'A4' } = {}) {
  if (!Array.isArray(itens) || !itens.length) throw erro('vazio');
  const tamanho = PageSizes[papel === 'Letter' ? 'Letter' : 'A4'];
  const saida = await PDFDocument.create();
  let total = 0;
  for (const [i, it] of itens.entries()) {
    try {
      total += await acrescentar(saida, it, tamanho);
    } catch (e) {
      // Qual arquivo da lista falhou (o processo principal põe o nome dele na mensagem).
      if (e.codigo) e.indice = i;
      throw e;
    }
    if (total > MAX_PAGINAS) throw erro('invalido', 'páginas demais');
  }
  marcarAutor(saida);
  return salvar(saida);
}

/** Um item da lista no fim do PDF; devolve quantas páginas entraram. */
async function acrescentar(saida, it, tamanho) {
  if (it.tipo === 'pdf') {
    const doc = await abrir(it.bytes);
    const paginas = await saida.copyPages(doc, doc.getPageIndices());
    for (const p of paginas) saida.addPage(p);
    return paginas.length;
  }
  if (it.tipo === 'jpg' || it.tipo === 'png') {
    let img;
    const bytes = proprio(it.bytes);
    try { img = it.tipo === 'jpg' ? await saida.embedJpg(bytes) : await saida.embedPng(bytes); } catch (e) { throw erro('imagem', e && e.message); }
    const [w, h] = paginaDaImagem(img.width, img.height, tamanho);
    const p = saida.addPage([w, h]);
    p.drawImage(img, { x: 0, y: 0, width: w, height: h });
    return 1;
  }
  throw erro('imagem', String(it.tipo));
}

/**
 * As páginas de um texto como "1-3, 5, 8-" (contadas de 1; "8-" vai até a última), em índices de 0,
 * na ordem escrita e sem repetir. Um número fora do PDF é erro.
 */
function lerIntervalo(texto, total) {
  const partes = String(texto || '').split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  if (!partes.length) throw erro('intervalo');
  const vistos = new Set();
  const saida = [];
  for (const p of partes) {
    const m = /^(\d+)\s*(?:[-–]\s*(\d*))?$/.exec(p);
    if (!m) throw erro('intervalo', p);
    const a = Number(m[1]);
    const b = m[2] === undefined ? a : (m[2] === '' ? total : Number(m[2]));
    if (a < 1 || b < 1 || a > total || b > total) throw erro('intervalo', p);
    const passo = a <= b ? 1 : -1;
    for (let i = a; passo > 0 ? i <= b : i >= b; i += passo) {
      if (!vistos.has(i)) { vistos.add(i); saida.push(i - 1); }
    }
  }
  return saida;
}

/** Um PDF novo só com as páginas pedidas (o texto do intervalo). */
async function extrair(bytes, intervalo) {
  const doc = await abrir(bytes);
  const indices = lerIntervalo(intervalo, doc.getPageCount());
  const saida = await PDFDocument.create();
  for (const p of await saida.copyPages(doc, indices)) saida.addPage(p);
  marcarAutor(saida);
  return salvar(saida);
}

/** Um PDF para cada página. */
async function separar(bytes) {
  const doc = await abrir(bytes);
  const lista = [];
  for (const i of doc.getPageIndices()) {
    const um = await PDFDocument.create();
    const [p] = await um.copyPages(doc, [i]);
    um.addPage(p);
    marcarAutor(um);
    lista.push(await salvar(um));
  }
  return lista;
}

/** Todas as páginas giradas (90 para a direita, -90 para a esquerda, 180). */
async function girar(bytes, graus) {
  const g = Number(graus);
  if (![90, -90, 180].includes(g)) throw erro('vazio');
  const doc = await abrir(bytes);
  for (const p of doc.getPages()) p.setRotation(degrees((((p.getRotation().angle + g) % 360) + 360) % 360));
  marcarAutor(doc);
  return salvar(doc);
}

module.exports = { info, combinar, extrair, separar, girar, lerIntervalo, paginaDaImagem, MAX_PAGINAS };
