'use strict';
/*
 * As duas telas em tela cheia, fora do modo sistema (Windows e Mac): a janela do Retro Computer cobre
 * todos os monitores ligados, e a área de trabalho fica sabendo onde cada um começa e termina (a
 * barra de tarefas e os ícones na principal, cada janela maximizada na tela em que está). Aqui ficam
 * as contas, sem o Electron (testadas em testes/monitores.test.js), e os monitores de mentira dos
 * testes e das capturas (RETRO_MONITORES_FALSOS).
 */

/** O retângulo que junta todos ({ x, y, width, height }). */
function uniao(rets) {
  const lista = (rets || []).filter((r) => r && r.width > 0 && r.height > 0);
  if (!lista.length) return null;
  const x0 = Math.min(...lista.map((r) => r.x));
  const y0 = Math.min(...lista.map((r) => r.y));
  const x1 = Math.max(...lista.map((r) => r.x + r.width));
  const y1 = Math.max(...lista.map((r) => r.y + r.height));
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/**
 * Os monitores vistos de dentro da janela: o pedaço de cada um que ela cobre, a partir do canto de
 * cima à esquerda do conteúdo, divididos pela escala da janela (os pontos que a página enxerga). Um
 * pedaço muito pequeno (a janela só encostando no outro monitor) não conta. Sem principal entre
 * eles, a maior fica sendo.
 */
function telasNaJanela(janela, monitores, escala = 1) {
  const k = escala > 0 ? escala : 1;
  const r = [];
  for (const m of monitores || []) {
    const x0 = Math.max(janela.x, m.x);
    const y0 = Math.max(janela.y, m.y);
    const x1 = Math.min(janela.x + janela.width, m.x + m.width);
    const y1 = Math.min(janela.y + janela.height, m.y + m.height);
    if (x1 - x0 < 100 || y1 - y0 < 100) continue;
    r.push({ x: (x0 - janela.x) / k, y: (y0 - janela.y) / k, w: (x1 - x0) / k, h: (y1 - y0) / k, principal: !!m.principal });
  }
  if (r.length && !r.some((t) => t.principal)) r.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a)).principal = true;
  return r;
}

/**
 * Os monitores de mentira: "1024x768+0+0,1280x800+1024+0" (largura x altura + x + y; o primeiro é o
 * principal). Devolve null se o texto não servir.
 */
function monitoresFalsos(texto) {
  if (!texto) return null;
  const lista = String(texto).split(',').map((s, i) => {
    const m = /^\s*(\d+)x(\d+)\+(-?\d+)\+(-?\d+)\s*$/.exec(s);
    if (!m) return null;
    const [w, h, x, y] = m.slice(1).map(Number);
    return { id: 9000 + i, x, y, width: w, height: h, principal: i === 0, escala: 1 };
  });
  return lista.length && lista.every(Boolean) ? lista : null;
}

/**
 * No Mac, uma janela só aparece em mais de um monitor quando os monitores não têm Spaces separados:
 * "defaults read com.apple.spaces spans-displays" responde 1. Sem a chave (o padrão do Mac), são
 * separados.
 */
function spacesJuntos(saida) {
  return String(saida || '').trim() === '1';
}

module.exports = { uniao, telasNaJanela, monitoresFalsos, spacesJuntos };
