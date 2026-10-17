/*
 * Os esquemas de cores do PC clássico (Painel › Aparência › Tema), como os da época: a face das
 * janelas e dos botões com a luz e a sombra do relevo, a barra de título, a seleção, os campos e o
 * texto. Os nomes e as cores são do projeto. Os escuros invertem a claridade (o texto claro nos
 * campos escuros) e trocam os desenhos que eram pretos (as setas, a marca, a bolinha da opção).
 *
 * O esquema é uma regra "html:not(.tema-mac)" com as variáveis do estilo.css, posta num <style> da
 * página: o tema Mac clássico tem as cores próprias e não muda. O Padrão não põe nada (fica o estilo.css).
 */
import { marcar } from './idioma.js';

// Cada esquema: as cores (as mesmas variáveis do :root do estilo.css) e o fundo da área de trabalho.
const CLARO = { escuro: '#0a0a0a', titulo_texto: '#ffffff', selecao_texto: '#ffffff', link: '#0000ee', texto: '#000000', janela: '#ffffff', alerta: '#800000', sucesso: '#008000', dica: '#ffffe1' };
const ESCURO = { escuro: '#000000', titulo_texto: '#ffffff', selecao_texto: '#ffffff' };

export const ESQUEMAS = Object.freeze({
  // O Padrão é o do estilo.css (a página fica sem a regra); as cores aqui servem à prévia do Painel.
  padrao: { nome: marcar('Padrão'), mesa: '#008080', cores: { ...CLARO, face: '#c0c0c0', luz: '#ffffff', luz2: '#dfdfdf', sombra: '#808080', titulo: '#000080', titulo_inativo: '#808080', titulo_inativo_texto: '#c0c0c0', selecao: '#000080', texto_meio: '#404040', texto_fraco: '#808080', destaque: '#000080' } },
  areia: { nome: marcar('Areia'), mesa: '#a08a5c', cores: { ...CLARO, face: '#d6cfb8', luz: '#fbf8ef', luz2: '#e8e2d0', sombra: '#8f8670', titulo: '#7a5c2e', titulo_inativo: '#a89f88', titulo_inativo_texto: '#e8e2d0', selecao: '#7a5c2e', dica: '#fff8dc', janela: '#fffdf6', texto_meio: '#4a4234', texto_fraco: '#8f8670', destaque: '#6a4c1e', sucesso: '#406000' } },
  ardosia: { nome: marcar('Ardósia'), mesa: '#4e6074', cores: { ...CLARO, face: '#b4bcc6', luz: '#f4f7fa', luz2: '#d6dce3', sombra: '#6e7884', titulo: '#3c4e64', titulo_inativo: '#8a949f', titulo_inativo_texto: '#d6dce3', selecao: '#3c4e64', texto_meio: '#3a424c', texto_fraco: '#6e7884', destaque: '#2c3e54' } },
  berinjela: { nome: marcar('Berinjela'), mesa: '#584468', cores: { ...CLARO, face: '#b8b0c4', luz: '#f6f2fa', luz2: '#dad3e3', sombra: '#766c84', titulo: '#4a2c5e', titulo_inativo: '#958aa3', titulo_inativo_texto: '#dad3e3', selecao: '#4a2c5e', texto_meio: '#403848', texto_fraco: '#766c84', destaque: '#4a2c5e' } },
  musgo: { nome: marcar('Musgo'), mesa: '#556b3f', cores: { ...CLARO, face: '#b6c0a6', luz: '#f5f8ef', luz2: '#d9e0cd', sombra: '#737d62', titulo: '#3e5a2a', titulo_inativo: '#929c80', titulo_inativo_texto: '#d9e0cd', selecao: '#3e5a2a', texto_meio: '#3c4432', texto_fraco: '#737d62', destaque: '#3e5a2a' } },
  oceano: { nome: marcar('Oceano'), mesa: '#1e4e60', cores: { ...CLARO, face: '#b0c6cc', luz: '#f2f9fb', luz2: '#d4e3e7', sombra: '#6a8188', titulo: '#00506e', titulo_inativo: '#8aa0a6', titulo_inativo_texto: '#d4e3e7', selecao: '#00506e', texto_meio: '#344448', texto_fraco: '#6a8188', destaque: '#00506e' } },
  tijolo: { nome: marcar('Tijolo'), mesa: '#74402c', cores: { ...CLARO, face: '#c8b4a4', luz: '#faf3ee', luz2: '#e3d4c9', sombra: '#866e5e', titulo: '#8a2a14', titulo_inativo: '#a8907e', titulo_inativo_texto: '#e3d4c9', selecao: '#8a2a14', texto_meio: '#4a3a30', texto_fraco: '#866e5e', destaque: '#8a2a14' } },
  rosa: { nome: marcar('Rosa antigo'), mesa: '#9a6a76', cores: { ...CLARO, face: '#d4bcc0', luz: '#fdf5f6', luz2: '#ead8db', sombra: '#937a7f', titulo: '#8c4658', titulo_inativo: '#b09a9e', titulo_inativo_texto: '#ead8db', selecao: '#8c4658', texto_meio: '#4c3a3e', texto_fraco: '#937a7f', destaque: '#8c4658' } },
  noite: { nome: marcar('Noite (escuro)'), escuro: true, mesa: '#10202c', cores: { ...ESCURO, face: '#3c3c3c', luz: '#6c6c6c', luz2: '#525252', sombra: '#1e1e1e', titulo: '#1c3a6e', titulo_inativo: '#2c2c2c', titulo_inativo_texto: '#8a8a8a', selecao: '#2e5aa0', dica: '#3a3828', link: '#8cb4ff', texto: '#e6e6e6', janela: '#1c1c1c', texto_meio: '#b8b8b8', texto_fraco: '#8a8a8a', destaque: '#8cb4ff', alerta: '#ff8a80', sucesso: '#7fd07f' } },
  meianoite: { nome: marcar('Meia-noite (escuro)'), escuro: true, mesa: '#0c1222', cores: { ...ESCURO, face: '#2a3346', luz: '#56637e', luz2: '#3e4a62', sombra: '#141a26', titulo: '#4a3a8a', titulo_inativo: '#222a3a', titulo_inativo_texto: '#7d88a0', selecao: '#4a62b8', dica: '#30364a', link: '#9bb4ff', texto: '#dfe6f2', janela: '#161c28', texto_meio: '#aab6cc', texto_fraco: '#7d88a0', destaque: '#9bb4ff', alerta: '#ff9090', sucesso: '#80d090' } },
  fosforo: { nome: marcar('Fósforo verde (escuro)'), escuro: true, mesa: '#0e1a10', cores: { ...ESCURO, face: '#2e332e', luz: '#5c665c', luz2: '#444c44', sombra: '#161a16', titulo: '#1e5a2e', titulo_inativo: '#262a26', titulo_inativo_texto: '#7a867a', selecao: '#2e7a3e', dica: '#2a3a2a', link: '#8ce09c', texto: '#d8e8d8', janela: '#141814', texto_meio: '#a8bca8', texto_fraco: '#7a867a', destaque: '#8ce09c', alerta: '#ff9080', sucesso: '#8ce09c' } },
  ambar: { nome: marcar('Âmbar (escuro)'), escuro: true, mesa: '#20160c', cores: { ...ESCURO, face: '#3a332a', luz: '#6c6252', luz2: '#50473a', sombra: '#1c1712', titulo: '#7a4a10', titulo_inativo: '#2e2820', titulo_inativo_texto: '#8c8070', selecao: '#9a6418', dica: '#3e3420', link: '#ffc070', texto: '#f0e0c8', janela: '#1c1712', texto_meio: '#c8b8a0', texto_fraco: '#8c8070', destaque: '#ffc070', alerta: '#ff9078', sucesso: '#b8d878' } },
});

