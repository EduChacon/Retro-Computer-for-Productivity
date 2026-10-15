/*
 * As operações com arquivos, comuns à área de trabalho e às janelas de pasta:
 * o menu do botão direito, renomear no lugar, excluir para a Lixeira, criar,
 * arrastar entre pastas e trazer ou levar arquivos do computador principal.
 */
import { h, nomeDe, paiDe, juntar, caminhoTela, extensao } from './util.js';
import { confirmar, erro, mensagem, propriedades } from './dialogos.js';
import { abrir, abrirArquivo, programasPara, avisar } from './sistema.js';
import { tocar } from './sons.js';

export const TIPO_ARRASTO = 'application/x-retro-arquivos';

/** Edita o nome no próprio ícone. Devolve o nome novo (ou null). */
export function editarRotulo(itemEl, nomeAtual, { semExtensao = true } = {}) {
  return new Promise((resolve) => {
    const rotuloEl = itemEl.querySelector('.rotulo');
    const ed = h('textarea.rotulo-editor', { spellcheck: false });
    ed.value = nomeAtual;
    rotuloEl.hidden = true;
    rotuloEl.after(ed);
    itemEl.classList.add('renomeando');
    const ajustar = () => { ed.style.height = 'auto'; ed.style.height = ed.scrollHeight + 2 + 'px'; };
    ajustar();
    ed.focus();
    const ponto = nomeAtual.lastIndexOf('.');
    ed.setSelectionRange(0, semExtensao && ponto > 0 ? ponto : nomeAtual.length);
    let feito = false;
    const fim = (ok) => {
      if (feito) return;
      feito = true;
      ed.remove();
      rotuloEl.hidden = false;
      itemEl.classList.remove('renomeando');
      const v = ed.value.replace(/[\r\n]/g, '').trim();
      resolve(ok && v && v !== nomeAtual ? v : null);
    };
    ed.addEventListener('input', ajustar);
    ed.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); fim(true); }
      if (e.key === 'Escape') { e.preventDefault(); fim(false); }
    });
    ed.addEventListener('mousedown', (e) => e.stopPropagation());
    ed.addEventListener('blur', () => fim(true));
  });
}

export async function renomear(rel, novo) {
  try {
    if (extensao(nomeDe(rel)) !== extensao(novo) && extensao(nomeDe(rel))) {
      const ok = await confirmar('Se você mudar a extensão do nome do arquivo, ele pode ficar inutilizável.\n\nDeseja mesmo mudá-la?', { titulo: 'Renomear', tipo: 'aviso' });
      if (!ok) return null;
    }
    const r = await retro.disco.renomear(rel, novo);
    return r.rel;
  } catch (e) {
    await erro(`Não foi possível renomear ${nomeDe(rel)}: ${e.message}`, 'Erro ao renomear o arquivo');
    return null;
  }
}

export async function excluir(rels) {
  if (!rels.length) return false;
  const texto = rels.length === 1
    ? `Deseja mesmo enviar "${nomeDe(rels[0])}" para a Lixeira?`
    : `Deseja mesmo enviar estes ${rels.length} itens para a Lixeira?`;
  const ok = await confirmar(texto, { titulo: rels.length === 1 ? 'Confirmar exclusão de arquivo' : 'Confirmar exclusão de vários arquivos', tipo: 'pergunta' });
  if (!ok) return false;
  for (const rel of rels) {
    try {
      await retro.disco.paraLixeira(rel);
    } catch (e) {
      await erro(`Não foi possível excluir ${nomeDe(rel)}: ${e.message}`);
    }
  }
  tocar('lixeira');
  return true;
}

export async function novaPasta(pai) {
  const nome = await retro.disco.nomeLivre(pai, 'Nova pasta');
  return (await retro.disco.criarPasta(pai, nome)).rel;
}

export async function novoTexto(pai) {
  const nome = await retro.disco.nomeLivre(pai, 'Novo documento de texto.txt');
  const r = await retro.disco.gravar(juntar(pai, nome), new Uint8Array(0), { versao: false });
  return r.rel;
}

/** Move (ou copia, com Ctrl) para uma pasta. */
export async function moverPara(rels, destino, copiar = false) {
  let feitos = 0;
  for (const rel of rels) {
    if (paiDe(rel) === destino && !copiar) continue;
    if (rel === destino || destino.startsWith(rel + '/')) continue;
    try {
      if (copiar) await retro.disco.copiar(rel, destino);
      else await retro.disco.mover(rel, destino);
      feitos++;
    } catch (e) {
      await erro(`Não foi possível ${copiar ? 'copiar' : 'mover'} ${nomeDe(rel)}: ${e.message}`);
    }
  }
  return feitos;
}

/* ---------- Recortar, copiar e colar ---------- */

export const transferencia = { rels: [], recortar: false };

