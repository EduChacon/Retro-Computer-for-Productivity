/*
 * Controles comuns às janelas: o controle deslizante da época (o volume e o brilho da
 * bandeja, a posição e o volume do Reprodutor de mídia).
 */
import { h } from './util.js';

/**
 * Um controle deslizante (de pé ou deitado), com o mouse, o dedo e o teclado.
 * tamanho: em pontos, ou 'flex' (ocupa o espaço que sobrar na linha).
 * mostrar(n) muda a posição sem avisar (o progresso do vídeo); arrastando() diz se o
 * usuário está segurando a pega.
 */
export function deslizante({ valor, min = 0, max = 100, vertical = false, tamanho = 120, rotulo, aoMudar, aoSoltar, passo = 2, passoGrande = 10 }) {
  const pega = h('div.desl-pega');
  const flex = tamanho === 'flex';
  const el = h('div.deslizante' + (vertical ? '.vertical' : '') + (flex ? '.flex' : ''), {
    tabIndex: 0, role: 'slider', 'aria-label': rotulo, 'aria-valuemin': min, 'aria-valuemax': max,
    style: flex ? {} : vertical ? { height: tamanho + 'px' } : { width: tamanho + 'px' },
  }, h('div.desl-trilho'), pega);
  let v = valor;
  let segurando = false;
  const curso = () => (flex ? Math.max(0, (vertical ? el.clientHeight : el.clientWidth) - 11) : tamanho - 11);
  const posicionar = () => {
    const f = max > min ? (v - min) / (max - min) : 0;
    if (vertical) pega.style.top = Math.round((1 - f) * curso()) + 'px';
    else pega.style.left = Math.round(f * curso()) + 'px';
    el.setAttribute('aria-valuenow', Math.round(v));
  };
  const definir = (n) => {
    n = Math.max(min, Math.min(max, flex ? n : Math.round(n)));
    if (n === v) return;
    v = n;
    posicionar();
    if (aoMudar) aoMudar(v);
  };
  const doPonteiro = (e) => {
    const r = el.getBoundingClientRect();
    const f = vertical ? 1 - (e.clientY - r.top - 5) / (r.height - 11) : (e.clientX - r.left - 5) / (r.width - 11);
    definir(min + Math.max(0, Math.min(1, f)) * (max - min));
  };
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    el.focus();
    el.setPointerCapture(e.pointerId);
    segurando = true;
    doPonteiro(e);
    const mover = (ev) => doPonteiro(ev);
    const soltar = () => {
      segurando = false;
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerup', soltar);
      el.removeEventListener('pointercancel', soltar);
      if (aoSoltar) aoSoltar(v);
    };
    el.addEventListener('pointermove', mover);
    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', soltar);
  });
  el.addEventListener('keydown', (e) => {
    const p = { ArrowUp: passo, ArrowRight: passo, ArrowDown: -passo, ArrowLeft: -passo, PageUp: passoGrande, PageDown: -passoGrande }[e.key];
    if (p) definir(v + p);
    else if (e.key === 'Home') definir(min);
    else if (e.key === 'End') definir(max);
    else return;
    e.preventDefault();
    e.stopPropagation();
  });
  el.addEventListener('keyup', (e) => { if (aoSoltar && /^(Arrow|Page|Home|End)/.test(e.key)) aoSoltar(v); });
  el.addEventListener('wheel', (e) => { e.preventDefault(); definir(v + (e.deltaY < 0 ? passoGrande / 2 : -passoGrande / 2)); if (aoSoltar) aoSoltar(v); }, { passive: false });
  if (flex) new ResizeObserver(posicionar).observe(el);
  posicionar();
  return {
    el,
    definir,
    valor: () => v,
    arrastando: () => segurando,
    mostrar(n) { if (!segurando) { v = Math.max(min, Math.min(max, n)); posicionar(); } },
    limites(novoMin, novoMax) { min = novoMin; max = novoMax; el.setAttribute('aria-valuemax', max); posicionar(); },
  };
}
