/*
 * As regras do xadrez, sem a tela (para os testes no Node e para o computador pensar num
 * Worker): os lances legais (com o roque, o en passant e a promoção), o xeque, o xeque-mate,
 * o afogamento, os empates (os 50 lances, as três repetições e o material insuficiente), a
 * notação algébrica e o FEN. Sem nenhum import.
 *
 * O tabuleiro é uma lista de 64 casas na ordem do FEN: a casa 0 é a8, a 7 é h8, a 56 é a1 e a
 * 63 é h1. As peças das brancas são positivas e as das pretas, negativas: 1 peão, 2 cavalo,
 * 3 bispo, 4 torre, 5 dama e 6 rei.
 */

export const PEAO = 1;
export const CAVALO = 2;
export const BISPO = 3;
export const TORRE = 4;
export const DAMA = 5;
export const REI = 6;

export const INICIAL = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const LETRA_FEN = ' pnbrqk';
// O roque: os direitos são bits (1 brancas do lado do rei, 2 brancas do lado da dama, 4 e 8 as pretas).
const RQ_BR = 1;
const RD_BR = 2;
const RQ_PR = 4;
const RD_PR = 8;
// Mexer numa destas casas (a saída ou a chegada) tira estes direitos.
const TIRA_ROQUE = new Uint8Array(64).fill(15);
TIRA_ROQUE[56] = 15 & ~RD_BR;
TIRA_ROQUE[63] = 15 & ~RQ_BR;
TIRA_ROQUE[60] = 15 & ~(RQ_BR | RD_BR);
TIRA_ROQUE[0] = 15 & ~RD_PR;
TIRA_ROQUE[7] = 15 & ~RQ_PR;
TIRA_ROQUE[4] = 15 & ~(RQ_PR | RD_PR);

export const coluna = (c) => c & 7;
export const linha = (c) => c >> 3;
/** "e4" a partir da casa, e o contrário. */
export const nomeCasa = (c) => 'abcdefgh'[c & 7] + (8 - (c >> 3));
export const casaDe = (s) => (8 - Number(s[1])) * 8 + 'abcdefgh'.indexOf(s[0]);
/** A cor da casa: true nas escuras (a1 é escura). */
export const casaEscura = (c) => ((c >> 3) + (c & 7)) % 2 === 1;

/* ---------- As tabelas de saltos e raios ---------- */

function dentro(l, c) { return l >= 0 && l < 8 && c >= 0 && c < 8; }

const SALTOS_CAVALO = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const PASSOS_REI = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
// As direções: as quatro primeiras são as da torre, as quatro últimas, as do bispo.
const DIRECOES = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];

const TAB_CAVALO = [];
const TAB_REI = [];
const RAIOS = DIRECOES.map(() => []);
// Os peões que atacam uma casa: ATACAM_PEAO[0][c] são as casas de onde um peão branco atacaria c.
const ATACAM_PEAO = [[], []];
// As casas que um peão ataca: ATAQUE_PEAO[0][c] para o branco em c, [1] para o preto.
const ATAQUE_PEAO = [[], []];
for (let c = 0; c < 64; c++) {
  const l = linha(c);
  const k = coluna(c);
  TAB_CAVALO[c] = SALTOS_CAVALO.filter(([dl, dk]) => dentro(l + dl, k + dk)).map(([dl, dk]) => (l + dl) * 8 + k + dk);
  TAB_REI[c] = PASSOS_REI.filter(([dl, dk]) => dentro(l + dl, k + dk)).map(([dl, dk]) => (l + dl) * 8 + k + dk);
  DIRECOES.forEach(([dl, dk], d) => {
    const r = [];
    for (let n = 1; dentro(l + dl * n, k + dk * n); n++) r.push((l + dl * n) * 8 + k + dk * n);
    RAIOS[d][c] = r;
  });
  ATAQUE_PEAO[0][c] = [[-1, -1], [-1, 1]].filter(([dl, dk]) => dentro(l + dl, k + dk)).map(([dl, dk]) => (l + dl) * 8 + k + dk);
  ATAQUE_PEAO[1][c] = [[1, -1], [1, 1]].filter(([dl, dk]) => dentro(l + dl, k + dk)).map(([dl, dk]) => (l + dl) * 8 + k + dk);
  ATACAM_PEAO[0][c] = [[1, -1], [1, 1]].filter(([dl, dk]) => dentro(l + dl, k + dk)).map(([dl, dk]) => (l + dl) * 8 + k + dk);
  ATACAM_PEAO[1][c] = [[-1, -1], [-1, 1]].filter(([dl, dk]) => dentro(l + dl, k + dk)).map(([dl, dk]) => (l + dl) * 8 + k + dk);
}