export function copiarItens(rels, recortar = false) {
  transferencia.rels = rels.slice();
  transferencia.recortar = recortar;
}

export async function colar(destino) {
  if (!transferencia.rels.length) return 0;
  const n = await moverPara(transferencia.rels, destino, !transferencia.recortar);
  if (transferencia.recortar) transferencia.rels = [];
  return n;
}

/** Trata o que foi solto numa pasta: arquivos do computador principal ou ícones do próprio disco. */
export async function soltarEm(e, destino) {
  const dt = e.dataTransfer;
  const internos = dt.getData(TIPO_ARRASTO);
  if (internos) {
    const rels = JSON.parse(internos);
    if (destino === '::lixeira') return excluir(rels);
    return moverPara(rels, destino, e.ctrlKey || e.altKey);
  }
  const caminhos = [...(dt.files || [])].map((f) => retro.disco.caminhoDe(f)).filter(Boolean);
  if (!caminhos.length || destino === '::lixeira') return 0;
  try {
    const feitos = await retro.disco.importar(caminhos, destino);
    if (feitos.length) avisar('Arquivos trazidos', `${feitos.length} item(ns) copiado(s) para ${caminhoTela(destino)}`, { som: null });
    return feitos.length;
  } catch (er) {
    await erro(`Não foi possível trazer os arquivos: ${er.message}`);
    return 0;
  }
}

export function aceitaSoltar(e) {
  const tipos = e.dataTransfer ? [...e.dataTransfer.types] : [];
  return tipos.includes(TIPO_ARRASTO) || tipos.includes('Files');
}

export async function levar(rels, onde) {
  try {
    const feitos = await retro.disco.exportar(rels, onde);
    if (feitos && feitos.length) {
      avisar('Levado para o computador principal', feitos.length === 1 ? feitos[0] : `${feitos.length} itens copiados.`, { som: null });
    }
  } catch (e) {
    erro(`Não foi possível levar os arquivos: ${e.message}`);
  }
}

/**
 * O menu do botão direito para arquivos e pastas selecionados.
 * @param {Array<{rel:string, nome:string, pasta:boolean}>} sel
 * @param {{ aoRenomear?: Function, abrirPasta?: Function }} o
 */
export function menuDeItens(sel, o = {}) {
  const rels = sel.map((s) => s.rel);
  const um = sel.length === 1 ? sel[0] : null;
  const itens = [];
  if (um && um.pasta) {
    itens.push({ rotulo: '&Abrir', negrito: true, acao: () => (o.abrirPasta ? o.abrirPasta(um.rel) : abrir('explorador', { pasta: um.rel })) });
    itens.push({ rotulo: '&Explorar', acao: () => abrir('explorador', { pasta: um.rel }) });
    itens.push({ rotulo: 'Abrir o &Prompt de comando aqui', acao: () => abrir('prompt', { pasta: um.rel }) });
    itens.push({ rotulo: 'Abrir o C&laude aqui', icone: 'claude', acao: () => abrir('claude', { pasta: um.rel }) });
  } else if (um) {
    const progs = programasPara(um.nome);
    itens.push({ rotulo: '&Abrir', negrito: true, acao: () => abrirArquivo(um.rel) });
    itens.push({
      rotulo: 'Abrir &com', sub: () => [
        ...progs.map((p) => ({ rotulo: p.nome, icone: p.icone, acao: () => abrirArquivo(um.rel, { com: p.id }) })),
        ...(progs.length ? [{ separador: true }] : []),
        { rotulo: 'Programa do computador principal', acao: () => retro.disco.abrirFora(um.rel).catch((e) => erro(e.message)) },
      ],
    });
  }
  if (sel.length) {
    itens.push({ separador: true });
    itens.push({ rotulo: 'Recor&tar', atalho: 'Ctrl+X', acao: () => copiarItens(rels, true) });
    itens.push({ rotulo: '&Copiar', atalho: 'Ctrl+C', acao: () => copiarItens(rels, false) });
    itens.push({ separador: true });
    itens.push({
      rotulo: '&Enviar para', sub: () => [
        { rotulo: 'Área de trabalho do computador principal', icone: 'computador', acao: () => levar(rels, 'desktop') },
        { rotulo: 'Downloads do computador principal', icone: 'pasta', acao: () => levar(rels, 'downloads') },
        { rotulo: 'Outra pasta do computador principal…', icone: 'pasta-aberta', acao: () => levar(rels, 'escolher') },
        { separador: true },
        { rotulo: 'Área de trabalho (atalho)', icone: 'documentos', desativado: sel.every((s) => paiDe(s.rel) === 'Área de trabalho'), acao: () => moverPara(rels, 'Área de trabalho', true) },
      ],
    });
    if (um) itens.push({ rotulo: '&Mostrar no computador principal', acao: () => retro.disco.mostrar(um.rel) });
    itens.push({ separador: true });
    itens.push({ rotulo: 'E&xcluir', atalho: 'Del', acao: () => excluir(rels) });
    if (um && o.aoRenomear) itens.push({ rotulo: '&Renomear', atalho: 'F2', acao: () => o.aoRenomear(um) });
    if (um && !um.pasta) itens.push({ rotulo: '&Versões anteriores…', acao: () => versoesAnteriores(um.rel) });
    if (um) {
      itens.push({ separador: true });
      itens.push({ rotulo: 'P&ropriedades', acao: () => propriedades(um.rel) });
    }
  }
  return itens;
}

