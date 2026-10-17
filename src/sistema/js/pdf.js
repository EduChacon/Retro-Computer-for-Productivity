/*
 * As ferramentas de PDF do lado da tela: o que o botão direito do Explorador e a janela Ferramentas
 * de PDF chamam. O trabalho é do processo principal (src/principal/pdf.js); aqui ficam as caixas, os
 * nomes sugeridos e os avisos. O original nunca muda, a não ser no Girar (que guarda a versão de antes).
 */
import { caixaArquivo, entrada, erro } from './dialogos.js';
import { tr } from './idioma.js';
import { extensao, nomeDe, paiDe, semExtensao, urlDoDisco } from './util.js';
import { abrir, abrirArquivo, avisar } from './sistema.js';

/** Os PDFs e as imagens que entram num PDF (as de outros tipos são desenhadas em PNG pela tela). */
export const EXTS_DIRETAS = ['pdf', 'jpg', 'jpeg', 'png'];
export const EXTS_DESENHADAS = ['gif', 'webp', 'bmp', 'avif'];
export const entraNoPdf = (nome) => EXTS_DIRETAS.includes(extensao(nome)) || EXTS_DESENHADAS.includes(extensao(nome));
export const ehPdf = (nome) => extensao(nome) === 'pdf';

/** Um nome de arquivo a partir de um texto qualquer (sem os caracteres que um nome não aceita). */
export const limparNome = (s) => String(s || '').replace(/[\\/:*?"<>|\x00-\x1f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);

/** A caixa Salvar como, para o PDF do resultado; devolve o caminho terminado em .pdf, ou null. */
export async function escolherDestino(titulo, pasta, nome) {
  const rel = await caixaArquivo({
    modo: 'salvar', titulo, pasta, nome: (limparNome(semExtensao(nome)) || tr('Sem título')) + '.pdf',
    tipos: [{ rotulo: tr('Documento PDF (*.pdf)'), exts: ['pdf'] }],
  });
  if (!rel) return null;
  return /\.pdf$/i.test(rel) ? rel : rel + '.pdf';
}

/** Os bytes em PNG de uma imagem que o PDF não aceita direto (GIF, WebP, BMP, AVIF): o primeiro quadro. */
async function pngDe(rel) {
  const r = await fetch(urlDoDisco(rel));
  if (!r.ok) throw new Error(tr('A imagem "{nome}" não pôde ser lida.', { nome: nomeDe(rel) }));
  let bmp;
  try { bmp = await createImageBitmap(await r.blob()); } catch { throw new Error(tr('A imagem "{nome}" não pôde ser lida.', { nome: nomeDe(rel) })); }
  const c = document.createElement('canvas');
  c.width = bmp.width;
  c.height = bmp.height;
  c.getContext('2d').drawImage(bmp, 0, 0);
  bmp.close();
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}

/** Os itens para o processo principal: { rel } para PDF, JPG e PNG; { png, nome } para os outros. */
async function itensParaEnviar(rels) {
  const itens = [];
  for (const rel of rels) {
    if (EXTS_DESENHADAS.includes(extensao(rel))) itens.push({ png: await pngDe(rel), nome: nomeDe(rel) });
    else itens.push({ rel });
  }
  return itens;
}

function avisarPronto(titulo, rel) {
  avisar(titulo, nomeDe(rel), { icone: 'pdf', som: null, aoClicar: () => abrirArquivo(rel) });
}

/** Combina os arquivos (na ordem) num PDF; pergunta o nome, se não vier. Devolve o caminho, ou null. */
export async function combinar(rels, destino = null) {
  if (!rels.length) return null;
  const primeiro = rels[0];
  const rel = destino || await escolherDestino(tr('Combinar em um PDF'), paiDe(primeiro),
    rels.length > 1 ? tr('{nome} (combinado)', { nome: semExtensao(nomeDe(primeiro)) }) : semExtensao(nomeDe(primeiro)));
  if (!rel) return null;
  try {
    await retro.pdf.combinar(await itensParaEnviar(rels), rel);
  } catch (e) {
    erro(e.message, tr('Ferramentas de PDF'));
    return null;
  }
  avisarPronto(rels.length > 1 ? tr('PDF combinado') : tr('Convertido em PDF'), rel);
  return rel;
}

/** Um PDF por página, numa pasta nova ao lado. */
export async function separar(rel) {
  let r;
  try { r = await retro.pdf.separar(rel); } catch (e) { erro(e.message, tr('Ferramentas de PDF')); return null; }
  avisar(tr('Páginas separadas'), tr('{n} PDF(s) em "{pasta}".', { n: r.paginas, pasta: nomeDe(r.pasta) }), {
    icone: 'pdf', som: null, aoClicar: () => abrir('explorador', { pasta: r.pasta }),
  });
  return r;
}

/** As páginas de um PDF (null se não der para ler: a mensagem já foi mostrada). */
export async function paginasDe(rel) {
  const [i] = await retro.pdf.info([rel]).catch((e) => [{ erro: e.message }]);
  if (i.erro) { erro(i.erro, tr('Ferramentas de PDF')); return null; }
  if (i.senha) { erro(tr('"{nome}" tem senha ou está protegido contra mudanças, e não pode ser mudado aqui.', { nome: nomeDe(rel) }), tr('Ferramentas de PDF')); return null; }
  return i.paginas;
}

/** Pergunta as páginas ("1-3, 5") e o nome, e grava o PDF novo com elas. */
export async function extrair(rel) {
  const n = await paginasDe(rel);
  if (n == null) return null;
  const intervalo = await entrada({
    titulo: tr('Extrair páginas'), icone: 'pdf', larg: 380,
    texto: tr('Quais páginas vão para o PDF novo? Por exemplo: 1-3, 5 (este tem {n} página(s)).', { n }),
    valor: n > 1 ? `1-${n}` : '1',
  });
  if (!intervalo || !intervalo.trim()) return null;
  const destino = await escolherDestino(tr('Extrair páginas'), paiDe(rel),
    tr('{nome} (páginas {paginas})', { nome: semExtensao(nomeDe(rel)), paginas: intervalo.replace(/\s+/g, '') }));
  if (!destino) return null;
  try { await retro.pdf.extrair(rel, intervalo, destino); } catch (e) { erro(e.message, tr('Ferramentas de PDF')); return null; }
  avisarPronto(tr('Páginas extraídas'), destino);
  return destino;
}

/** Gira todas as páginas (grava por cima; a versão de antes fica em Versões anteriores). */
export async function girar(rel, graus) {
  try { await retro.pdf.girar(rel, graus); } catch (e) { erro(e.message, tr('Ferramentas de PDF')); return false; }
  avisar(tr('Páginas giradas'), nomeDe(rel), { icone: 'pdf', som: null, aoClicar: () => abrirArquivo(rel) });
  return true;
}

/** O submenu do botão direito do Explorador para os arquivos selecionados (ou null, sem nada para fazer). */
export function itensDoMenu(sel) {
  const arquivos = sel.filter((s) => !s.pasta && s.rel);
  if (!arquivos.length || arquivos.length !== sel.length || !arquivos.every((s) => entraNoPdf(s.nome))) return null;
  const rels = arquivos.map((s) => s.rel);
  const um = arquivos.length === 1 ? arquivos[0] : null;
  if (um && ehPdf(um.nome)) {
    return [
      { rotulo: tr('&Separar as páginas'), acao: () => separar(um.rel) },
      { rotulo: tr('E&xtrair páginas…'), acao: () => extrair(um.rel) },
      { separador: true },
      { rotulo: tr('Girar à &direita'), acao: () => girar(um.rel, 90) },
      { rotulo: tr('Girar à &esquerda'), acao: () => girar(um.rel, -90) },
      { rotulo: tr('Girar &180°'), acao: () => girar(um.rel, 180) },
      { separador: true },
      { rotulo: tr('&Combinar com outros arquivos…'), acao: () => abrir('pdf', { arquivos: rels }) },
    ];
  }
  if (um) {
    return [
      { rotulo: tr('C&onverter em PDF'), acao: () => combinar(rels) },
      { rotulo: tr('&Combinar com outros arquivos…'), acao: () => abrir('pdf', { arquivos: rels }) },
    ];
  }
  return [
    { rotulo: tr('&Combinar em um PDF…'), acao: () => combinar(rels) },
    { rotulo: tr('Combinar &na ordem que eu escolher…'), acao: () => abrir('pdf', { arquivos: rels }) },
  ];
}
