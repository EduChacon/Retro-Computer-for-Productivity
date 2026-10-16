/*
 * As regras das damas, sem a tela (para os testes no Node e para o computador pensar num
 * Worker). Duas regras: as brasileiras (o padrão: a pedra toma para trás, a dama anda e toma de
 * longe, e é obrigatório tomar o maior número de peças) e as inglesas (as "checkers" dos Estados
 * Unidos: a pedra só toma para a frente, a dama anda uma casa, as pretas começam e a pedra que
 * chega à última fila para ali). Sem nenhum import.
 *
 * O tabuleiro é uma lista de 64 casas (a casa 0 é a do alto à esquerda, a 63 a de baixo à
 * direita); as peças só ficam nas casas escuras. As brancas ficam embaixo e sobem. 1 é a pedra
 * branca, 2 a dama branca, -1 e -2 as das pretas.
 */

export const REGRAS = {
  brasileiras: { comeca: 1, tomaParaTras: true, damaVoa: true, maioria: true, paraAoCoroar: false, semProgresso: 40 },
  inglesas: { comeca: -1, tomaParaTras: false, damaVoa: false, maioria: false, paraAoCoroar: true, semProgresso: 80 },
};

export const escura = (c) => ((c >> 3) + (c & 7)) % 2 === 1;
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

// Os raios de cada casa nas quatro diagonais.
const RAIOS = [];
for (let c = 0; c < 64; c++) {
  RAIOS[c] = DIAG.map(([dl, dk]) => {
    const r = [];
    for (let n = 1; ; n++) {
      const l = (c >> 3) + dl * n;
      const k = (c & 7) + dk * n;
      if (l < 0 || l > 7 || k < 0 || k > 7) break;
      r.push(l * 8 + k);
    }
    return r;
  });
}

/** A posição inicial: as pretas nas três primeiras filas, as brancas nas três últimas. */
export function inicial() {
  const t = new Int8Array(64);
  for (let c = 0; c < 64; c++) {
    if (!escura(c)) continue;
    if (c < 24) t[c] = -1;
    else if (c >= 40) t[c] = 1;
  }
  return t;
}

/**
 * Um lance: { de, caminho (as casas onde a peça pousa, uma ou mais), tomadas (as casas das
 * peças tomadas, na ordem), coroa (true se a pedra vira dama) }.
 */
export class Damas {
  constructor(regra = 'brasileiras', t = null, vez = null) {
    this.nomeRegra = REGRAS[regra] ? regra : 'brasileiras';
    this.r = REGRAS[this.nomeRegra];
    this.t = t ? Int8Array.from(t) : inicial();
    this.vez = vez || this.r.comeca;
    this.semTomar = 0; // as meias jogadas seguidas só de damas, sem tomar
    this.feitos = [];
    this.chaves = [this.chave()];
  }

  chave() {
    return String.fromCharCode(...Array.from(this.t, (p) => p + 80)) + this.vez;
  }

  /** A pedra que chega a esta casa vira dama? */
  ultimaFila(c, cor) {
    return cor === 1 ? c < 8 : c >= 56;
  }

  /** As sequências de tomadas de uma peça (todas, até o fim). */
  tomadasDe(de) {
    const t = this.t;
    const p = t[de];
    const cor = Math.sign(p);
    const dama = Math.abs(p) === 2;
    const r = this.r;
    const seqs = [];
    const tomadas = [];
    const caminho = [];
    // A peça sai da casa dela durante a sequência; as tomadas só saem do tabuleiro no fim
    // (não se toma a mesma duas vezes, e elas continuam bloqueando o caminho).
    t[de] = 0;
    const andar = (c, ehDama) => {
      let continuou = false;
      for (let d = 0; d < 4; d++) {
        if (!ehDama && !r.tomaParaTras && Math.sign(DIAG[d][0]) === cor) continue;
        const raio = RAIOS[c][d];
        let i = 0;
        if (ehDama && r.damaVoa) while (i < raio.length && !t[raio[i]]) i++;
        if (i >= raio.length - 1) continue;
        const alvo = raio[i];
        if (!t[alvo] || Math.sign(t[alvo]) === cor || tomadas.includes(alvo)) continue;
        // As casas de pouso: logo depois da peça tomada (e, na dama que voa, as seguintes vazias).
        for (let j = i + 1; j < raio.length && !t[raio[j]]; j++) {
          const pouso = raio[j];
          continuou = true;
          tomadas.push(alvo);
          caminho.push(pouso);
          const coroou = !ehDama && this.ultimaFila(pouso, cor);
          if (coroou && r.paraAoCoroar) seqs.push({ de, caminho: caminho.slice(), tomadas: tomadas.slice(), coroa: true });
          else if (!andar(pouso, ehDama)) seqs.push({ de, caminho: caminho.slice(), tomadas: tomadas.slice(), coroa: coroou });
          tomadas.pop();
          caminho.pop();
          if (!(ehDama && r.damaVoa)) break;
        }
      }
      return continuou;
    };
    andar(de, dama);
    t[de] = p;
    return seqs;
  }

