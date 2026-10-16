/*
 * A luz noturna (como no Linux Mint, no GNOME, no KDE e no Windows 10): à noite, as cores da
 * tela ficam mais quentes, com menos azul, para cansar menos a vista. No Retro Computer como
 * sistema do Linux, pela correção de gama do xrandr (vale também para os programas do Linux);
 * fora dele, um filtro por cima da área de trabalho. Configura-se em Painel › Aparência › Efeitos.
 */
import { h } from './util.js';
import { estado, eventos } from './sistema.js';

let filtro = null;
let aplicada = null; // a intensidade de agora (0 a 1), para não repetir o pedido
let peloSistema = null; // o xrandr cuida (modo sistema)?

/** Ligada agora? "noite" vale das de às ate horas (passando da meia-noite); "sempre", o dia todo. */
export function ligadaAgora(c, agora = new Date()) {
  if (!c || !c.ligada) return false;
  if (c.quando === 'sempre') return true;
  const hora = agora.getHours() + agora.getMinutes() / 60;
  const de = Number.isFinite(Number(c.de)) ? Number(c.de) : 20;
  const ate = Number.isFinite(Number(c.ate)) ? Number(c.ate) : 7;
  if (de === ate) return true;
  return de < ate ? hora >= de && hora < ate : hora >= de || hora < ate;
}

/** A força do filtro, de 0,1 (quase nada) a 1. */
export function intensidadeDe(c) {
  const n = Number(c && c.intensidade);
  return Math.max(10, Math.min(100, Number.isFinite(n) ? n : 50)) / 100;
}

/** A cor do filtro (multiplicada pelas da tela): a mesma conta da gama do xrandr. */
export function corDoFiltro(k) {
  return `rgb(255, ${Math.round(255 * (1 - 0.28 * k))}, ${Math.round(255 * (1 - 0.58 * k))})`;
}

/** Aplica a luz noturna conforme a configuração (e a hora); com previa, mostra essa sem guardar. */
export async function aplicarLuzNoturna(previa) {
  const c = previa || (estado.config || {}).luzNoturna || {};
  const k = previa ? (c.ligada ? intensidadeDe(c) : 0) : (ligadaAgora(c) ? intensidadeDe(c) : 0);
  if (k === aplicada) return;
  aplicada = k;
  if (peloSistema === null) peloSistema = await retro.tela.modos().then((t) => !!(t && t.disponivel)).catch(() => false);
  if (peloSistema) {
    const r = await retro.tela.luzNoturna(k).catch(() => null);
    if (r && r.ok) return;
    peloSistema = false; // sem o xrandr (ou com erro), o filtro da página faz o trabalho
  }
  if (!filtro) {
    filtro = h('div#luz-noturna', { 'aria-hidden': 'true' });
    document.body.append(filtro);
  }
  filtro.style.background = corDoFiltro(k);
  filtro.hidden = k === 0;
}

export function iniciarLuzNoturna() {
  aplicarLuzNoturna();
  eventos.on('config', () => aplicarLuzNoturna());
  // A virada da hora (às 20h liga, às 7h desliga): uma olhada por minuto basta.
  setInterval(() => aplicarLuzNoturna(), 60 * 1000);
}
