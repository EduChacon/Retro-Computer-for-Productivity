/*
 * Arrastar para reorganizar os botões de uma faixa (a barra de tarefas, a barra de favoritos do
 * Navegador), como no Windows de hoje: depois de alguns pontos, o clique vira arrasto; o botão troca
 * de lugar com o vizinho quando o ponteiro passa do meio dele, com o contorno pontilhado da época
 * (a classe "arrastado"), e soltar entrega os botões na ordem nova. O clique de soltar não chega ao
 * botão (não abre nem minimiza nada). Funciona com o mouse, a caneta e o dedo.
 */

const LIMIAR = 5; // pontos antes de o clique virar arrasto
let arrasto = null; // { b, faixa, x0, y0, id, movido, aoSoltar, depois }

/** Há um botão sendo arrastado agora? (Quem redesenha a faixa espera o fim.) */
export const arrastando = () => !!(arrasto && arrasto.movido);

/**
 * Um botão que se reorganiza arrastando dentro da faixa dele. aoSoltar recebe os botões da faixa
 * na ordem nova; depois (opcional) roda no fim de todo arrasto, também no cancelado.
 */
export function reorganizavel(b, faixa, aoSoltar, { depois } = {}) {
  b.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    arrasto = { b, faixa, x0: e.clientX, y0: e.clientY, id: e.pointerId, movido: false, aoSoltar, depois };
  });
}

const botoesDe = (faixa) => [...faixa.children].filter((x) => x.tagName === 'BUTTON' && !x.hidden);

function mover(e) {
  const a = arrasto;
  if (!a || e.pointerId !== a.id) return;
  if (!a.b.isConnected) { arrasto = null; document.body.classList.remove('arrastando-faixa'); return; }
  if (!a.movido) {
    if (Math.abs(e.clientX - a.x0) < LIMIAR && Math.abs(e.clientY - a.y0) < LIMIAR) return;
    a.movido = true;
    try { a.b.setPointerCapture(a.id); } catch { }
    a.b.classList.add('arrastado');
    document.body.classList.add('arrastando-faixa');
  }
  // O lugar novo: antes do primeiro vizinho cujo meio fica à direita do ponteiro.
  const outros = botoesDe(a.faixa).filter((x) => x !== a.b);
  const antesDe = outros.find((x) => { const r = x.getBoundingClientRect(); return e.clientX < r.left + r.width / 2; }) || null;
  if (antesDe) { if (a.b.nextElementSibling !== antesDe) a.faixa.insertBefore(a.b, antesDe); }
  else if (outros.length && a.b.previousElementSibling !== outros[outros.length - 1]) outros[outros.length - 1].after(a.b);
}

function soltar(e) {
  const a = arrasto;
  if (!a || e.pointerId !== a.id) return;
  arrasto = null;
  if (!a.movido) return;
  a.b.classList.remove('arrastado');
  document.body.classList.remove('arrastando-faixa');
  // O clique que vem depois de soltar não abre nem minimiza nada.
  const parar = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
  window.addEventListener('click', parar, { capture: true, once: true });
  setTimeout(() => window.removeEventListener('click', parar, { capture: true }), 0);
  if (e.type === 'pointerup' && a.b.isConnected) a.aoSoltar(botoesDe(a.faixa));
  if (a.depois) a.depois(e.type === 'pointerup');
}

window.addEventListener('pointermove', mover);
window.addEventListener('pointerup', soltar);
window.addEventListener('pointercancel', soltar);
