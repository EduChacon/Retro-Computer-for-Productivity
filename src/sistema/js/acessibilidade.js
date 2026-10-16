/*
 * A acessibilidade (Painel de controle › Acessibilidade), na área de trabalho:
 *   - o alto contraste e o cursor grande (classes no <html>, com o estilo em estilo.css);
 *   - os avisos visuais dos sons: o título, a janela ou a tela piscam quando o sistema toca um
 *     som (também com os sons desligados);
 *   - a lupa (logotipo + "+" e "-"; logotipo + Esc fecha): a tela inteira ampliada em volta do
 *     ponteiro, como a do Windows. O ponto debaixo do ponteiro é o mesmo de sem a lupa, então
 *     basta levar o ponteiro até a beira para ver a beira.
 * As teclas de aderência e as do mouse são do Linux (o xkbset, no processo principal).
 */
import { estado, eventos } from './sistema.js';
import { aoTocar } from './sons.js';
import { janelaAtiva } from './janelas.js';
import { h } from './util.js';
import { tr } from './idioma.js';

const NIVEIS = [1, 1.5, 2, 3, 4];
let lupa = 1;
let aviso = null;
let tempoAviso = 0;
let quadro = 0;

const opcoes = () => (estado.config && estado.config.acessibilidade) || {};

export function aplicarAcessibilidade() {
  const a = opcoes();
  document.documentElement.classList.toggle('alto-contraste', !!a.altoContraste);
  document.documentElement.classList.toggle('cursor-grande', !!a.cursorGrande);
}

/** O aviso visual de um som: o título da janela ativa, a janela inteira ou a tela. */
export function piscar(modo = opcoes().avisoVisual || 'nada') {
  if (!modo || modo === 'nada') return;
  const j = janelaAtiva();
  const naTela = modo === 'tela' || !j;
  const alvo = naTela ? document.getElementById('tela') : j.el;
  const classe = naTela ? 'piscar-tela' : modo === 'titulo' ? 'piscar-titulo' : 'piscar-janela';
  alvo.classList.remove(classe);
  void alvo.offsetWidth; // recomeça a animação
  alvo.classList.add(classe);
  setTimeout(() => alvo.classList.remove(classe), 700);
}

function mostrarAviso(texto) {
  if (!aviso) {
    aviso = h('div.lupa-aviso', { role: 'status' });
    document.body.append(aviso);
  }
  aviso.textContent = texto;
  aviso.hidden = false;
  clearTimeout(tempoAviso);
  tempoAviso = setTimeout(() => { aviso.hidden = true; }, 2000);
}

function seguirPonteiro(e) {
  if (lupa === 1 || quadro) return;
  quadro = requestAnimationFrame(() => {
    quadro = 0;
    const tela = document.getElementById('tela');
    tela.style.setProperty('--lupa-x', e.clientX + 'px');
    tela.style.setProperty('--lupa-y', e.clientY + 'px');
  });
}

/** Aumenta (+1), diminui (-1) ou fecha (0) a lupa. */
export function mudarLupa(passo) {
  const i = NIVEIS.indexOf(lupa);
  lupa = passo === 0 ? 1 : NIVEIS[Math.max(0, Math.min(NIVEIS.length - 1, i + passo))];
  const tela = document.getElementById('tela');
  tela.classList.toggle('com-lupa', lupa > 1);
  tela.style.setProperty('--lupa', String(lupa));
  if (lupa > 1) document.addEventListener('mousemove', seguirPonteiro, { passive: true });
  else document.removeEventListener('mousemove', seguirPonteiro);
  mostrarAviso(lupa > 1 ? tr('Lupa: {n}% (logotipo + Esc para fechar)', { n: Math.round(lupa * 100) }) : tr('Lupa fechada'));
}

export const nivelLupa = () => lupa;

export function iniciarAcessibilidade() {
  aplicarAcessibilidade();
  eventos.on('config', () => aplicarAcessibilidade());
  aoTocar(() => piscar());
}
