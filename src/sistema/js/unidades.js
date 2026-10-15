/*
 * Os pendrives e cartões de memória na área de trabalho: o nome de cada um, a pasta de
 * uma unidade no Meu computador ('::unidade:<id>/<caminho>'), levar e trazer arquivos,
 * remover com segurança e o aviso quando um chega. Quem mexe nos arquivos é o processo
 * principal (unidades.js de lá); nada é apagado nem gravado por cima.
 */
import { abrir, abrirArquivo, avisar, pastaDocs, estado } from './sistema.js';
import { erro } from './dialogos.js';
import { tr } from './idioma.js';

const conhecidas = new Map(); // id → a unidade (da última lista)

export function nomeUnidade(u) {
  if (!u) return tr('Disco removível');
  if (u.rotulo) return u.letra ? `${u.rotulo} (${u.letra})` : u.rotulo;
  return u.letra ? tr('Disco removível ({letra})', { letra: u.letra }) : tr('Disco removível');
}

export const pastaDaUnidade = (id, rel = '') => `::unidade:${encodeURIComponent(id)}${rel ? '/' + rel : ''}`;

/** '::unidade:<id>/<caminho>' → { id, rel } (ou null se não é de uma unidade). */
export function lerPastaUnidade(pasta) {
  const m = /^::unidade:([^/]*)\/?(.*)$/.exec(pasta || '');
  return m ? { id: decodeURIComponent(m[1]), rel: m[2] } : null;
}

export const unidadeConhecida = (id) => conhecidas.get(id) || null;

export async function listarUnidades() {
  const lista = await retro.unidades.listar().catch(() => []);
  for (const u of lista) conhecidas.set(u.id, u);
  return lista;
}

/** Leva arquivos do disco C: para a unidade (a raiz ou uma pasta dela). */
export async function levarParaUnidade(u, rels, destino = '') {
  try {
    const feitos = await retro.unidades.levar(u.id, rels, destino);
    if (feitos && feitos.length) avisar(tr('Copiado para {unidade}', { unidade: nomeUnidade(u) }), feitos.length === 1 ? feitos[0].split(/[\\/]/).pop() : tr('{n} itens copiados.', { n: feitos.length }), { icone: 'removivel', som: null });
  } catch (e) {
    erro(tr('Não foi possível copiar para {unidade}: {erro}', { unidade: nomeUnidade(u), erro: e.message }));
  }
}

/** Traz da unidade para uma pasta do disco C: (Meus documentos, se não disser qual). */
export async function trazerDaUnidade(id, rels, destino = pastaDocs()) {
  try {
    const feitos = await retro.unidades.trazer(id, rels, destino);
    return feitos || [];
  } catch (e) {
    erro(tr('Não foi possível copiar do disco removível: {erro}', { erro: e.message }));
    return [];
  }
}

/** O aviso depois de trazer: clicar abre a pasta com os arquivos selecionados. */
export function avisarTrazidos(feitos, pasta) {
  if (!feitos || !feitos.length) return;
  const onde = pasta ? pasta.replace(/\//g, '\\') : 'C:\\';
  avisar(tr('Copiado para {pasta}', { pasta: onde }), feitos.length === 1 ? feitos[0].nome || feitos[0].rel.split('/').pop() : tr('{n} itens copiados.', { n: feitos.length }), {
    icone: 'removivel', som: null,
    aoClicar: () => abrir('explorador', { pasta, selecionar: feitos[0].rel }),
  });
}

/**
 * Abrir um arquivo do pendrive: os programas abrem do disco C:, então ele é copiado para
 * Meus documentos › Recebidos e aberto de lá (o do pendrive fica como estava).
 */
export async function abrirDaUnidade(id, rel) {
  const nome = (estado.config.pastas && estado.config.pastas.recebidos) || tr('Recebidos');
  const destino = `${pastaDocs()}/${nome}`;
  await retro.disco.criarPasta(pastaDocs(), nome).catch(() => { }); // já existe: tudo bem
  const feitos = await trazerDaUnidade(id, [rel], destino);
  if (!feitos.length) return;
  avisar(tr('Copiado do disco removível'), tr('O arquivo foi copiado para {pasta}. Para levar a versão nova de volta, use Enviar para.', { pasta: destino.replace(/\//g, '\\') }), { icone: 'removivel', som: null, ms: 8000 });
  abrirArquivo(feitos[0].rel);
}

/** Remover com segurança: depois do "pode tirar", o pendrive sai da lista. */
export async function ejetarUnidade(u) {
  const r = await retro.unidades.ejetar(u.id).catch((e) => ({ ok: false, erro: e.message }));
  if (r.ok) return avisar(tr('Pode tirar {unidade}', { unidade: nomeUnidade(u) }), tr('O disco removível pode ser retirado com segurança.'), { icone: 'removivel' });
  erro(r.ocupado
    ? tr('{unidade} ainda está em uso. Feche os arquivos e as janelas dele e tente de novo.', { unidade: nomeUnidade(u) })
    : tr('Não foi possível remover {unidade}: {erro}', { unidade: nomeUnidade(u), erro: r.erro || '?' }));
}

/* O aviso de quando um pendrive chega, e a atualização das janelas do Meu computador. */
let ids = null;
listarUnidades().then((l) => { ids = new Set(l.map((u) => u.id)); });
retro.unidades.aoMudar((lista) => {
  for (const u of lista) conhecidas.set(u.id, u);
  const novos = lista.filter((u) => ids && !ids.has(u.id) && u.montada);
  ids = new Set(lista.map((u) => u.id));
  for (const u of novos) {
    avisar(tr('Disco removível conectado'), tr('{unidade}: clique para abrir.', { unidade: nomeUnidade(u) }), { icone: 'removivel', aoClicar: () => abrir('explorador', { pasta: pastaDaUnidade(u.id) }) });
  }
  document.dispatchEvent(new CustomEvent('retro-unidades', { detail: lista }));
});
