/*
 * As operações com arquivos, comuns à área de trabalho e às janelas de pasta:
 * o menu do botão direito, renomear no lugar, excluir para a Lixeira, criar,
 * arrastar entre pastas e trazer ou levar arquivos do computador principal.
 */
import { h, img, nomeDe, paiDe, juntar, caminhoTela, extensao } from './util.js';
import { confirmar, entrada, erro, mensagem, propriedades, ajustarAoConteudo } from './dialogos.js';
import { abrir, abrirArquivo, programasPara, avisar, pastaMesa, abrirNoComputador, padraoPara, definirConfig } from './sistema.js';
import { Janela } from './janelas.js';
import { tocar } from './sons.js';
import { tr } from './idioma.js';
import { listarUnidades, levarParaUnidade, nomeUnidade } from './unidades.js';
import { ehCompactado, extrairEMostrar, compactarItens } from './compactados.js';
import { ehFixada, alternarFixada, seguirPasta } from './acesso.js';

export const TIPO_ARRASTO = 'application/x-retro-arquivos';

/**
 * A caixa "Abrir com", como a da época: a lista dos programas que abrem o tipo (e o do computador
 * principal) e "Sempre usar este programa para abrir os arquivos .docx". Devolve o escolhido (o
 * identificador, 'fora' ou null) e, com a caixa marcada, guarda-o como o padrão do tipo. O Painel
 * (Programas padrão) a usa com soPadrao e guardar: false, e guarda tudo no OK dele.
 */
export function escolherPrograma({ nome, soPadrao = false, guardar = true, atual }) {
  const ext = extensao(nome);
  const progs = [...programasPara(nome), { id: 'fora', nome: tr('Programa do computador principal'), icone: 'computador' }];
  let sel = Math.max(0, progs.findIndex((p) => p.id === (atual !== undefined ? atual : padraoPara(nome))));
  return new Promise((resolve) => {
    let feito = false;
    const j = new Janela({ titulo: tr('Abrir com'), icone: 'programa', dialogo: true, largura: 380, altura: 300, aoFechar: () => { if (!feito) { feito = true; resolve(null); } } });
    const lista = h('div.campo.lp-lista', { tabIndex: 0, style: { height: '150px' } });
    const sempre = h('input', { type: 'checkbox', checked: true, disabled: !ext || soPadrao });
    const ok = h('button.padrao', { type: 'button' }, tr('OK'));
    const fim = async (v) => {
      if (feito) return;
      feito = true;
      j.fechar(true);
      if (guardar && v && ext && (sempre.checked || soPadrao)) await definirConfig({ abrirCom: { [ext]: v } });
      resolve(v);
    };
    const desenhar = () => {
      lista.replaceChildren(...progs.map((p, i) => {
        const linha = h('div.lp-linha' + (i === sel ? '.sel' : ''), img(p.icone || 'programa', 16), h('span', p.nome));
        linha.addEventListener('mousedown', () => { sel = i; desenhar(); });
        linha.addEventListener('dblclick', () => fim(progs[sel].id));
        return linha;
      }));
    };
    lista.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' && sel > 0) { sel--; desenhar(); e.preventDefault(); }
      if (e.key === 'ArrowDown' && sel < progs.length - 1) { sel++; desenhar(); e.preventDefault(); }
      if (e.key === 'Enter') { e.preventDefault(); fim(progs[sel].id); }
    });
    ok.addEventListener('click', () => fim(progs[sel].id));
    desenhar();
    j.corpo.append(
      h('div', { style: { lineHeight: '13px', marginBottom: '8px' } }, soPadrao
        ? tr('Escolha o programa que abre os arquivos .{ext}:', { ext })
        : tr('Escolha o programa para abrir "{nome}":', { nome })),
      lista,
      soPadrao ? null : h('label', { style: { marginTop: '8px' } }, sempre, h('span', ext ? tr('Sempre usar este programa para abrir os arquivos .{ext}', { ext }) : tr('Sempre usar este programa para abrir este tipo de arquivo'))),
      h('div.acoes.direita', ok, h('button', { type: 'button', on: { click: () => fim(null) } }, tr('Cancelar'))));
    ajustarAoConteudo(j, { largura: 380 });
    lista.focus();
  });
}

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
      const ok = await confirmar(tr('Se você mudar a extensão do nome do arquivo, ele pode ficar inutilizável.\n\nDeseja mesmo mudá-la?'), { titulo: tr('Renomear'), tipo: 'aviso' });
      if (!ok) return null;
    }
    const r = await retro.disco.renomear(rel, novo);
    seguirPasta(rel, r.rel);
    return r.rel;
  } catch (e) {
    await erro(tr('Não foi possível renomear {nome}: {erro}', { nome: nomeDe(rel), erro: e.message }), tr('Erro ao renomear o arquivo'));
    return null;
  }
}

