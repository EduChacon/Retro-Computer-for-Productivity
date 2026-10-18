/*
 * As janelas dos programas do Linux na barra de tarefas (no Retro Computer como sistema).
 * Cada uma vira um objeto com a mesma cara das janelas do Retro Computer (titulo, focar,
 * minimizar, fechar), para a barra tratar todas do mesmo jeito. Quem lista e comanda é o
 * processo principal (janelas-linux.js de lá, pelo wmctrl).
 */
import { Eventos } from './util.js';

export const eventosNativas = new Eventos();
let atual = { lista: [], retroAtivo: true };

function receber(r) {
  atual = r && Array.isArray(r.lista) ? r : { lista: [], retroAtivo: true };
  document.body.classList.toggle('fora-de-foco', !retroAtivo());
  eventosNativas.emit('mudou');
}

if (window.retro && retro.janelasLinux) {
  retro.janelasLinux.aoMudar(receber);
  retro.janelasLinux.listar().then(receber).catch(() => { });
  vigiarFaixas();
}

/**
 * As faixas das barras do Retro Computer, em pontos da tela: a barra de tarefas embaixo e, no tema
 * Mac, a barra de menus em cima. O Openbox as recebe como margens (no modo sistema), e as janelas
 * do Linux maximizadas encostam nelas, sem cobrir a barra nem deixar fresta.
 */
export function faixasDasBarras() {
  const alt = window.innerHeight;
  let cima = 0;
  let baixo = 0;
  for (const id of ['barra', 'barra-mac']) {
    const el = document.getElementById(id);
    if (!el || getComputedStyle(el).display === 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.height <= 0 || r.width < 300) continue;
    if (r.top <= 1) cima = Math.max(cima, r.bottom);
    else if (r.bottom >= alt - 1) baixo = Math.max(baixo, alt - r.top);
  }
  const k = window.devicePixelRatio || 1;
  // O tamanho dos pixels vai junto: a moldura das janelas do Linux (o tema do Openbox) cresce com ele.
  return { cima: Math.round(cima * k), baixo: Math.round(baixo * k), escala: Math.round(k * 100) / 100 };
}

/** Manda as faixas de novo quando a barra muda de altura (a data no relógio, o tamanho dos pixels, o tema). */
function vigiarFaixas() {
  let ultima = '';
  let espera = null;
  const enviar = () => {
    clearTimeout(espera);
    espera = setTimeout(() => {
      const f = faixasDasBarras();
      const chave = `${f.cima},${f.baixo},${f.escala}`;
      if (chave === ultima || (!f.cima && !f.baixo)) return;
      ultima = chave;
      retro.janelasLinux.margens(f).catch(() => { });
    }, 300);
  };
  const medir = new ResizeObserver(enviar);
  for (const id of ['barra', 'barra-mac']) { const el = document.getElementById(id); if (el) medir.observe(el); }
  window.addEventListener('resize', enviar);
  new MutationObserver(enviar).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}

/** O Retro Computer está na frente (nenhuma janela do Linux ativa)? */
export const retroAtivo = () => atual.retroAtivo !== false;

/** As janelas do Linux, como objetos parecidos com as do Retro Computer. */
export function janelasNativas() {
  return atual.lista.map((j) => ({
    nativa: true,
    id: j.id,
    titulo: j.titulo,
    // As do Firefox do Retro Computer são do Navegador (o mesmo ícone e o mesmo botão fixado).
    icone: j.programa === 'retro:navegador' ? 'navegador' : 'programa',
    programa: j.programa === 'retro:navegador' ? 'navegador' : j.programa ? 'nativo:' + j.programa : null,
    ativa: !!j.ativa,
    minimizada: false,
    maximizada: false,
    focar: () => retro.janelasLinux.ativar(j.id),
    minimizar: () => retro.janelasLinux.minimizar(j.id),
    fechar: async () => { await retro.janelasLinux.fechar(j.id); return true; },
    restaurar: () => retro.janelasLinux.ativar(j.id),
    maximizar: () => retro.janelasLinux.ativar(j.id),
  }));
}

/** Antes da tela de bloqueio: nenhuma janela do Linux fica por cima. */
export function minimizarNativas() {
  if (!atual.lista.length || !window.retro || !retro.janelasLinux) return Promise.resolve(0);
  return retro.janelasLinux.minimizarTodas().catch(() => 0);
}
