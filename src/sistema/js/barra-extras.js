/*
 * Dois extras da barra de tarefas: o calendário do mês (um clique no relógio)
 * e a caixa de busca, que procura nos programas, nas opções do Painel de
 * controle e nos arquivos do disco C:, e com Enter pesquisa na internet.
 */
import { h, img, tipoDe, caminhoTela, paiDe } from './util.js';
import { estado, abrir, abrirArquivo, abrirEndereco } from './sistema.js';
import { fecharMenus } from './menus.js';
import { abrirNativo, iconeNativo } from './nativos.js';
import { tr, marcar, localidade } from './idioma.js';

/* ---------- A caixinha que abre acima da barra (o calendário, o volume, a rede…) ---------- */

let aberto = null;

export function fecharFlutuante() {
  if (!aberto) return;
  const a = aberto;
  aberto = null;
  a.el.remove();
  document.removeEventListener('mousedown', a.fora, true);
  document.removeEventListener('keydown', a.tecla, true);
  a.ancora.classList.remove('aberto');
  if (a.aoFechar) a.aoFechar();
}

/**
 * Abre a caixinha de um item da barra, acima dele (um clique de novo no mesmo item fecha).
 * Só uma fica aberta por vez; um clique fora ou o Esc fecham.
 * @returns {HTMLElement|null} a caixinha, ou null quando o clique fechou
 */
export function alternarFlutuante(ancora, montar, { aoFechar, tecla } = {}) {
  const mesma = aberto && aberto.ancora === ancora;
  fecharFlutuante();
  if (mesma) return null;
  fecharMenus();
  const el = montar();
  el.classList.add('flutuante');
  const tela = document.getElementById('tela');
  tela.append(el);
  const r = ancora.getBoundingClientRect();
  const t = tela.getBoundingClientRect();
  el.style.right = Math.max(2, Math.round(t.right - r.right)) + 'px';
  el.style.bottom = Math.round(t.bottom - r.top + 4) + 'px';
  // Sem passar da borda esquerda da tela.
  if (el.getBoundingClientRect().left < t.left + 2) { el.style.right = 'auto'; el.style.left = '2px'; }
  const fora = (e) => { if (!el.contains(e.target) && !ancora.contains(e.target)) fecharFlutuante(); };
  const tec = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); fecharFlutuante(); return; }
    if (tecla) tecla(e);
  };
  document.addEventListener('mousedown', fora, true);
  document.addEventListener('keydown', tec, true);
  ancora.classList.add('aberto');
  aberto = { el, ancora, fora, tecla: tec, aoFechar };
  return el;
}

/* ---------- O calendário ---------- */

/** O primeiro dia da semana do idioma (0 = domingo), como nos calendários de parede de cada lugar. */
function primeiroDia() {
  try {
    const l = new Intl.Locale(localidade());
    const info = (l.getWeekInfo && l.getWeekInfo()) || l.weekInfo;
    if (info && info.firstDay) return info.firstDay % 7;
  } catch { }
  return 0;
}

export const fecharCalendario = fecharFlutuante;