/* ---------- A partida ---------- */

/**
 * Um lance: { de, para, peca, cap (a peça tomada, 0 se nenhuma), promo (a peça da promoção, sem
 * o sinal), ep (true no en passant), roque ('rei' ou 'dama'), duplo (o peão andou duas casas) }.
 */
export class Xadrez {
  constructor(fen = INICIAL) {
    this.carregar(fen);
  }

  carregar(fen) {
    const [pos, vez, roque, ep, meio, lance] = String(fen).trim().split(/\s+/);
    const t = new Int8Array(64);
    let c = 0;
    for (const ch of pos) {
      if (ch === '/') continue;
      if (/\d/.test(ch)) { c += Number(ch); continue; }
      const p = LETRA_FEN.indexOf(ch.toLowerCase());
      if (p < 1 || c > 63) throw new Error('FEN inválido');
      t[c++] = ch === ch.toLowerCase() ? -p : p;
    }
    if (c !== 64) throw new Error('FEN inválido');
    this.t = t;
    this.vez = vez === 'b' ? -1 : 1;
    this.roque = 0;
    if (roque && roque !== '-') {
      if (roque.includes('K')) this.roque |= RQ_BR;
      if (roque.includes('Q')) this.roque |= RD_BR;
      if (roque.includes('k')) this.roque |= RQ_PR;
      if (roque.includes('q')) this.roque |= RD_PR;
    }
    this.ep = ep && ep !== '-' ? casaDe(ep) : -1;
    this.meio = Number(meio) || 0;
    this.lance = Number(lance) || 1;
    this.rei = [t.indexOf(REI), t.indexOf(-REI)];
    if (this.rei[0] < 0 || this.rei[1] < 0) throw new Error('FEN inválido');
    this.desfeitos = [];
    this.chaves = [this.chave()];
    this.feitos = [];
    this.fenInicial = this.fen();
  }

  fen() {
    let s = '';
    for (let l = 0; l < 8; l++) {
      let vazias = 0;
      for (let k = 0; k < 8; k++) {
        const p = this.t[l * 8 + k];
        if (!p) { vazias++; continue; }
        if (vazias) { s += vazias; vazias = 0; }
        const ch = LETRA_FEN[Math.abs(p)];
        s += p > 0 ? ch.toUpperCase() : ch;
      }
      if (vazias) s += vazias;
      if (l < 7) s += '/';
    }
    let r = '';
    if (this.roque & RQ_BR) r += 'K';
    if (this.roque & RD_BR) r += 'Q';
    if (this.roque & RQ_PR) r += 'k';
    if (this.roque & RD_PR) r += 'q';
    return `${s} ${this.vez === 1 ? 'w' : 'b'} ${r || '-'} ${this.ep >= 0 ? nomeCasa(this.ep) : '-'} ${this.meio} ${this.lance}`;
  }

  /**
   * A posição para as três repetições: as peças, a vez, os direitos de roque e o en passant
   * (só quando há um peão que possa tomar).
   */
  chave() {
    let ep = -1;
    if (this.ep >= 0) {
      const peao = this.vez * PEAO;
      if (ATACAM_PEAO[this.vez === 1 ? 0 : 1][this.ep].some((c) => this.t[c] === peao)) ep = this.ep;
    }
    return String.fromCharCode(...Array.from(this.t, (p) => p + 80)) + this.vez + ':' + this.roque + ':' + ep;
  }

  /** A casa c é atacada por alguma peça da cor "por" (1 ou -1)? */
  atacada(c, por) {
    const t = this.t;
    const peao = por * PEAO;
    for (const o of ATACAM_PEAO[por === 1 ? 0 : 1][c]) if (t[o] === peao) return true;
    const cavalo = por * CAVALO;
    for (const o of TAB_CAVALO[c]) if (t[o] === cavalo) return true;
    const rei = por * REI;
    for (const o of TAB_REI[c]) if (t[o] === rei) return true;
    const torre = por * TORRE;
    const bispo = por * BISPO;
    const dama = por * DAMA;
    for (let d = 0; d < 8; d++) {
      const linhaReta = d < 4;
      for (const o of RAIOS[d][c]) {
        const p = t[o];
        if (!p) continue;
        if (p === dama || p === (linhaReta ? torre : bispo)) return true;
        break;
      }
    }
    return false;
  }