export const esquemaValido = (id) => (Object.prototype.hasOwnProperty.call(ESQUEMAS, id) ? id : 'padrao');

// Os desenhos do estilo.css que tinham a cor fixa, com a cor do esquema.
const svg = (w, h, partes) => {
  const corpo = partes.map(([cor, d]) => `<path fill='${cor}' d='${d}'/>`).join('');
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' shape-rendering='crispEdges'>${corpo}</svg>`)}")`;
};
const SETA_BAIXO = 'M0 0h7v1H6v1H5v1H4v1H3V3H2V2H1V1H0z';
const SETA_DIR = 'M0 0h1v1h1v1h1v1h1v1H3v1H2v1H1v1H0z';

function desenhos(c) {
  return {
    'seta-baixo': svg(7, 4, [[c.texto, SETA_BAIXO]]),
    'seta-cima': svg(7, 4, [[c.texto, 'M3 0h1v1h1v1h1v1h1v1H0V3h1V2h1V1h1z']]),
    'seta-esq': svg(4, 7, [[c.texto, 'M3 0h1v7H3V6H2V5H1V4H0V3h1V2h1V1h1z']]),
    'seta-dir': svg(4, 7, [[c.texto, SETA_DIR]]),
    'seta-dir-branca': svg(4, 7, [[c.selecao_texto, SETA_DIR]]),
    'seta-baixo-cinza': svg(7, 4, [[c.sombra, SETA_BAIXO]]),
    marca: svg(7, 7, [[c.texto, 'M6 0h1v3H6v1H5v1H4v1H3v1H2V6H1V5H0V2h1v1h1v1h1V3h1V2h1V1h1z']]),
    'ponto-radio': svg(12, 12, [[c.texto, 'M5 4h2v1h1v2H7v1H5V7H4V5h1z']]),
    radio: svg(12, 12, [
      [c.sombra, 'M4 0h4v1h2v1H8V1H4v1H2v2H1v4H0V4h1V2h1V1h2z'],
      [c.escuro, 'M4 1h4v1h2v1H8V2H4v1H3v1H2v4H1V4h1V3h1V2h1z'],
      [c.luz2, 'M10 3h1v5h-1v2H8v1H4v-1h4V9h1V8h1z'],
      [c.luz, 'M11 3h1v5h-1v2h-1v1H8v1H4v-1h4v-1h2V8h1z'],
      [c.janela, 'M2 2h8v8H2z'],
    ]),
    xadrez: svg(2, 2, [[c.luz, 'M0 0h1v1H0zM1 1h1v1H1z']]),
    'xadrez-azul': svg(2, 2, [[c.selecao, 'M0 0h1v1H0zM1 1h1v1H1z']]),
  };
}

