/*
 * O computador pensa aqui, num Worker, para a janela não travar enquanto ele escolhe o lance.
 * Recebe a partida (o xadrez pelo FEN de início e os lances; as damas pelo tabuleiro) e devolve
 * o lance escolhido.
 */
import { Xadrez, melhorLance as lanceXadrez } from './xadrez.js';
import { Damas, melhorLance as lanceDamas } from './damas.js';

export function pensar(d) {
  if (d.jogo === 'xadrez') {
    const x = new Xadrez(d.fen);
    for (const u of d.lances || []) {
      const m = x.deUci(u);
      if (!m) break;
      x.jogar(m);
    }
    const m = lanceXadrez(x, d.nivel);
    return { uci: m ? Xadrez.uci(m) : null };
  }
  const j = new Damas(d.regra, d.t, d.vez);
  j.semTomar = d.semTomar || 0;
  if (d.chaves) j.chaves = d.chaves;
  const m = lanceDamas(j, d.nivel);
  return { lance: m ? { de: m.de, caminho: m.caminho } : null };
}

if (typeof self !== 'undefined' && typeof self.postMessage === 'function' && typeof window === 'undefined') {
  self.onmessage = (e) => {
    let r;
    try {
      r = pensar(e.data);
    } catch (erro) {
      r = { erro: String(erro && erro.message || erro) };
    }
    self.postMessage({ id: e.data.id, ...r });
  };
}