  emXeque(cor = this.vez) {
    return this.atacada(this.rei[cor === 1 ? 0 : 1], -cor);
  }

  /** Os lances possíveis sem olhar se o rei fica em xeque. */
  pseudo(soCapturas = false) {
    const t = this.t;
    const v = this.vez;
    const r = [];
    const ultima = v === 1 ? 0 : 7;
    const partida = v === 1 ? 6 : 1;
    const frente = v === 1 ? -8 : 8;
    const empurrar = (de, para, peca, cap, extra) => {
      if (Math.abs(peca) === PEAO && linha(para) === ultima) {
        for (const promo of [DAMA, CAVALO, TORRE, BISPO]) r.push({ de, para, peca, cap, promo, ...extra });
      } else r.push({ de, para, peca, cap, promo: 0, ...extra });
    };
    for (let c = 0; c < 64; c++) {
      const p = t[c];
      if (!p || (p > 0) !== (v > 0)) continue;
      const tipo = p * v;
      if (tipo === PEAO) {
        const um = c + frente;
        if (!t[um] && (!soCapturas || linha(um) === ultima)) {
          empurrar(c, um, p, 0);
          if (!soCapturas && linha(c) === partida && !t[um + frente]) r.push({ de: c, para: um + frente, peca: p, cap: 0, promo: 0, duplo: true });
        }
        for (const a of ATAQUE_PEAO[v === 1 ? 0 : 1][c]) {
          if (t[a] && (t[a] > 0) !== (v > 0)) empurrar(c, a, p, t[a]);
          else if (a === this.ep) r.push({ de: c, para: a, peca: p, cap: -v * PEAO, promo: 0, ep: true });
        }
      } else if (tipo === CAVALO || tipo === REI) {
        for (const a of (tipo === CAVALO ? TAB_CAVALO : TAB_REI)[c]) {
          if (!t[a]) { if (!soCapturas) r.push({ de: c, para: a, peca: p, cap: 0, promo: 0 }); } else if ((t[a] > 0) !== (v > 0)) r.push({ de: c, para: a, peca: p, cap: t[a], promo: 0 });
        }
      } else {
        const d0 = tipo === BISPO ? 4 : 0;
        const d1 = tipo === TORRE ? 4 : 8;
        for (let d = d0; d < d1; d++) {
          for (const a of RAIOS[d][c]) {
            if (!t[a]) { if (!soCapturas) r.push({ de: c, para: a, peca: p, cap: 0, promo: 0 }); continue; }
            if ((t[a] > 0) !== (v > 0)) r.push({ de: c, para: a, peca: p, cap: t[a], promo: 0 });
            break;
          }
        }
      }
    }
    if (!soCapturas) this.roques(r);
    return r;
  }

  roques(r) {
    const t = this.t;
    const v = this.vez;
    const e = v === 1 ? 60 : 4;
    if (t[e] !== v * REI) return;
    const [lRei, lDama] = v === 1 ? [RQ_BR, RD_BR] : [RQ_PR, RD_PR];
    if ((this.roque & lRei) && !t[e + 1] && !t[e + 2] && t[e + 3] === v * TORRE
      && !this.atacada(e, -v) && !this.atacada(e + 1, -v) && !this.atacada(e + 2, -v)) {
      r.push({ de: e, para: e + 2, peca: v * REI, cap: 0, promo: 0, roque: 'rei' });
    }
    if ((this.roque & lDama) && !t[e - 1] && !t[e - 2] && !t[e - 3] && t[e - 4] === v * TORRE
      && !this.atacada(e, -v) && !this.atacada(e - 1, -v) && !this.atacada(e - 2, -v)) {
      r.push({ de: e, para: e - 2, peca: v * REI, cap: 0, promo: 0, roque: 'dama' });
    }
  }