/** As declarações das variáveis de um esquema ("--face: …;"), também as do Padrão (para a prévia). */
export function variaveisDoEsquema(id) {
  const c = ESQUEMAS[esquemaValido(id)].cores;
  const linhas = Object.entries(c).map(([k, v]) => `--${k.replace(/_/g, '-')}: ${v};`);
  for (const [k, v] of Object.entries(desenhos(c))) linhas.push(`--${k}: ${v};`);
  return linhas.join(' ');
}

/** O CSS de um esquema para a página inteira (só no PC clássico), ou '' no Padrão. */
export function estiloDoEsquema(id) {
  if (esquemaValido(id) === 'padrao') return '';
  const vars = variaveisDoEsquema(id);
  const e = ESQUEMAS[esquemaValido(id)];
  let css = `html:not(.tema-mac) { ${vars}${e.escuro ? ' color-scheme: dark;' : ''} }`;
  // No menu, a marca da opção escolhida fica com a cor do texto da seleção (no claro, ela é invertida).
  if (e.escuro) css += '\nhtml:not(.tema-mac) .menu .opcao.ativa.marcada::before { filter: none; }';
  // A faixa do Iniciar: o nome no cinza do texto apagado (a face some na sombra escura).
  if (e.escuro) css += '\nhtml:not(.tema-mac) .menu.iniciar .faixa span { color: var(--texto-fraco); }';
  return css;
}

let atual = 'padrao';
export const esquemaAtual = () => atual;

/** Aplica o esquema na página (e a classe "esquema-escuro" na raiz, para o que precisa saber). */
export function aplicarEsquema(id) {
  atual = esquemaValido(id);
  let el = document.getElementById('esquema-cores');
  const css = estiloDoEsquema(atual);
  if (!css) { if (el) el.remove(); }
  else {
    if (!el) { el = document.createElement('style'); el.id = 'esquema-cores'; document.head.append(el); }
    el.textContent = css;
  }
  document.documentElement.classList.toggle('esquema-escuro', !!ESQUEMAS[atual].escuro);
}

/**
 * O fundo ao trocar de esquema: o fundo de sempre de um vira o do outro (o escolhido pelo usuário,
 * uma imagem ou outra cor, fica como está). Como o fundoParaTema, de aparencia.js.
 */
export function fundoParaEsquema(papel, de, para) {
  const p = papel || {};
  const a = ESQUEMAS[esquemaValido(de)];
  const b = ESQUEMAS[esquemaValido(para)];
  const igual = !p.imagem && (p.cor || '#008080').toLowerCase() === a.mesa && (p.padrao || 'nenhum') === 'nenhum';
  return igual ? { ...p, cor: b.mesa, padrao: 'nenhum' } : p;
}
