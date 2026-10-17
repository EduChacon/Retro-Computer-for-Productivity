/*
 * As ferramentas de PDF (combinar, separar, extrair páginas, girar e marcar), com o pdf-lib, sobre os bytes:
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
const { PDFDocument, degrees, PageSizes, PDFName, PDFArray, PDFDict, PDFRef, PDFHexString, PDFString } = require('pdf-lib');

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

/** Quantas páginas tem, se tem senha e se tem assinatura digital, sem mudar nada. */
async function info(bytes) {
  try {
    const doc = await abrir(bytes);
    return { paginas: doc.getPageCount(), senha: false, assinado: assinado(doc) };
  } catch (e) {
    if (e.codigo === 'senha') return { paginas: 0, senha: true, assinado: false };
    throw e;
  }
}

/**
 * Se há uma assinatura digital preenchida (um campo /Sig com o /V): gravar o PDF de novo (o pdf-lib
 * reescreve o arquivo inteiro) faz a assinatura deixar de valer, e a tela avisa antes.
 */
function assinado(doc) {
  try {
    const form = doc.catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict);
    const campos = form && form.lookupMaybe(PDFName.of('Fields'), PDFArray);
    const pilha = campos ? campos.asArray().slice() : [];
    for (let n = 0; pilha.length && n < 20000; n++) {
      const c = doc.context.lookup(pilha.pop());
      if (!(c instanceof PDFDict)) continue;
      const ft = c.lookup(PDFName.of('FT'));
      if (ft === PDFName.of('Sig') && c.get(PDFName.of('V'))) return true;
      const filhos = c.lookupMaybe(PDFName.of('Kids'), PDFArray);
      if (filhos) pilha.push(...filhos.asArray());
    }
  } catch { /* um formulário malfeito não é uma assinatura */ }
  return false;
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

/* ---------- Marcar: os destaques e as notas ---------- */

// As cores das marcas (a tela escolhe pelo nome; a conta fica aqui).
const CORES = {
  amarelo: [1, 0.92, 0.23],
  verde: [0.56, 0.89, 0.42],
  azul: [0.47, 0.78, 1],
  rosa: [1, 0.62, 0.8],
};
const MAX_MARCAS = 5000;
const MAX_QUADS = 400;
const MAX_TEXTO = 20000;
const NOTA = 20; // o tamanho do ícone da nota, em pontos do PDF
// Só estes tipos de anotação podem sair (nunca um campo, uma assinatura ou um link).
const TIPOS_REMOVIVEIS = ['Highlight', 'Text'].map((n) => PDFName.of(n));

const numero = (v) => { const n = Number(v); if (!Number.isFinite(n) || Math.abs(n) > 1e6) throw erro('vazio', 'número'); return Math.round(n * 1000) / 1000; };
const fmt = (n) => String(Math.round(n * 1000) / 1000);
const corDe = (nome) => CORES[nome] || CORES.amarelo;
const textoPdf = (s) => PDFHexString.fromText(String(s || '').slice(0, MAX_TEXTO));

/** A referência de uma anotação pelo id do pdf.js ("12R" ou "12R3"), ou null. */
function refDe(id) {
  const m = /^(\d{1,9})R(\d{0,5})$/.exec(String(id || ''));
  return m ? PDFRef.of(Number(m[1]), m[2] ? Number(m[2]) : 0) : null;
}

/** O desenho (a aparência) do destaque: os retângulos de cada trecho, misturados ao texto (Multiply). */
function aparenciaDestaque(ctx, quads, rect, cor) {
  const [r, g, b] = cor;
  let ops = `/GS0 gs ${fmt(r)} ${fmt(g)} ${fmt(b)} rg\n`;
  for (const q of quads) {
    // QuadPoints: em cima à esquerda, em cima à direita, embaixo à esquerda, embaixo à direita.
    ops += `${fmt(q[0])} ${fmt(q[1])} m ${fmt(q[2])} ${fmt(q[3])} l ${fmt(q[6])} ${fmt(q[7])} l ${fmt(q[4])} ${fmt(q[5])} l h f\n`;
  }
  return ctx.register(ctx.stream(ops, {
    Type: 'XObject', Subtype: 'Form', BBox: rect,
    Resources: { ExtGState: { GS0: { Type: 'ExtGState', BM: 'Multiply', CA: 1, ca: 1 } } },
  }));
}

/** O desenho da nota: um papelzinho com a ponta dobrada e três linhas (desenho próprio). */
function aparenciaNota(ctx, x, y, cor) {
  const [r, g, b] = cor;
  const s = NOTA;
  const d = 6; // a ponta dobrada
  const ops = [
    `${fmt(r)} ${fmt(g)} ${fmt(b)} rg 0 0 0 RG 1 w`,
    `${x + 0.5} ${y + 0.5} m ${x + s - d} ${y + 0.5} l ${x + s - 0.5} ${y + d} l ${x + s - 0.5} ${y + s - 0.5} l ${x + 0.5} ${y + s - 0.5} l h B`,
    `${fmt(r * 0.75)} ${fmt(g * 0.75)} ${fmt(b * 0.75)} rg ${x + s - d} ${y + 0.5} m ${x + s - d} ${y + d} l ${x + s - 0.5} ${y + d} l h B`,
    `0.3 0.3 0.3 RG`,
    `${x + 4} ${y + 14} m ${x + s - 4} ${y + 14} l S`,
    `${x + 4} ${y + 10.5} m ${x + s - 4} ${y + 10.5} l S`,
    `${x + 4} ${y + 7} m ${x + s - d - 2} ${y + 7} l S`,
  ].join('\n');
  return ctx.register(ctx.stream(ops, { Type: 'XObject', Subtype: 'Form', BBox: [x, y, x + s, y + s] }));
}

