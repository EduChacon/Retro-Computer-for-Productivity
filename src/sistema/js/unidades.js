/*
 * Os pendrives e cartões de memória na área de trabalho: o nome de cada um, a pasta de
 * uma unidade no Meu computador ('::unidade:<id>/<caminho>'), levar e trazer arquivos,
 * remover com segurança e o aviso quando um chega. Quem mexe nos arquivos é o processo
 * principal (unidades.js de lá); nada é apagado nem gravado por cima.
 *
 * As pastas do computador principal (Meu computador › Computador principal: a área de trabalho,
 * os documentos, os downloads…) usam o mesmo caminho, com os ids 'pc:…', e o que ele manda
 * (o "Enviar para" do Windows, o ícone do Dock do Mac) chega em Meus documentos › Recebidos.
 *
 * As contas na nuvem conectadas (o Google Drive, o OneDrive e o Dropbox pelo rclone, no Linux) também:
 * os ids 'nuvem:…', o mesmo ver, trazer e levar; desconectar fica no lugar de remover com segurança.
 */
import { abrir, abrirArquivo, avisar, pastaDocs, estado } from './sistema.js';
import { erro } from './dialogos.js';
import { tr, marcar } from './idioma.js';
import { paiDe, nomeDe } from './util.js';

const conhecidas = new Map(); // id → a unidade (da última lista)

// Os nomes das pastas do computador principal (pelo id, no idioma do Retro Computer).
const NOMES_FORA = {
  mesa: marcar('Área de trabalho'), documentos: marcar('Documentos'), downloads: marcar('Downloads'),
  imagens: marcar('Imagens'), musicas: marcar('Músicas'), videos: marcar('Vídeos'),
};

export const ehDoComputador = (id) => String(id || '').startsWith('pc:');
export const ehDaNuvem = (id) => String(id || '').startsWith('nuvem:');
export const iconeUnidade = (u) => (u && u.icone) || 'removivel';

/** As pastas do computador principal (vazia no modo sistema e para quem as desligou). */
export async function listarPastasFora() {
  const lista = await retro.computador.pastas().catch(() => []);
  for (const u of lista) conhecidas.set(u.id, u);
  return lista;
}

/** As contas na nuvem conectadas agora (vazia fora do Linux). */
export async function listarNuvens() {
  const lista = await retro.nuvem.unidades().catch(() => []);
  for (const u of lista) conhecidas.set(u.id, u);
  return lista;
}

export function nomeUnidade(u) {
  if (u && u.tipo === 'pc') return NOMES_FORA[u.pasta] ? tr(NOMES_FORA[u.pasta]) : u.pasta;
  if (u && u.tipo === 'nuvem') return u.rotulo || u.servico;
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
    const titulo = u.tipo === 'pc' ? tr('Levado para o computador principal') : tr('Copiado para {unidade}', { unidade: nomeUnidade(u) });
    document.dispatchEvent(new CustomEvent('retro-unidade-copiou', { detail: { id: u.id } }));
    if (feitos && feitos.length) avisar(titulo, feitos.length === 1 ? feitos[0].split(/[\\/]/).pop() : tr('{n} itens copiados.', { n: feitos.length }), { icone: iconeUnidade(u), som: null });
  } catch (e) {
    erro(tr('Não foi possível copiar para {unidade}: {erro}', { unidade: nomeUnidade(u), erro: mensagemDe(e) }));
  }
}

