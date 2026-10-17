/*
 * Os temas da interface (Painel › Aparência › Tema): o PC clássico, o de sempre, e o Mac clássico,
 * inspirado no Mac OS 9.2 — o cinza-claro com o título listrado, a caixa de fechar à esquerda, a
 * barra de menus no alto da tela (barra-mac.js) e os ícones próprios dele (icones-mac/, desenhados
 * em ferramentas/icones-mac.py). Nada vem da Apple: as cores, os controles e os ícones são do projeto.
 *
 * O tema é a classe "tema-mac" na raiz da página (o estilo fica em tema-mac.css) e o caminho dos
 * ícones (caminhoIcone): o ícone que o tema Mac não tem fica o do PC.
 */
import { marcar } from './idioma.js';
import { ICONES_MAC } from './icones-mac.js';

export const TEMAS = { pc: marcar('PC clássico'), mac: marcar('Mac clássico') };

let atual = 'pc';
const ouvintes = new Set();

export const temaAtual = () => atual;
export const temaMac = () => atual === 'mac';

/** O endereço de um ícone no tema de agora ("icones/16/pasta.png" ou "icones-mac/16/pasta.png"). */
export function caminhoIcone(nome, tam) {
  return atual === 'mac' && ICONES_MAC.has(`${tam}/${nome}`) ? `icones-mac/${tam}/${nome}.png` : `icones/${tam}/${nome}.png`;
}

/** Avisa quando o tema muda: fn(tema). */
export function aoMudarTema(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

// Os ícones já na tela: o endereço de cada um (e a máscara da seleção, --ico) passa para o do tema novo.
const ICONE = /icones(?:-mac)?\/(16|32)\/([\w-]+)\.png/g;
const noTema = (texto) => texto.replace(ICONE, (_, tam, nome) => caminhoIcone(nome, Number(tam)));

function trocarIcones(raiz = document) {
  for (const im of raiz.querySelectorAll('img[src*="icones"]')) {
    const novo = noTema(im.getAttribute('src'));
    if (novo !== im.getAttribute('src')) im.setAttribute('src', novo);
  }
  for (const el of raiz.querySelectorAll('[style*="--ico"]')) {
    const v = el.style.getPropertyValue('--ico');
    if (v) el.style.setProperty('--ico', noTema(v));
  }
}

/** Aplica o tema ('pc' ou 'mac'): a classe da página, os ícones à vista e quem ouve. */
export function aplicarTema(tema) {
  const novo = tema === 'mac' ? 'mac' : 'pc';
  document.documentElement.classList.toggle('tema-mac', novo === 'mac');
  if (novo === atual) return;
  atual = novo;
  trocarIcones();
  for (const fn of ouvintes) { try { fn(novo); } catch (e) { console.error(e); } }
}