export async function excluir(rels) {
  if (!rels.length) return false;
  const texto = rels.length === 1
    ? tr('Deseja mesmo enviar "{nome}" para a Lixeira?', { nome: nomeDe(rels[0]) })
    : tr('Deseja mesmo enviar estes {n} itens para a Lixeira?', { n: rels.length });
  const ok = await confirmar(texto, { titulo: rels.length === 1 ? tr('Confirmar exclusão de arquivo') : tr('Confirmar exclusão de vários arquivos'), tipo: 'pergunta' });
  if (!ok) return false;
  for (const rel of rels) {
    try {
      await retro.disco.paraLixeira(rel);
    } catch (e) {
      await erro(tr('Não foi possível excluir {nome}: {erro}', { nome: nomeDe(rel), erro: e.message }));
    }
  }
  tocar('lixeira');
  return true;
}

export async function novaPasta(pai) {
  const nome = await retro.disco.nomeLivre(pai, tr('Nova pasta'));
  return (await retro.disco.criarPasta(pai, nome)).rel;
}

export async function novoTexto(pai) {
  const nome = await retro.disco.nomeLivre(pai, tr('Novo documento de texto') + '.txt');
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
      else {
        const r = await retro.disco.mover(rel, destino);
        if (r && r.rel) seguirPasta(rel, r.rel);
      }
      feitos++;
    } catch (e) {
      await erro((copiar ? tr('Não foi possível copiar {nome}: {erro}', { nome: nomeDe(rel), erro: e.message }) : tr('Não foi possível mover {nome}: {erro}', { nome: nomeDe(rel), erro: e.message })));
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
    if (feitos.length) avisar(tr('Arquivos trazidos'), tr('{n} item(ns) copiado(s) para {pasta}', { n: feitos.length, pasta: caminhoTela(destino) }), { som: null });
    return feitos.length;
  } catch (er) {
    await erro(tr('Não foi possível trazer os arquivos: {erro}', { erro: er.message }));
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
      avisar(tr('Levado para o computador principal'), feitos.length === 1 ? feitos[0] : tr('{n} itens copiados.', { n: feitos.length }), { som: null });
    }
  } catch (e) {
    erro(tr('Não foi possível levar os arquivos: {erro}', { erro: e.message }));
  }
}

/**
 * "Pedir ao Claude": o Claude Code abre na pasta do arquivo (ou na própria pasta), já com o
 * pedido. Antes, a versão de agora do arquivo é guardada (Versões anteriores…): o Claude grava
 * direto no disco, e assim nada se perde.
 */