  /** Faz o lance (sem conferir se é legal). Devolve true se o rei de quem jogou não ficou em xeque. */
  fazer(m) {
    const t = this.t;
    const v = this.vez;
    this.desfeitos.push({ roque: this.roque, ep: this.ep, meio: this.meio });
    t[m.de] = 0;
    t[m.para] = m.promo ? v * m.promo : m.peca;
    if (m.ep) t[m.para - (v === 1 ? -8 : 8)] = 0;
    if (m.roque === 'rei') { t[m.para - 1] = t[m.para + 1]; t[m.para + 1] = 0; }
    if (m.roque === 'dama') { t[m.para + 1] = t[m.para - 2]; t[m.para - 2] = 0; }
    if (m.peca === v * REI) this.rei[v === 1 ? 0 : 1] = m.para;
    this.roque &= TIRA_ROQUE[m.de] & TIRA_ROQUE[m.para];
    this.ep = m.duplo ? (m.de + m.para) >> 1 : -1;
    this.meio = m.cap || Math.abs(m.peca) === PEAO ? 0 : this.meio + 1;
    if (v === -1) this.lance++;
    this.vez = -v;
    return !this.atacada(this.rei[v === 1 ? 0 : 1], -v);
  }

  desfazer(m) {
    const t = this.t;
    const v = -this.vez; // quem fez o lance
    const d = this.desfeitos.pop();
    this.roque = d.roque;
    this.ep = d.ep;
    this.meio = d.meio;
    if (v === -1) this.lance--;
    this.vez = v;
    t[m.de] = m.peca;
    t[m.para] = m.ep ? 0 : m.cap;
    if (m.ep) t[m.para - (v === 1 ? -8 : 8)] = m.cap;
    if (m.roque === 'rei') { t[m.para + 1] = t[m.para - 1]; t[m.para - 1] = 0; }
    if (m.roque === 'dama') { t[m.para - 2] = t[m.para + 1]; t[m.para + 1] = 0; }
    if (m.peca === v * REI) this.rei[v === 1 ? 0 : 1] = m.de;
  }

  /** Os lances legais de quem tem a vez. */
  lances() {
    const r = [];
    for (const m of this.pseudo()) {
      if (this.fazer(m)) r.push(m);
      this.desfazer(m);
    }
    return r;
  }

  /** Joga um lance da partida (guarda o histórico para as repetições e para desfazer). */
  jogar(m, letras) {
    const legal = this.lances().find((x) => x.de === m.de && x.para === m.para && (x.promo || 0) === (m.promo || 0));
    if (!legal) return null;
    const san = this.san(legal, letras);
    this.fazer(legal);
    this.feitos.push({ m: legal, san });
    this.chaves.push(this.chave());
    return legal;
  }

  /** Volta o último lance da partida. */
  voltar() {
    const f = this.feitos.pop();
    if (!f) return null;
    this.chaves.pop();
    this.desfazer(f.m);
    return f.m;
  }

  /** O lance no formato "e2e4" (com a letra da promoção: "e7e8q"). */
  static uci(m) {
    return nomeCasa(m.de) + nomeCasa(m.para) + (m.promo ? LETRA_FEN[m.promo] : '');
  }

  deUci(s) {
    const de = casaDe(s.slice(0, 2));
    const para = casaDe(s.slice(2, 4));
    const promo = s[4] ? LETRA_FEN.indexOf(s[4]) : 0;
    return this.lances().find((x) => x.de === de && x.para === para && x.promo === promo) || null;
  }

  /**
   * A notação algébrica ("Nf3", "exd5", "O-O", "e8=Q+"), antes de fazer o lance. As letras são
   * as do rei, da dama, da torre, do bispo e do cavalo (em português, "RDTBC").
   */
  san(m, letras = 'KQRBN') {
    const legais = this.lances();
    const letra = (p) => letras[[REI, DAMA, TORRE, BISPO, CAVALO].indexOf(p)];
    let s;
    if (m.roque) s = m.roque === 'rei' ? 'O-O' : 'O-O-O';
    else {
      const tipo = Math.abs(m.peca);
      s = '';
      if (tipo === PEAO) {
        if (m.cap) s += 'abcdefgh'[coluna(m.de)] + 'x';
      } else {
        s += letra(tipo);
        const outros = legais.filter((x) => x.para === m.para && x.peca === m.peca && x.de !== m.de);
        if (outros.length) {
          if (!outros.some((x) => coluna(x.de) === coluna(m.de))) s += 'abcdefgh'[coluna(m.de)];
          else if (!outros.some((x) => linha(x.de) === linha(m.de))) s += 8 - linha(m.de);
          else s += nomeCasa(m.de);
        }
        if (m.cap) s += 'x';
      }
      s += nomeCasa(m.para);
      if (m.promo) s += '=' + letra(m.promo);
    }
    this.fazer(m);
    if (this.emXeque()) s += this.lances().length ? '+' : '#';
    this.desfazer(m);
    return s;
  }

