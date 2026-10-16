/*
 * O que o painel de visualização do Explorador precisa ler no processo principal: o Word (.docx,
 * pelo mammoth, que o transforma em HTML simples), as planilhas (.xlsx e .ods: a primeira folha,
 * como uma tabela) e o texto do OpenDocument (.odt: os títulos e os parágrafos). Só para ver: nada
 * é gravado, e os arquivos grandes ficam de fora.
 */
const fsp = require('fs/promises');
const yauzl = require('yauzl');
const { tr } = require('./idioma');

const TAMANHO_MAX = 40 * 1024 * 1024; // o arquivo
const ENTRADA_MAX = 30 * 1024 * 1024; // cada parte de dentro, já descompactada
const LINHAS_MAX = 200;
const COLUNAS_MAX = 40;

async function conferirTamanho(arquivo) {
  const st = await fsp.stat(arquivo);
  if (st.size > TAMANHO_MAX) throw new Error('grande');
}

/** As partes pedidas de um arquivo zip (o .docx, o .xlsx e o .odt são zips): { nome: Buffer }. */
function lerPartes(arquivo, nomes) {
  const quero = new Set(nomes);
  return new Promise((resolve, reject) => {
    yauzl.open(arquivo, { lazyEntries: true }, (e, zip) => {
      if (e) return reject(e);
      const partes = {};
      zip.on('error', reject);
      zip.on('end', () => resolve(partes));
      zip.on('entry', (ent) => {
        if (!quero.has(ent.fileName)) return zip.readEntry();
        if (ent.uncompressedSize > ENTRADA_MAX) { zip.close(); return reject(new Error('grande')); }
        zip.openReadStream(ent, (e2, fluxo) => {
          if (e2) return reject(e2);
          const pedacos = [];
          let total = 0;
          fluxo.on('data', (b) => {
            total += b.length;
            if (total > ENTRADA_MAX) { fluxo.destroy(); zip.close(); reject(new Error('grande')); } else pedacos.push(b);
          });
          fluxo.on('error', reject);
          fluxo.on('end', () => { partes[ent.fileName] = Buffer.concat(pedacos).toString('utf8'); zip.readEntry(); });
        });
      });
      zip.readEntry();
    });
  });
}

/** O texto de um trecho de XML: sem as marcas e com as entidades trocadas. */
function textoXml(s) {
  return String(s || '').replace(/<[^>]*>/g, '').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e) => {
    const k = e.toLowerCase();
    if (k === 'amp') return '&';
    if (k === 'lt') return '<';
    if (k === 'gt') return '>';
    if (k === 'quot') return '"';
    if (k === 'apos') return "'";
    const n = k.startsWith('#x') ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
    try { return String.fromCodePoint(n); } catch { return ''; }
  });
}

/** O valor de um atributo de uma marca (o nome pode ter prefixo, como "table:name"). */
function atributo(marca, nome) {
  const m = new RegExp('\\s' + nome.replace(/[.:]/g, '\\$&') + '="([^"]*)"').exec(marca);
  return m ? textoXml(m[1]) : null;
}