/** O menu do botão direito no fundo de uma pasta (ou da área de trabalho). */
export function menuDoFundo(pasta, { aoNovo, organizar, vista, atualizar } = {}) {
  const itens = [];
  if (vista) itens.push({ rotulo: '&Exibir', sub: vista });
  if (organizar) itens.push({ rotulo: '&Organizar ícones', sub: organizar });
  if (atualizar) itens.push({ rotulo: '&Atualizar', acao: atualizar });
  itens.push({ separador: true });
  itens.push({ rotulo: '&Colar', atalho: 'Ctrl+V', desativado: !transferencia.rels.length, acao: () => colar(pasta) });
  itens.push({ separador: true });
  itens.push({
    rotulo: '&Novo', sub: () => [
      { rotulo: '&Pasta', icone: 'pasta', acao: async () => { const r = await novaPasta(pasta).catch((e) => erro(e.message)); if (r && aoNovo) aoNovo(r); } },
      { separador: true },
      { rotulo: '&Documento de texto', icone: 'texto', acao: async () => { const r = await novoTexto(pasta).catch((e) => erro(e.message)); if (r && aoNovo) aoNovo(r); } },
    ],
  });
  itens.push({ rotulo: '&Trazer do computador principal…', acao: () => retro.disco.importarEscolhendo(pasta).catch((e) => erro(e.message)) });
  itens.push({ separador: true });
  itens.push({ rotulo: 'Abrir o &Prompt de comando aqui', acao: () => abrir('prompt', { pasta }) });
  itens.push({ rotulo: 'Abrir o C&laude aqui', acao: () => abrir('claude', { pasta }) });
  itens.push({ rotulo: '&Mostrar no computador principal', acao: () => retro.disco.mostrar(pasta) });
  return itens;
}

/* ---------- Versões anteriores ---------- */

export async function versoesAnteriores(rel) {
  const { Janela } = await import('./janelas.js');
  const { ajustarAoConteudo } = await import('./dialogos.js');
  const { dataHora, tamanho, img } = await import('./util.js');
  const lista = await retro.disco.versoes(rel);
  const j = new Janela({ titulo: `Versões anteriores de ${nomeDe(rel)}`, dialogo: true, largura: 380, altura: 300 });
  let escolhida = null;
  const linhas = lista.map((v) => {
    const el = h('div.item', { style: { width: '100%' } }, h('div.icone', img('relogio', 16)), h('div.rotulo', `${dataHora(v.modificado)}   (${tamanho(v.tamanho)})`));
    el.addEventListener('mousedown', () => {
      escolhida = v;
      for (const x of el.parentElement.children) x.classList.toggle('sel', x === el);
      bt.disabled = false;
    });
    el.addEventListener('dblclick', () => restaurarEsta());
    return el;
  });
  const listaEl = h('div.lista-arquivos.vista-lista', { style: { height: '160px', flexWrap: 'nowrap' } }, linhas.length ? linhas : h('div', { style: { padding: '6px', color: '#808080' } }, 'Ainda não há versões anteriores deste arquivo.'));
  const restaurarEsta = async () => {
    if (!escolhida) return;
    const ok = await confirmar(`Voltar ${nomeDe(rel)} para a versão de ${dataHora(escolhida.modificado)}?\n\nO conteúdo atual também fica guardado nas versões.`, { titulo: 'Restaurar versão' });
    if (!ok) return;
    try {
      await retro.disco.restaurarVersao(rel, escolhida.id);
      j.fechar(true);
      avisar('Versão restaurada', nomeDe(rel), { som: null });
    } catch (e) {
      erro(e.message);
    }
  };
  const bt = h('button', { disabled: true, on: { click: restaurarEsta } }, 'Restaurar');
  j.corpo.append(
    h('div', { style: { marginBottom: '8px' } }, 'Cada vez que o arquivo é gravado por cima, a versão anterior fica guardada aqui (até 20).'),
    listaEl,
    h('div.acoes.direita', bt, h('button.padrao', { on: { click: () => j.fechar() } }, 'Fechar')),
  );
  ajustarAoConteudo(j, { minLarg: 380 });
}

export { mensagem };