function pedidosAoClaude(um) {
  const pedir = async (pedido) => {
    if (!pedido) return;
    if (!um.pasta) await retro.disco.guardarVersao(um.rel).catch(() => { });
    abrir('claude', { pasta: um.pasta ? um.rel : paiDe(um.rel), pedido });
  };
  const arquivo = um.nome;
  const outro = async () => {
    const texto = await entrada({
      titulo: tr('Pedir ao Claude'), icone: 'claude', larg: 420,
      texto: um.pasta ? tr('O que o Claude deve fazer na pasta "{pasta}"?', { pasta: arquivo }) : tr('O que o Claude deve fazer com o arquivo "{arquivo}"?', { arquivo }),
    });
    if (texto && texto.trim()) pedir(um.pasta ? texto.trim() : tr('Sobre o arquivo "{arquivo}": {pedido}', { arquivo, pedido: texto.trim() }));
  };
  if (um.pasta) {
    return [
      { rotulo: tr('Or&ganizar a pasta'), acao: () => pedir(tr('Organize os arquivos desta pasta em subpastas, por assunto ou por tipo. Antes de mover qualquer coisa, mostre o plano e espere a minha confirmação. Não apague nada.')) },
      { rotulo: tr('&Outro pedido…'), acao: outro },
    ];
  }
  const traduzir = (idioma) => pedir(tr('Traduza o arquivo "{arquivo}" para o {idioma}. Grave a tradução num arquivo novo, ao lado do original, sem mudar o original.', { arquivo, idioma }));
  return [
    { rotulo: tr('&Revisar o texto'), acao: () => pedir(tr('Revise a ortografia, a gramática e a clareza do arquivo "{arquivo}". Antes de mudar qualquer coisa, mostre o que vai mudar e espere a minha confirmação.', { arquivo })) },
    { rotulo: tr('Re&sumir'), acao: () => pedir(tr('Leia o arquivo "{arquivo}" e faça um resumo curto, com os pontos principais. Não mude o arquivo.', { arquivo })) },
    {
      rotulo: tr('&Traduzir'), sub: () => [
        { rotulo: tr('Para o &português'), acao: () => traduzir(tr('português')) },
        { rotulo: tr('Para o &inglês'), acao: () => traduzir(tr('inglês')) },
        { rotulo: tr('Para o &espanhol'), acao: () => traduzir(tr('espanhol')) },
      ],
    },
    { separador: true },
    { rotulo: tr('&Outro pedido…'), acao: outro },
  ];
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
    itens.push({ rotulo: tr('&Abrir'), negrito: true, acao: () => (o.abrirPasta ? o.abrirPasta(um.rel) : abrir('explorador', { pasta: um.rel })) });
    itens.push({ rotulo: tr('Expl&orar'), acao: () => abrir('explorador', { pasta: um.rel }) });
    itens.push({ rotulo: tr('Abrir o &Prompt de comando aqui'), acao: () => abrir('prompt', { pasta: um.rel }) });
    itens.push({ rotulo: tr('Abrir o C&laude aqui'), icone: 'claude', acao: () => abrir('claude', { pasta: um.rel }) });
    itens.push({ rotulo: tr('Pe&dir ao Claude'), sub: () => pedidosAoClaude(um) });
    if (um.rel) {
      itens.push({ separador: true });
      itens.push(ehFixada(um.rel)
        ? { rotulo: tr('Desa&fixar do Acesso rápido'), icone: 'favoritos', acao: () => alternarFixada(um.rel).catch((e) => erro(e.message)) }
        : { rotulo: tr('&Fixar no Acesso rápido'), icone: 'favoritos', acao: () => alternarFixada(um.rel).catch((e) => erro(e.message)) });
    }
  } else if (um) {
    const progs = programasPara(um.nome);
    itens.push({ rotulo: tr('&Abrir'), negrito: true, acao: () => abrirArquivo(um.rel) });
    itens.push({
      rotulo: tr('Abrir c&om'), sub: () => [
        ...progs.map((p) => ({ rotulo: p.nome, icone: p.icone, acao: () => abrirArquivo(um.rel, { com: p.id }) })),
        ...(progs.length ? [{ separador: true }] : []),
        { rotulo: tr('Programa do computador principal'), icone: 'computador', acao: () => abrirNoComputador(um.rel).catch((e) => erro(e.message)) },
        { separador: true },
        { rotulo: tr('&Escolher o programa…'), acao: () => escolherPrograma({ nome: um.nome }).then((id) => id && (id === 'fora' ? abrirNoComputador(um.rel) : abrirArquivo(um.rel, { com: id }))).catch((e) => erro(e.message)) },
      ],
    });
    if (ehCompactado(um.nome)) itens.push({ rotulo: tr('Extra&ir tudo…'), acao: () => extrairEMostrar(um.rel) });
    itens.push({ rotulo: tr('Pe&dir ao Claude'), icone: 'claude', sub: () => pedidosAoClaude(um) });
  }
  // O antivírus: um arquivo ou uma pasta de cada vez.
  if (um && um.rel != null) itens.push({ rotulo: tr('Verificar com o antivír&us'), icone: 'seguranca', acao: () => abrir('antivirus', { alvo: { tipo: 'disco', rel: um.rel } }) });
  if (sel.length) {
    itens.push({ separador: true });
    itens.push({ rotulo: tr('Recor&tar'), atalho: 'Ctrl+X', acao: () => copiarItens(rels, true) });
    itens.push({ rotulo: tr('&Copiar'), atalho: 'Ctrl+C', acao: () => copiarItens(rels, false) });
    itens.push({ separador: true });
    itens.push({
      rotulo: tr('&Enviar para'), sub: async () => {
        // Os pendrives e cartões conectados entram no fim (uma cópia; o do disco C: fica).
        const unidades = (await listarUnidades()).filter((u) => u.montada);
        return [
          { rotulo: tr('Área de trabalho do computador principal'), icone: 'pasta-mesa', acao: () => levar(rels, 'desktop') },
          { rotulo: tr('Downloads do computador principal'), icone: 'pasta-recebidos', acao: () => levar(rels, 'downloads') },
          { rotulo: tr('Outra pasta do computador principal…'), icone: 'pasta-aberta', acao: () => levar(rels, 'escolher') },
          { separador: true },
          { rotulo: tr('Área de trabalho (atalho)'), icone: 'pasta-mesa', desativado: sel.every((s) => paiDe(s.rel) === pastaMesa()), acao: () => moverPara(rels, pastaMesa(), true) },
          { rotulo: tr('Pasta compactada (zip)'), icone: 'compactado', acao: () => compactarItens(rels) },
          ...(unidades.length ? [{ separador: true }] : []),
          ...unidades.map((u) => ({ rotulo: nomeUnidade(u), icone: 'removivel', acao: () => levarParaUnidade(u, rels) })),
        ];
      },
    });
    if (um) itens.push({ rotulo: tr('&Mostrar no computador principal'), acao: () => retro.disco.mostrar(um.rel) });
    itens.push({ separador: true });
    itens.push({ rotulo: tr('E&xcluir'), atalho: 'Del', acao: () => excluir(rels) });
    if (um && o.aoRenomear) itens.push({ rotulo: tr('Re&nomear'), atalho: 'F2', acao: () => o.aoRenomear(um) });
    if (um && !um.pasta) itens.push({ rotulo: tr('&Versões anteriores…'), acao: () => versoesAnteriores(um.rel) });
    if (um) {
      itens.push({ separador: true });
      itens.push({ rotulo: tr('P&ropriedades'), acao: () => propriedades(um.rel) });
    }
  }
  return itens;
}