export function alternarCalendario(ancora) {
  const hoje = new Date();
  const mes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  let desenhar = () => { };
  alternarFlutuante(ancora, () => {
    const titulo = h('div.cal-titulo');
    const grade = h('div.cal-grade');
    const el = h('div.calendario',
      h('div.cal-topo',
        h('button.cal-seta', { title: tr('Mês anterior'), on: { click: () => { mes.setMonth(mes.getMonth() - 1); desenhar(); } } }, '◀'),
        titulo,
        h('button.cal-seta', { title: tr('Próximo mês'), on: { click: () => { mes.setMonth(mes.getMonth() + 1); desenhar(); } } }, '▶')),
      grade,
      h('div.cal-rodape',
        h('a', { href: '#', on: { click: (e) => { e.preventDefault(); mes.setFullYear(hoje.getFullYear(), hoje.getMonth(), 1); desenhar(); } } },
          tr('Hoje: {data}', { data: hoje.toLocaleDateString(localidade(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) })),
        h('a', { href: '#', on: { click: (e) => { e.preventDefault(); fecharFlutuante(); abrir('painel', { secao: 'data' }); } } }, tr('Data e hora…'))));
    const p0 = primeiroDia();
    desenhar = () => {
      titulo.textContent = mes.toLocaleDateString(localidade(), { month: 'long', year: 'numeric' });
      const dias = [];
      for (let i = 0; i < 7; i++) {
        // Uma semana qualquer que começa num domingo (2 de outubro de 2022).
        const d = new Date(2022, 9, 2 + ((p0 + i) % 7));
        dias.push(h('div.cal-semana', d.toLocaleDateString(localidade(), { weekday: 'narrow' })));
      }
      const inicio = new Date(mes);
      inicio.setDate(1 - ((mes.getDay() - p0 + 7) % 7));
      for (let i = 0; i < 42; i++) {
        const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
        const cls = ['cal-dia'];
        if (d.getMonth() !== mes.getMonth()) cls.push('fora');
        if (d.toDateString() === hoje.toDateString()) cls.push('hoje');
        dias.push(h('div.' + cls.join('.'), { title: d.toLocaleDateString(localidade(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }, String(d.getDate())));
      }
      grade.replaceChildren(...dias);
    };
    desenhar();
    return el;
  }, {
    tecla: (e) => {
      if (e.key === 'PageUp') { mes.setMonth(mes.getMonth() - 1); desenhar(); }
      if (e.key === 'PageDown') { mes.setMonth(mes.getMonth() + 1); desenhar(); }
    },
  });
}

/* ---------- A busca ---------- */

// Os programas e lugares do próprio Retro Computer que a busca acha pelo nome.
const DO_SISTEMA = [
  { nome: marcar('Bloco de notas'), icone: 'bloco', abrir: () => abrir('bloco') },
  { nome: marcar('Calculadora'), icone: 'calculadora', abrir: () => abrir('calculadora') },
  { nome: marcar('Navegador'), icone: 'navegador', abrir: () => abrir('navegador') },
  { nome: marcar('E-mail'), icone: 'correio', abrir: () => abrir('correio') },
  { nome: marcar('Prompt de comando'), icone: 'prompt', abrir: () => abrir('prompt') },
  { nome: marcar('Claude'), icone: 'claude', abrir: () => abrir('claude') },
  { nome: marcar('Foco (Pomodoro)'), icone: 'foco', abrir: () => abrir('foco') },
  { nome: marcar('Paciência'), icone: 'paciencia', abrir: () => abrir('paciencia') },
  { nome: marcar('Campo Minado'), icone: 'campo-minado', abrir: () => abrir('campo-minado') },
  { nome: 'Breakout', icone: 'breakout', abrir: () => abrir('breakout') },
  { nome: marcar('Meu computador'), icone: 'computador', abrir: () => abrir('explorador', { pasta: '::computador' }) },
  { nome: marcar('Lixeira'), icone: 'lixeira', abrir: () => abrir('lixeira') },
  { nome: marcar('Programas do computador'), icone: 'computador', abrir: () => abrir('nativos') },
  { nome: marcar('Adicionar ou remover programas'), icone: 'programas-caixa', abrir: () => abrir('programas') },
  { nome: marcar('Painel de controle'), icone: 'painel', abrir: () => abrir('painel') },
  { nome: marcar('Ajuda'), icone: 'ajuda', abrir: () => abrir('ajuda') },
];

const simples = (s) => String(s).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

let nativosGuardados = null;

/** Os resultados de um termo, por grupo. */
export async function procurar(termo) {
  const t = simples(termo.trim());
  if (!t) return [];
  const casa = (nome) => simples(nome).includes(t);
  const r = [];
  const programas = DO_SISTEMA.filter((p) => casa(p.nome === 'Breakout' ? p.nome : tr(p.nome))).map((p) => ({ grupo: 'programas', rotulo: p.nome === 'Breakout' ? p.nome : tr(p.nome), icone: p.icone, abrir: p.abrir }));
  for (const p of estado.instalados || []) if (casa(p.nome)) programas.push({ grupo: 'programas', rotulo: p.nome, icone: p.icone || 'programa', abrir: () => abrir('craft:' + p.id) });
  if (!nativosGuardados) nativosGuardados = await retro.nativos.listar().catch(() => []);
  for (const p of nativosGuardados) {
    if (casa(p.nome)) programas.push({ grupo: 'programas', rotulo: p.nome, icone: p.terminal ? 'prompt' : 'programa', iconeUrl: await iconeNativo(p.id), abrir: () => abrirNativo(p.id) });
  }
  r.push(...programas.slice(0, 8));
  try {
    const { ITENS } = await import('./apps/painel.js');
    for (const it of ITENS) {
      if (casa(tr(it.rotulo)) || casa(tr(it.descricao))) r.push({ grupo: 'configuracoes', rotulo: tr(it.rotulo), icone: it.icone, abrir: it.abrir });
    }
  } catch { }
  const arquivos = await retro.disco.buscar(termo.trim(), { max: 8 }).catch(() => []);
  for (const f of arquivos) {
    const tp = tipoDe(f.nome, f.pasta);
    r.push({ grupo: 'arquivos', rotulo: f.nome, dica: caminhoTela(paiDe(f.rel)), icone: tp.icone, abrir: () => (f.pasta ? abrir('explorador', { pasta: f.rel }) : abrirArquivo(f.rel)) });
  }
  return r;
}

const GRUPOS = { programas: marcar('Programas'), configuracoes: marcar('Configurações'), arquivos: marcar('Arquivos') };

export function montarBusca() {
  const campo = h('input', { type: 'search', spellcheck: false, placeholder: tr('Procurar'), 'aria-label': tr('Procurar') });
  const caixa = h('div#busca-barra', img('localizar', 16), campo);
  let painel = null;
  let resultados = [];
  let ativo = 0;
  let pedido = 0;
  let timer = null;

  const fechar = () => { if (painel) { painel.remove(); painel = null; } };
  const escolher = (i) => {
    const r = resultados[i];
    fechar();
    campo.value = '';
    campo.blur();
    if (r) r.abrir();
  };
  const pesquisarNaInternet = () => {
    const n = (estado.config.navegador || {}).busca;
    const urls = { google: 'https://www.google.com/search?q=', bing: 'https://www.bing.com/search?q=' };
    abrirEndereco((urls[n] || 'https://duckduckgo.com/?q=') + encodeURIComponent(campo.value.trim()));
    fechar();
    campo.value = '';
    campo.blur();
  };
  const desenhar = () => {
    fechar();
    const termo = campo.value.trim();
    if (!termo) return;
    painel = h('div.busca-resultados');
    let grupo = null;
    resultados.forEach((r, i) => {
      if (r.grupo !== grupo) { grupo = r.grupo; painel.append(h('div.busca-grupo', tr(GRUPOS[grupo]))); }
      const ico = r.iconeUrl ? h('img.de-fora', { src: r.iconeUrl, width: 16, height: 16, alt: '' }) : img(r.icone, 16);
      const op = h('div.busca-item' + (i === ativo ? '.ativo' : ''), { title: r.dica || '' }, ico, h('span', r.rotulo), r.dica ? h('span.busca-dica', r.dica) : null);
      op.addEventListener('mousedown', (e) => { e.preventDefault(); escolher(i); });
      op.addEventListener('mouseenter', () => { ativo = i; desenhar(); });
      painel.append(op);
    });
    if (!resultados.length) painel.append(h('div.busca-vazio', tr('Nada encontrado no Retro Computer.')));
    const web = h('div.busca-item.web' + (ativo === resultados.length ? '.ativo' : ''), img('navegador', 16), h('span', tr('Pesquisar "{termo}" na internet', { termo })));
    web.addEventListener('mousedown', (e) => { e.preventDefault(); pesquisarNaInternet(); });
    painel.append(h('div.busca-grupo', tr('Internet')), web);
    document.getElementById('tela').append(painel);
    // Aberto para cima, sem passar da borda direita da tela.
    const r = caixa.getBoundingClientRect();
    const tela = document.getElementById('tela').getBoundingClientRect();
    painel.style.left = Math.max(0, Math.min(r.left, tela.width - painel.offsetWidth - 2)) + 'px';
    painel.style.bottom = (tela.bottom - r.top + 2) + 'px';
  };
  campo.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const meu = ++pedido;
      const r = await procurar(campo.value);
      if (meu !== pedido) return;
      resultados = r;
      ativo = 0;
      desenhar();
    }, 150);
  });
  campo.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); ativo = Math.min(resultados.length, ativo + 1); desenhar(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); ativo = Math.max(0, ativo - 1); desenhar(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (ativo < resultados.length) escolher(ativo); else if (campo.value.trim()) pesquisarNaInternet(); }
    else if (e.key === 'Escape') { fechar(); campo.value = ''; campo.blur(); }
  });
  campo.addEventListener('focus', () => { nativosGuardados = null; fecharCalendario(); });
  campo.addEventListener('blur', () => setTimeout(fechar, 150));
  return caixa;
}