/** Traz da unidade para uma pasta do disco C: (Meus documentos, se não disser qual). */
export async function trazerDaUnidade(id, rels, destino = pastaDocs()) {
  try {
    const feitos = await retro.unidades.trazer(id, rels, destino);
    return feitos || [];
  } catch (e) {
    erro(ehDoComputador(id)
      ? tr('Não foi possível copiar do computador principal: {erro}', { erro: mensagemDe(e) })
      : ehDaNuvem(id)
        ? tr('Não foi possível copiar da nuvem: {erro}', { erro: mensagemDe(e) })
        : tr('Não foi possível copiar do disco removível: {erro}', { erro: mensagemDe(e) }));
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
  avisar(ehDoComputador(id) ? tr('Copiado do computador principal') : ehDaNuvem(id) ? tr('Copiado da nuvem') : tr('Copiado do disco removível'), tr('O arquivo foi copiado para {pasta}. Para levar a versão nova de volta, use Enviar para.', { pasta: destino.replace(/\//g, '\\') }), { icone: iconeUnidade(unidadeConhecida(id)), som: null, ms: 8000 });
  abrirArquivo(feitos[0].rel);
}

/** Desconectar uma conta na nuvem (os arquivos ficam lá; ela sai do Meu computador). */
export async function desconectarNuvem(u) {
  try {
    await retro.nuvem.desconectar(String(u.id).replace(/^nuvem:/, ''));
  } catch (e) {
    erro(tr('Não foi possível desconectar {unidade}: {erro}', { unidade: nomeUnidade(u), erro: mensagemDe(e) }));
  }
}

/** Remover com segurança: depois do "pode tirar", o pendrive sai da lista. */
export async function ejetarUnidade(u) {
  if (u && ehDaNuvem(u.id)) return desconectarNuvem(u);
  const r = await retro.unidades.ejetar(u.id).catch((e) => ({ ok: false, erro: e.message }));
  if (r.ok) return avisar(tr('Pode tirar {unidade}', { unidade: nomeUnidade(u) }), tr('O disco removível pode ser retirado com segurança.'), { icone: 'removivel' });
  erro(r.ocupado
    ? tr('{unidade} ainda está em uso. Feche os arquivos e as janelas dele e tente de novo.', { unidade: nomeUnidade(u) })
    : tr('Não foi possível remover {unidade}: {erro}', { unidade: nomeUnidade(u), erro: r.erro || '?' }));
}

/** O erro do processo principal em palavras (o 'disco': a pasta do disco C: não vai e não vem por aqui). */
function mensagemDe(e) {
  const m = String((e && e.message) || e || '');
  return /\bdisco\b/.test(m) ? tr('a pasta do disco C: não pode ser copiada por aqui.') : m.replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}

/*
 * O que o computador principal mandou (o "Enviar para" do Windows, o ícone do Dock e o "Abrir com"
 * do Mac, soltar no ícone do programa): já foi copiado para Recebidos; aqui, o aviso e a pasta à
 * vista, com o primeiro selecionado. Nada é aberto sozinho.
 */
retro.computador.aoReceber(({ pasta, rels = [], doDisco = [], erro: falha }) => {
  if (falha) erro(tr('Não foi possível receber os arquivos do computador principal: {erro}', { erro: falha }));
  if (rels.length) {
    avisar(tr('Recebido do computador principal'), rels.length === 1 ? nomeDe(rels[0]) : tr('{n} itens copiados.', { n: rels.length }), {
      icone: 'rede', aoClicar: () => abrir('explorador', { pasta, selecionar: rels[0] }),
    });
    abrir('explorador', { pasta, selecionar: rels[0] });
  }
  // O que já estava no disco C: só é mostrado.
  if (doDisco.length) abrir('explorador', { pasta: paiDe(doDisco[0]), selecionar: doDisco[0] });
});

/* As contas na nuvem: as janelas do Meu computador se atualizam, e a conexão que cai é avisada. */
let antesNuvem = new Map();
retro.nuvem.aoMudar((lista) => {
  for (const c of lista || []) {
    const antes = antesNuvem.get(c.id);
    if (antes === 'conectada' && c.estado === 'desconectada' && c.erro === 'caiu') {
      avisar(tr('A conexão com {nome} caiu', { nome: c.nome }), tr('Abra a Nuvem para conectar de novo.'), { icone: 'nuvem', aoClicar: () => abrir('nuvem') });
    }
  }
  antesNuvem = new Map((lista || []).map((c) => [c.id, c.estado]));
  document.dispatchEvent(new CustomEvent('retro-nuvem', { detail: lista || [] }));
});

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