/** "B3" → 1 (a coluna, a partir de zero). */
function colunaDe(ref) {
  const letras = /^[A-Z]+/i.exec(ref || '');
  if (!letras) return -1;
  let n = 0;
  for (const c of letras[0].toUpperCase()) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

/** Tira as colunas e as linhas vazias do fim (as planilhas costumam ter muitas). */
function aparar(linhas) {
  while (linhas.length && linhas[linhas.length - 1].every((c) => c === '')) linhas.pop();
  let largura = 0;
  for (const l of linhas) {
    let k = l.length;
    while (k > 0 && l[k - 1] === '') k--;
    largura = Math.max(largura, k);
  }
  return linhas.map((l) => { const r = l.slice(0, largura); while (r.length < largura) r.push(''); return r; });
}

/** A primeira folha de um .xlsx: { folha, linhas: [[texto]], mais }. */
function lerXlsx(partes) {
  const comp = partes['xl/sharedStrings.xml'] || '';
  const compartilhados = [...comp.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => textoXml(
    // O texto pode vir em pedaços (<r><t>…</t></r>); a pronúncia do japonês (<rPh>) fica de fora.
    m[1].replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').match(/<t\b[^>]*>[\s\S]*?<\/t>/g)?.join('') || ''));
  const livro = partes['xl/workbook.xml'] || '';
  const primeira = /<sheet\b[^>]*>/.exec(livro);
  const folha = primeira ? atributo(primeira[0], 'name') : '';
  const id = primeira ? atributo(primeira[0], 'r:id') : null;
  const rels = partes['xl/_rels/workbook.xml.rels'] || '';
  let alvo = 'xl/worksheets/sheet1.xml';
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    if (id && atributo(m[0], 'Id') === id) {
      const t = atributo(m[0], 'Target') || '';
      alvo = t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, '');
    }
  }
  return { folha, alvo, compartilhados };
}

function linhasXlsx(xml, compartilhados) {
  const linhas = [];
  let mais = false;
  for (const r of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>|<row\b[^>]*\/>/g)) {
    const num = Number(atributo('<row' + (r[1] || '') + '>', 'r')) || linhas.length + 1;
    if (num > LINHAS_MAX) { mais = true; break; }
    const linha = [];
    for (const c of (r[2] || '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const marca = '<c' + c[1] + '>';
      let col = colunaDe(atributo(marca, 'r'));
      if (col < 0) col = linha.length;
      if (col >= COLUNAS_MAX) { mais = true; continue; }
      const tipo = atributo(marca, 't');
      const dentro = c[2] || '';
      const v = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(dentro);
      let texto = '';
      if (tipo === 's') texto = compartilhados[Number(v && v[1])] || '';
      else if (tipo === 'inlineStr') texto = textoXml((dentro.match(/<t\b[^>]*>[\s\S]*?<\/t>/g) || []).join(''));
      else if (tipo === 'b') texto = v && v[1] === '1' ? tr('VERDADEIRO') : tr('FALSO');
      else texto = v ? textoXml(v[1]) : '';
      linha[col] = texto;
    }
    while (linhas.length < num - 1) linhas.push([]);
    linhas.push(Array.from(linha, (x) => x || ''));
  }
  return { linhas, mais };
}

/** A primeira folha de um .ods (o content.xml do OpenDocument). */
function linhasOds(xml) {
  const tabela = /<table:table\b([^>]*)>([\s\S]*?)<\/table:table>/.exec(xml);
  if (!tabela) return { folha: '', linhas: [], mais: false };
  const folha = atributo('<t' + tabela[1] + '>', 'table:name') || '';
  const linhas = [];
  let mais = false;
  for (const r of tabela[2].matchAll(/<table:table-row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/table:table-row>)/g)) {
    const repete = Math.min(Number(atributo('<r' + r[1] + '>', 'table:number-rows-repeated')) || 1, LINHAS_MAX);
    const linha = [];
    for (const c of (r[2] || '').matchAll(/<table:(?:covered-)?table-cell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/table:(?:covered-)?table-cell>)/g)) {
      const vezes = Number(atributo('<c' + c[1] + '>', 'table:number-columns-repeated')) || 1;
      const texto = (c[2] || '').match(/<text:p\b[^>]*>[\s\S]*?<\/text:p>|<text:p\b[^>]*\/>/g)?.map((p) => textoXml(p.replace(/<text:s\b[^>]*\/>/g, ' ').replace(/<text:tab\b[^>]*\/>/g, '\t'))).join('\n') || '';
      for (let k = 0; k < vezes; k++) {
        if (linha.length >= COLUNAS_MAX) { if (texto) mais = true; break; }
        linha.push(texto);
      }
    }
    for (let k = 0; k < repete; k++) {
      if (linhas.length >= LINHAS_MAX) { mais = mais || linha.some((x) => x); break; }
      linhas.push(linha.slice());
    }
    if (linhas.length >= LINHAS_MAX) break;
  }
  return { folha, linhas, mais };
}

/** Os títulos e os parágrafos de um .odt: [{ titulo: boolean, texto }]. */
function paragrafosOdt(xml) {
  const corpo = /<office:text\b[^>]*>([\s\S]*)<\/office:text>/.exec(xml);
  const lista = [];
  for (const m of (corpo ? corpo[1] : '').matchAll(/<text:(h|p)\b[^>]*?(?:\/>|>([\s\S]*?)<\/text:\1>)/g)) {
    const texto = textoXml((m[2] || '').replace(/<text:s\b[^>]*\/>/g, ' ').replace(/<text:tab\b[^>]*\/>/g, '\t').replace(/<text:line-break\b[^>]*\/>/g, '\n'));
    lista.push({ titulo: m[1] === 'h', texto });
    if (lista.length >= 2000) break;
  }
  return lista;
}

class Visualizador {
  async docx(arquivo) {
    await conferirTamanho(arquivo);
    const mammoth = require('mammoth');
    const r = await mammoth.convertToHtml({ buffer: await fsp.readFile(arquivo) });
    return r.value;
  }

  /** A primeira folha de uma planilha: { folha, linhas, mais }. */
  async planilha(arquivo, ext) {
    await conferirTamanho(arquivo);
    if (ext === 'ods') {
      const partes = await lerPartes(arquivo, ['content.xml']);
      const r = linhasOds(partes['content.xml'] || '');
      return { ...r, linhas: aparar(r.linhas) };
    }
    const inicio = await lerPartes(arquivo, ['xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/sharedStrings.xml']);
    const { folha, alvo, compartilhados } = lerXlsx(inicio);
    const xml = (await lerPartes(arquivo, [alvo]))[alvo] || '';
    const { linhas, mais } = linhasXlsx(xml, compartilhados);
    return { folha, linhas: aparar(linhas), mais };
  }

  async odt(arquivo) {
    await conferirTamanho(arquivo);
    const partes = await lerPartes(arquivo, ['content.xml']);
    return paragrafosOdt(partes['content.xml'] || '');
  }
}

module.exports = { Visualizador, textoXml, colunaDe, lerXlsx, linhasXlsx, linhasOds, paragrafosOdt, aparar, LINHAS_MAX, COLUNAS_MAX };