  /** Sobrou só o que não dá mate (rei contra rei, com um bispo ou um cavalo, ou bispos da mesma cor)? */
  materialInsuficiente() {
    const outras = [];
    for (let c = 0; c < 64; c++) {
      const p = Math.abs(this.t[c]);
      if (p && p !== REI) outras.push({ p, c });
    }
    if (!outras.length) return true;
    if (outras.some((x) => x.p === PEAO || x.p === TORRE || x.p === DAMA)) return false;
    if (outras.length === 1) return true;
    // Só bispos, todos em casas da mesma cor.
    return outras.every((x) => x.p === BISPO) && outras.every((x) => casaEscura(x.c) === casaEscura(outras[0].c));
  }

  /**
   * Como está a partida: { fim, vencedor, xeque, legais }. O fim é null, 'mate', 'afogamento',
   * 'cinquenta', 'repeticao' ou 'material'; o vencedor é 1, -1 ou 0 (empate).
   */
  situacao() {
    const legais = this.lances();
    const xeque = this.emXeque();
    const r = { fim: null, vencedor: null, xeque, legais };
    if (!legais.length) return { ...r, fim: xeque ? 'mate' : 'afogamento', vencedor: xeque ? -this.vez : 0 };
    if (this.materialInsuficiente()) return { ...r, fim: 'material', vencedor: 0 };
    if (this.meio >= 100) return { ...r, fim: 'cinquenta', vencedor: 0 };
    const atual = this.chaves[this.chaves.length - 1];
    if (this.chaves.filter((k) => k === atual).length >= 3) return { ...r, fim: 'repeticao', vencedor: 0 };
    return r;
  }

  /** O número de posições a n lances (para conferir as regras). */
  perft(n) {
    if (n === 0) return 1;
    let total = 0;
    for (const m of this.pseudo()) {
      if (this.fazer(m)) total += n === 1 ? 1 : this.perft(n - 1);
      this.desfazer(m);
    }
    return total;
  }
}

/* ---------- O computador ---------- */

const VALOR = [0, 100, 320, 330, 500, 900, 0];

// As tabelas de posição, feitas por conta (do ponto de vista das brancas: a linha 0 é a 8ª).
const centro = (c) => {
  const dl = Math.abs(linha(c) - 3.5);
  const dk = Math.abs(coluna(c) - 3.5);
  return 3.5 - Math.max(dl, dk); // 0 na borda, 3 no centro
};
const POS = [null, [], [], [], [], [], []];
const REI_FINAL = [];
for (let c = 0; c < 64; c++) {
  const l = linha(c);
  const k = coluna(c);
  const avanco = 6 - l; // quantas casas o peão andou
  POS[PEAO][c] = l === 0 || l === 7 ? 0 : avanco * avanco * 2 + (k >= 2 && k <= 5 ? centro(c) * 5 : 0) - (l === 6 && (k === 3 || k === 4) ? 10 : 0);
  POS[CAVALO][c] = centro(c) * 10 - 20;
  POS[BISPO][c] = centro(c) * 5 - 5;
  POS[TORRE][c] = (l === 1 ? 15 : 0) + (k === 3 || k === 4 ? 5 : 0);
  POS[DAMA][c] = centro(c) * 3;
  // O rei no meio do jogo prefere o canto da primeira fila; no final, o centro.
  POS[REI][c] = (l === 7 ? 10 : l === 6 ? 0 : -20 - (6 - l) * 5) + ([20, 30, 10, 0, 0, 10, 30, 20][k] - 10);
  REI_FINAL[c] = centro(c) * 12 - 15;
}
const espelho = (c) => (7 - linha(c)) * 8 + coluna(c);

/** A avaliação do ponto de vista de quem tem a vez. */
export function avaliar(x) {
  const t = x.t;
  let mat = 0;
  let pesadas = 0;
  for (let c = 0; c < 64; c++) {
    const p = Math.abs(t[c]);
    if (p === DAMA) pesadas += 2;
    else if (p === TORRE || p === BISPO || p === CAVALO) pesadas += 1;
  }
  const final = pesadas <= 6;
  let bispos = [0, 0];
  for (let c = 0; c < 64; c++) {
    const p = t[c];
    if (!p) continue;
    const tipo = p > 0 ? p : -p;
    const casa = p > 0 ? c : espelho(c);
    let v = VALOR[tipo] + (tipo === REI && final ? REI_FINAL[casa] : POS[tipo][casa]);
    if (tipo === BISPO) bispos[p > 0 ? 0 : 1]++;
    mat += p > 0 ? v : -v;
  }
  // O par de bispos vale um pouco mais.
  if (bispos[0] >= 2) mat += 25;
  if (bispos[1] >= 2) mat -= 25;
  return mat * x.vez;
}