  /** Os lances sem tomar de uma peça. */
  passosDe(de) {
    const t = this.t;
    const p = t[de];
    const cor = Math.sign(p);
    const dama = Math.abs(p) === 2;
    const r = [];
    for (let d = 0; d < 4; d++) {
      if (!dama && Math.sign(DIAG[d][0]) === cor) continue;
      for (const c of RAIOS[de][d]) {
        if (t[c]) break;
        r.push({ de, caminho: [c], tomadas: [], coroa: !dama && this.ultimaFila(c, cor) });
        if (!(dama && this.r.damaVoa)) break;
      }
    }
    return r;
  }

  /** Os lances legais de quem tem a vez (tomar é obrigatório; nas brasileiras, o maior número). */
  lances() {
    const minhas = [];
    for (let c = 0; c < 64; c++) if (this.t[c] && Math.sign(this.t[c]) === this.vez) minhas.push(c);
    let tomadas = minhas.flatMap((c) => this.tomadasDe(c));
    if (tomadas.length) {
      if (this.r.maioria) {
        const max = Math.max(...tomadas.map((m) => m.tomadas.length));
        tomadas = tomadas.filter((m) => m.tomadas.length === max);
      }
      return tomadas;
    }
    return minhas.flatMap((c) => this.passosDe(c));
  }

  fazer(m) {
    const t = this.t;
    const p = t[m.de];
    const fim = m.caminho[m.caminho.length - 1];
    const desfeito = { m, p, tomadas: m.tomadas.map((c) => t[c]), semTomar: this.semTomar };
    t[m.de] = 0;
    for (const c of m.tomadas) t[c] = 0;
    t[fim] = m.coroa ? 2 * Math.sign(p) : p;
    this.semTomar = m.tomadas.length || Math.abs(p) === 1 ? 0 : this.semTomar + 1;
    this.vez = -this.vez;
    return desfeito;
  }

  desfazer(d) {
    const t = this.t;
    const fim = d.m.caminho[d.m.caminho.length - 1];
    t[fim] = 0;
    d.m.tomadas.forEach((c, i) => { t[c] = d.tomadas[i]; });
    t[d.m.de] = d.p;
    this.semTomar = d.semTomar;
    this.vez = -this.vez;
  }

  /** Joga um lance da partida (o mesmo de "lances()", ou com o mesmo começo e o mesmo caminho). */
  jogar(m) {
    const legal = this.lances().find((x) => x.de === m.de && x.caminho.join() === m.caminho.join());
    if (!legal) return null;
    this.feitos.push(this.fazer(legal));
    this.chaves.push(this.chave());
    return legal;
  }

  voltar() {
    const d = this.feitos.pop();
    if (!d) return null;
    this.chaves.pop();
    this.desfazer(d);
    return d.m;
  }

  contar() {
    const n = { 1: 0, 2: 0, '-1': 0, '-2': 0 };
    for (const p of this.t) if (p) n[p]++;
    return n;
  }

