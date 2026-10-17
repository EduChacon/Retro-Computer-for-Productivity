/*
 * Arrastar para reorganizar as peças de uma faixa (a barra de tarefas, as abas e a barra de
 * favoritos do Navegador) ou de uma grade (os ícones da página inicial), como no Windows de hoje:
 * depois de alguns pontos, o clique vira arrasto; a peça troca de lugar com a vizinha quando o
 * ponteiro passa do meio dela, com o contorno pontilhado da época (a classe "arrastado"), e soltar
 * entrega as peças na ordem nova. Uma peça pode aceitar outra dentro dela (uma pasta de favoritos):
 * com o ponteiro no miolo dela, ela fica marcada ("alvo-soltar") e soltar a entrega a aoEntrar. O
 * clique de soltar não chega à peça (não abre nem minimiza nada). Funciona com o mouse, a caneta e
 * o dedo.
 */

const LIMIAR = 5; // pontos antes de o clique virar arrasto
let arrasto = null; // { b, faixa, x0, y0, id, movido, alvo, o }

/** Há uma peça sendo arrastada agora (nesta faixa, se dada)? Quem redesenha a faixa espera o fim. */
export const arrastando = (faixa) => !!(arrasto && arrasto.movido && (!faixa || arrasto.faixa === faixa));

/**
 * Uma peça que se reorganiza arrastando dentro da faixa dela. aoSoltar recebe as peças da faixa na
 * ordem nova. As opções:
 *   seletor   as peças da faixa (o padrão: os botões);
 *   grade     a faixa quebra em linhas (a ordem segue a leitura: as linhas de cima vêm antes);
 *   dentro    (alvo, peça) → a peça pode ser solta dentro do alvo?
 *   aoEntrar  (peça, alvo) ao soltar dentro de um alvo (no lugar de aoSoltar);
 *   depois    roda no fim de todo arrasto, também no cancelado (recebe se soltou).
 */
export function reorganizavel(b, faixa, aoSoltar, o = {}) {
  b.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    arrasto = { b, faixa, x0: e.clientX, y0: e.clientY, id: e.pointerId, movido: false, alvo: null, aoSoltar, o };
  });
}

const pecasDe = (a) => [...a.faixa.children].filter((x) => x.matches(a.o.seletor || 'button') && !x.hidden);

// O ponteiro está antes da peça? Na faixa, pela metade da largura; na grade, também pela linha.
function antesDe(a, x, y, r) {
  if (!a.o.grade) return x < r.left + r.width / 2;
  return y < r.top || (y <= r.bottom && x < r.left + r.width / 2);
}

// O miolo de uma peça que aceita outra dentro: a metade do meio (na faixa, só a largura conta).
function noMiolo(a, x, y, r) {
  const mx = r.width / 4;
  const my = a.o.grade ? r.height / 5 : 0;
  return x > r.left + mx && x < r.right - mx && y >= r.top + my && y <= r.bottom - my;
}

function marcarAlvo(a, alvo) {
  if (a.alvo === alvo) return;
  if (a.alvo) a.alvo.classList.remove('alvo-soltar');
  a.alvo = alvo;
  if (alvo) alvo.classList.add('alvo-soltar');
}

function mover(e) {
  const a = arrasto;
  if (!a || e.pointerId !== a.id) return;
  if (!a.b.isConnected) { marcarAlvo(a, null); arrasto = null; document.body.classList.remove('arrastando-faixa'); return; }
  if (!a.movido) {
    if (Math.abs(e.clientX - a.x0) < LIMIAR && Math.abs(e.clientY - a.y0) < LIMIAR) return;
    a.movido = true;
    try { a.b.setPointerCapture(a.id); } catch { }
    a.b.classList.add('arrastado');
    document.body.classList.add('arrastando-faixa');
  }
  const outros = pecasDe(a).filter((x) => x !== a.b);
  // Sobre o miolo de uma pasta: a peça vai para dentro dela, e a ordem não muda.
  const alvo = a.o.dentro && outros.find((x) => a.o.dentro(x, a.b) && noMiolo(a, e.clientX, e.clientY, x.getBoundingClientRect()));
  marcarAlvo(a, alvo || null);
  if (alvo) return;
  // O lugar novo: antes da primeira vizinha que fica depois do ponteiro.
  const proxima = outros.find((x) => antesDe(a, e.clientX, e.clientY, x.getBoundingClientRect())) || null;
  if (proxima) { if (a.b.nextElementSibling !== proxima) a.faixa.insertBefore(a.b, proxima); }
  else if (outros.length && a.b.previousElementSibling !== outros[outros.length - 1]) outros[outros.length - 1].after(a.b);
}

function soltar(e) {
  const a = arrasto;
  if (!a || e.pointerId !== a.id) return;
  arrasto = null;
  if (!a.movido) return;
  const alvo = a.alvo;
  marcarAlvo(a, null);
  a.b.classList.remove('arrastado');
  document.body.classList.remove('arrastando-faixa');
  // O clique que vem depois de soltar não abre nem minimiza nada.
  const parar = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
  window.addEventListener('click', parar, { capture: true, once: true });
  setTimeout(() => window.removeEventListener('click', parar, { capture: true }), 0);
  const soltou = e.type === 'pointerup' && a.b.isConnected;
  if (soltou && alvo && a.o.aoEntrar) a.o.aoEntrar(a.b, alvo);
  else if (soltou) a.aoSoltar(pecasDe(a));
  if (a.o.depois) a.o.depois(e.type === 'pointerup');
}

window.addEventListener('pointermove', mover);
window.addEventListener('pointerup', soltar);
window.addEventListener('pointercancel', soltar);