/** As anotações da página, sem normalizar a página (o pdf-lib embrulharia o conteúdo dela em q/Q). */
function anotacoesDa(pagina, ctx) {
  let annots = pagina.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
  if (!annots) {
    annots = ctx.obj([]);
    pagina.node.set(PDFName.of('Annots'), annots);
  }
  return annots;
}

/**
 * Grava as marcas no PDF: adicionar [{ tipo: 'destaque', pagina, quads: [[8 números]], cor, texto }
 * ou { tipo: 'nota', pagina, x, y, cor, texto }] (em pontos do PDF; x e y, o canto de cima à esquerda
 * da nota) e remover [{ pagina, id }] (o id do pdf.js; só destaques e notas saem). autor: o nome
 * que vai no /T. Devolve os bytes do PDF novo.
 */
async function marcar(bytes, { adicionar = [], remover = [], autor = '' } = {}) {
  if (!Array.isArray(adicionar) || !Array.isArray(remover)) throw erro('vazio');
  if (!adicionar.length && !remover.length) throw erro('vazio');
  if (adicionar.length + remover.length > MAX_MARCAS) throw erro('vazio', 'marcas demais');
  const doc = await abrir(bytes);
  const ctx = doc.context;
  const paginas = doc.getPages();
  const pagina = (i) => {
    const n = Number(i);
    if (!Number.isInteger(n) || n < 0 || n >= paginas.length) throw erro('intervalo', String(i));
    return paginas[n];
  };
  // Primeiro saem as apagadas (uma marca mudada é uma removida e uma nova).
  for (const r of remover) {
    const ref = refDe(r && r.id);
    if (!ref) continue;
    const p = pagina(r.pagina);
    const annots = p.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
    if (!annots) continue;
    const i = annots.asArray().findIndex((a) => a instanceof PDFRef && a.objectNumber === ref.objectNumber && a.generationNumber === ref.generationNumber);
    if (i < 0) continue;
    const anot = ctx.lookupMaybe(ref, PDFDict);
    const tipo = anot && anot.lookup(PDFName.of('Subtype'));
    if (!TIPOS_REMOVIVEIS.includes(tipo)) continue;
    annots.remove(i);
    // A janelinha do comentário (o /Popup) sai junto.
    const popup = anot.get(PDFName.of('Popup'));
    if (popup instanceof PDFRef) {
      const j = annots.asArray().findIndex((a) => a instanceof PDFRef && a.objectNumber === popup.objectNumber && a.generationNumber === popup.generationNumber);
      if (j >= 0) annots.remove(j);
      ctx.delete(popup);
    }
    ctx.delete(ref);
  }
  const agora = PDFString.fromDate(new Date());
  const t = textoPdf(String(autor || '').slice(0, 120));
  for (const m of adicionar) {
    if (!m || typeof m !== 'object') continue;
    const p = pagina(m.pagina);
    const cor = corDe(m.cor);
    let dict;
    if (m.tipo === 'destaque') {
      if (!Array.isArray(m.quads) || !m.quads.length || m.quads.length > MAX_QUADS) throw erro('vazio', 'trechos');
      const quads = m.quads.map((q) => {
        if (!Array.isArray(q) || q.length !== 8) throw erro('vazio', 'trecho');
        return q.map(numero);
      });
      const xs = quads.flatMap((q) => [q[0], q[2], q[4], q[6]]);
      const ys = quads.flatMap((q) => [q[1], q[3], q[5], q[7]]);
      const rect = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
      dict = ctx.obj({
        Type: 'Annot', Subtype: 'Highlight', Rect: rect, QuadPoints: quads.flat(), C: cor, F: 4,
        P: p.ref, M: agora, T: t, Contents: textoPdf(m.texto),
        AP: { N: aparenciaDestaque(ctx, quads, rect, cor) },
      });
    } else if (m.tipo === 'nota') {
      const x = numero(m.x);
      const y = numero(m.y) - NOTA;
      dict = ctx.obj({
        Type: 'Annot', Subtype: 'Text', Rect: [x, y, x + NOTA, y + NOTA], C: cor, F: 4, Name: 'Comment', Open: false,
        P: p.ref, M: agora, T: t, Contents: textoPdf(m.texto),
        AP: { N: aparenciaNota(ctx, x, y, cor) },
      });
    } else {
      throw erro('vazio', 'tipo');
    }
    anotacoesDa(p, ctx).push(ctx.register(dict));
  }
  doc.setModificationDate(new Date());
  return doc.save({ useObjectStreams: true });
}

module.exports = { info, combinar, extrair, separar, girar, marcar, assinado, lerIntervalo, paginaDaImagem, CORES, MAX_PAGINAS };