/** O menu do botão direito no fundo de uma pasta (ou da área de trabalho). */
export function menuDoFundo(pasta, { aoNovo, organizar, vista, atualizar } = {}) {
  const itens = [];
  if (vista) itens.push({ rotulo: tr('&Exibir'), sub: vista });
  if (organizar) itens.push({ rotulo: tr('&Organizar ícones'), sub: organizar });
  if (atualizar) itens.push({ rotulo: tr('&Atualizar'), acao: atualizar });
  itens.push({ separador: true });
  itens.push({ rotulo: tr('&Colar'), atalho: 'Ctrl+V', desativado: !transferencia.rels.length, acao: () => colar(pasta) });
  itens.push({ separador: true });
  itens.push({
    rotulo: tr('&Novo'), sub: () => [
      { rotulo: tr('&Pasta'), icone: 'pasta', acao: async () => { const r = await novaPasta(pasta).catch((e) => erro(e.message)); if (r && aoNovo) aoNovo(r); } },
      { separador: true },
      { rotulo: tr('&Documento de texto'), icone: 'texto', acao: async () => { const r = await novoTexto(pasta).catch((e) => erro(e.message)); if (r && aoNovo) aoNovo(r); } },
    ],
  });
  itens.push({ rotulo: tr('&Trazer do computador principal…'), acao: () => retro.disco.importarEscolhendo(pasta).catch((e) => erro(e.message)) });
  itens.push({ separador: true });
  itens.push({ rotulo: tr('Abrir o &Prompt de comando aqui'), acao: () => abrir('prompt', { pasta }) });
  itens.push({ rotulo: tr('Abrir o C&laude aqui'), acao: () => abrir('claude', { pasta }) });
  itens.push({ rotulo: tr('&Mostrar no computador principal'), acao: () => retro.disco.mostrar(pasta) });
  return itens;
}

/* ---------- Versões anteriores ---------- */

export async function versoesAnteriores(rel) {
  const { Janela } = await import('./janelas.js');
  const { ajustarAoConteudo } = await import('./dialogos.js');
  const { dataHora, tamanho, img } = await import('./util.js');
  const lista = await retro.disco.versoes(rel);
  const j = new Janela({ titulo: tr('Versões anteriores de {nome}', { nome: nomeDe(rel) }), dialogo: true, largura: 380, altura: 300 });
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
  const listaEl = h('div.lista-arquivos.vista-lista', { style: { height: '160px', flexWrap: 'nowrap' } }, linhas.length ? linhas : h('div', { style: { padding: '6px', color: '#808080' } }, tr('Ainda não há versões anteriores deste arquivo.')));
  const restaurarEsta = async () => {
    if (!escolhida) return;
    const ok = await confirmar(tr('Voltar {nome} para a versão de {data}?\n\nO conteúdo atual também fica guardado nas versões.', { nome: nomeDe(rel), data: dataHora(escolhida.modificado) }), { titulo: tr('Restaurar versão') });
    if (!ok) return;
    try {
      await retro.disco.restaurarVersao(rel, escolhida.id);
      j.fechar(true);
      avisar(tr('Versão restaurada'), nomeDe(rel), { som: null });
    } catch (e) {
      erro(e.message);
    }
  };
  const bt = h('button', { disabled: true, on: { click: restaurarEsta } }, tr('Restaurar'));
  j.corpo.append(
    h('div', { style: { marginBottom: '8px' } }, tr('Cada vez que o arquivo é gravado por cima, a versão anterior fica guardada aqui (até 20).')),
    listaEl,
    h('div.acoes.direita', bt, h('button.padrao', { on: { click: () => j.fechar() } }, tr('Fechar'))),
  );
  ajustarAoConteudo(j, { minLarg: 380 });
}

export { mensagem };
