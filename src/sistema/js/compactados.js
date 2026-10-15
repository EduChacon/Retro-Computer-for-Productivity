/*
 * As pastas compactadas na área de trabalho: um .zip abre como uma pasta (só para ver) no
 * Explorador ('::zip:<arquivo>/<pasta de dentro>'); "Extrair tudo" cria uma pasta nova ao
 * lado; "Enviar para › Pasta compactada" faz um .zip novo. Quem mexe nos arquivos é o
 * processo principal (compactados.js de lá); nada é apagado nem gravado por cima.
 */
import { nomeDe, paiDe, extensao, caminhoTela } from './util.js';
import { abrir, abrirArquivo, avisar } from './sistema.js';
import { confirmar, erro } from './dialogos.js';
import { tr } from './idioma.js';

export const ehZip = (nome) => extensao(nome) === 'zip';
export const ehTar = (nome) => /\.(tar|tar\.gz|tgz|tar\.xz|txz|tar\.bz2|tbz2?)$/i.test(String(nome));
export const ehCompactado = (nome) => ehZip(nome) || ehTar(nome);

export const pastaDoZip = (rel, dentro = '') => `::zip:${encodeURIComponent(rel)}${dentro ? '/' + dentro : ''}`;

/** '::zip:<arquivo>/<dentro>' → { rel, dentro } (ou null se não é de um .zip). */
export function lerPastaZip(pasta) {
  const m = /^::zip:([^/]*)\/?(.*)$/.exec(pasta || '');
  return m ? { rel: decodeURIComponent(m[1]), dentro: m[2] } : null;
}

/** O que há numa pasta de dentro do .zip: os itens de primeiro nível dela. */
export async function itensDoZip(rel, dentro = '') {
  const todos = await retro.compactados.listar(rel);
  const prefixo = dentro ? dentro + '/' : '';
  return todos.filter((i) => i.nome.startsWith(prefixo) && i.nome.length > prefixo.length && !i.nome.slice(prefixo.length).includes('/'));
}

/**
 * Extrai tudo numa pasta nova ao lado do pacote. Devolve { pasta, retirada } (retirada: a pasta
 * única de dentro do pacote, que virou a própria pasta nova) ou null.
 */
export async function extrairTudo(rel, { avisarFim = true } = {}) {
  try {
    const r = await retro.compactados.extrair(rel);
    const { pasta } = r;
    if (avisarFim) {
      avisar(tr('Extração concluída'), tr('Os arquivos de {nome} estão em {pasta}.', { nome: nomeDe(rel), pasta: caminhoTela(pasta) }), {
        icone: 'compactado', som: null, aoClicar: () => abrir('explorador', { pasta }),
      });
    }
    return r;
  } catch (e) {
    erro(tr('Não foi possível extrair {nome}: {erro}', { nome: nomeDe(rel), erro: e.message }));
    return null;
  }
}

/** Extrai e abre a pasta nova numa janela. */
export async function extrairEMostrar(rel) {
  const r = await extrairTudo(rel, { avisarFim: false });
  if (r) abrir('explorador', { pasta: r.pasta });
  return r;
}

/** Abrir um arquivo de dentro do .zip: os programas abrem do disco, então o pacote é extraído antes. */
export async function abrirDoZip(rel, nome) {
  const ok = await confirmar(tr('Para abrir {arquivo}, a pasta compactada precisa ser extraída.\n\nExtrair tudo agora para uma pasta nova ao lado de {nome}?', { arquivo: nomeDe(nome), nome: nomeDe(rel) }), { titulo: tr('Pasta compactada'), sim: tr('E&xtrair'), nao: tr('Cancelar') });
  if (!ok) return;
  const r = await extrairTudo(rel, { avisarFim: false });
  if (!r) return;
  const dentro = r.retirada && nome.startsWith(r.retirada + '/') ? nome.slice(r.retirada.length + 1) : nome;
  abrirArquivo(`${r.pasta}/${dentro}`);
}

/** Um .tar não abre como pasta: só extrair. */
export async function abrirTar(rel) {
  const ok = await confirmar(tr('{nome} é um arquivo compactado. Extrair tudo para uma pasta nova ao lado dele?', { nome: nomeDe(rel) }), { titulo: tr('Arquivo compactado'), sim: tr('E&xtrair'), nao: tr('Cancelar') });
  if (ok) extrairEMostrar(rel);
}

/** Enviar para › Pasta compactada: um .zip novo ao lado do primeiro item. */
export async function compactarItens(rels) {
  try {
    const zip = await retro.compactados.compactar(rels);
    avisar(tr('Pasta compactada criada'), caminhoTela(zip), { icone: 'compactado', som: null, aoClicar: () => abrir('explorador', { pasta: paiDe(zip), selecionar: zip }) });
    return zip;
  } catch (e) {
    erro(tr('Não foi possível compactar: {erro}', { erro: e.message }));
    return null;
  }
}