const MATE = 100000;

/**
 * O melhor lance para quem tem a vez. Níveis: 'facil' (olha um lance, com bastante acaso),
 * 'medio' (três lances) e 'dificil' (até oito lances, no tempo dado).
 */
export function melhorLance(x, nivel = 'medio', { sorteio = Math.random, tempo = 2500 } = {}) {
  const legais = x.lances();
  if (!legais.length) return null;
  if (legais.length === 1) return legais[0];
  const cfg = { facil: { prof: 1, ruido: 200, acaso: 0.1 }, medio: { prof: 3, ruido: 15, acaso: 0 }, dificil: { prof: 8, ruido: 4, acaso: 0 } }[nivel] || { prof: 3, ruido: 15, acaso: 0 };
  // No fácil, de vez em quando, um lance qualquer.
  if (cfg.acaso && sorteio() < cfg.acaso) return legais[Math.floor(sorteio() * legais.length)];
  const fim = Date.now() + (nivel === 'dificil' ? tempo : 1e9);
  const assassinos = [];
  let nos = 0;
  let parou = false;

  const ordenar = (lista, ply, primeiro) => {
    const k = assassinos[ply];
    for (const m of lista) {
      let s = 0;
      if (m.cap) s = 10000 + VALOR[Math.abs(m.cap)] * 10 - VALOR[Math.abs(m.peca)] / 10;
      if (m.promo) s += 9000 + VALOR[m.promo];
      if (k && k.de === m.de && k.para === m.para) s += 5000;
      if (primeiro && primeiro.de === m.de && primeiro.para === m.para && primeiro.promo === m.promo) s += 100000;
      m.s = s;
    }
    return lista.sort((a, b) => b.s - a.s);
  };

  const quieto = (alfa, beta, ply) => {
    nos++;
    const parado = avaliar(x);
    if (parado >= beta) return beta;
    if (parado > alfa) alfa = parado;
    if (ply > 12) return alfa;
    for (const m of ordenar(x.pseudo(true), ply)) {
      if (!x.fazer(m)) { x.desfazer(m); continue; }
      const v = -quieto(-beta, -alfa, ply + 1);
      x.desfazer(m);
      if (v >= beta) return beta;
      if (v > alfa) alfa = v;
    }
    return alfa;
  };

  const buscar = (prof, alfa, beta, ply) => {
    if ((++nos & 1023) === 0 && Date.now() > fim) parou = true;
    if (parou) return 0;
    if (prof <= 0) return quieto(alfa, beta, ply);
    if (ply && x.meio >= 100) return 0;
    let legal = 0;
    for (const m of ordenar(x.pseudo(), ply)) {
      if (!x.fazer(m)) { x.desfazer(m); continue; }
      legal++;
      const v = -buscar(prof - 1, -beta, -alfa, ply + 1);
      x.desfazer(m);
      if (parou) return 0;
      if (v >= beta) {
        if (!m.cap) assassinos[ply] = m;
        return beta;
      }
      if (v > alfa) alfa = v;
    }
    if (!legal) return x.emXeque() ? -MATE + ply : 0;
    return alfa;
  };

  let melhor = legais[0];
  for (let prof = 1; prof <= cfg.prof; prof++) {
    let alfa = -Infinity;
    let escolhido = null;
    let melhorNota = -Infinity;
    for (const m of ordenar(legais.slice(), 0, melhor)) {
      x.fazer(m);
      // Não repete a posição quando está na frente: a repetição seria um empate.
      const repete = x.chaves.includes(x.chave());
      let v = repete ? 0 : -buscar(prof - 1, -Infinity, -alfa + cfg.ruido, 1);
      x.desfazer(m);
      if (parou) break;
      v += cfg.ruido ? (sorteio() - 0.5) * cfg.ruido : 0;
      if (v > melhorNota) { melhorNota = v; escolhido = m; }
      if (v > alfa) alfa = v;
    }
    if (parou) break;
    if (escolhido) melhor = escolhido;
    if (melhorNota > MATE - 100) break; // achou o mate
  }
  return melhor;
}