  /**
   * Como está a partida: { fim, vencedor, legais }. O fim é null, 'sem-lances' (quem tem a vez
   * perdeu: não tem peças ou está bloqueado), 'sem-progresso' (só damas, sem tomar, por muito
   * tempo) ou 'repeticao' (a mesma posição três vezes).
   */
  situacao() {
    const legais = this.lances();
    if (!legais.length) return { fim: 'sem-lances', vencedor: -this.vez, legais };
    if (this.semTomar >= this.r.semProgresso) return { fim: 'sem-progresso', vencedor: 0, legais };
    const atual = this.chaves[this.chaves.length - 1];
    if (this.chaves.filter((k) => k === atual).length >= 3) return { fim: 'repeticao', vencedor: 0, legais };
    return { fim: null, vencedor: null, legais };
  }
}

/* ---------- O computador ---------- */

/** A avaliação do ponto de vista de quem tem a vez. */
export function avaliar(j) {
  const t = j.t;
  const valorDama = j.r.damaVoa ? 320 : 250;
  let v = 0;
  for (let c = 0; c < 64; c++) {
    const p = t[c];
    if (!p) continue;
    const l = c >> 3;
    const k = c & 7;
    let s;
    if (Math.abs(p) === 2) s = valorDama + (k > 0 && k < 7 ? 6 : 0);
    else {
      // A pedra vale mais perto de coroar; as do centro e as da última fila (que guardam a casa) também.
      const avanco = p > 0 ? 7 - l : l;
      s = 100 + avanco * avanco + (k >= 2 && k <= 5 ? 4 : 0) + (avanco === 0 ? 8 : 0);
    }
    v += p > 0 ? s : -s;
  }
  return v * j.vez;
}

const VITORIA = 100000;

/** O melhor lance para quem tem a vez ('facil', 'medio' ou 'dificil'). */
export function melhorLance(j, nivel = 'medio', { sorteio = Math.random, tempo = 2000 } = {}) {
  const legais = j.lances();
  if (!legais.length) return null;
  if (legais.length === 1) return legais[0];
  const cfg = { facil: { prof: 2, ruido: 120, acaso: 0.15 }, medio: { prof: 6, ruido: 12, acaso: 0 }, dificil: { prof: 12, ruido: 3, acaso: 0 } }[nivel] || { prof: 6, ruido: 12, acaso: 0 };
  if (cfg.acaso && sorteio() < cfg.acaso) return legais[Math.floor(sorteio() * legais.length)];
  const fim = Date.now() + (nivel === 'dificil' ? tempo : 1e9);
  let nos = 0;
  let parou = false;

  const buscar = (prof, alfa, beta, ply) => {
    if ((++nos & 1023) === 0 && Date.now() > fim) parou = true;
    if (parou) return 0;
    if (j.semTomar >= j.r.semProgresso) return 0;
    const lista = j.lances();
    if (!lista.length) return -VITORIA + ply;
    // Com tomada obrigatória, a posição não é calma: a busca continua até ela acabar.
    if (prof <= 0 && (!lista[0].tomadas.length || ply > 30)) return avaliar(j);
    lista.sort((a, b) => b.tomadas.length - a.tomadas.length || (b.coroa ? 1 : 0) - (a.coroa ? 1 : 0));
    for (const m of lista) {
      const d = j.fazer(m);
      const v = -buscar(prof - 1, -beta, -alfa, ply + 1);
      j.desfazer(d);
      if (parou) return 0;
      if (v >= beta) return beta;
      if (v > alfa) alfa = v;
    }
    return alfa;
  };

  let melhor = legais[0];
  for (let prof = 1; prof <= cfg.prof; prof++) {
    let alfa = -Infinity;
    let escolhido = null;
    let melhorNota = -Infinity;
    const ordem = [melhor, ...legais.filter((m) => m !== melhor)];
    for (const m of ordem) {
      const d = j.fazer(m);
      const repete = j.chaves.includes(j.chave());
      let v = repete ? 0 : -buscar(prof - 1, -Infinity, -alfa + cfg.ruido, 1);
      j.desfazer(d);
      if (parou) break;
      v += cfg.ruido ? (sorteio() - 0.5) * cfg.ruido : 0;
      if (v > melhorNota) { melhorNota = v; escolhido = m; }
      if (v > alfa) alfa = v;
    }
    if (parou) break;
    if (escolhido) melhor = escolhido;
    if (melhorNota > VITORIA - 100) break;
  }
  return melhor;
}
