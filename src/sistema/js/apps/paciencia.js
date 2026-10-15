/*
 * A Paciência (Klondike): leve todas as cartas para as quatro pilhas de cima,
 * do Ás ao Rei, por naipe. Nas sete colunas, as cartas descem alternando as
 * cores. As cartas, os naipes e o verso são desenhos do próprio projeto.
 *
 * Arrastar (com o mouse ou o dedo) move uma carta ou uma sequência; o clique
 * duplo manda a carta para as pilhas de cima; o botão direito manda todas as
 * que puderem ir; Ctrl+Z desfaz.
 */
import { h } from '../util.js';
import { Janela } from '../janelas.js';
import { registrarApp, estado, definirConfig } from '../sistema.js';
import { info, confirmar } from '../dialogos.js';
import { tocar } from '../sons.js';
import { tr, marcar } from '../idioma.js';

const CW = 71;   // largura da carta
const CH = 96;   // altura
const GAP = 11;
const MARGEM = 10;
const FECHADA = 5;   // o passo das cartas viradas para baixo
const ABERTA = 20;   // e das viradas para cima

// Os naipes: espadas, copas, ouros e paus (desenhos próprios, numa caixa de 10 × 10).
const NAIPES = [
  { cor: 'preto', d: 'M5 0C6.5 2 10 4 9.5 6.3 9 8.2 6.8 8.3 5.6 7.2L6.3 10H3.7L4.4 7.2C3.2 8.3 1 8.2.5 6.3 0 4 3.5 2 5 0Z' },
  { cor: 'vermelho', d: 'M5 9.4 1 5.2C-.2 4-.1 1.9 1.4 1.1 2.9.4 4.3 1.2 5 2.5 5.7 1.2 7.1.4 8.6 1.1 10.1 1.9 10.2 4 9 5.2Z' },
  { cor: 'vermelho', d: 'M5 0 9 5 5 10 1 5Z' },
  { cor: 'preto', d: 'M2.8 2.5a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0M.4 5.8a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0M5.2 5.8a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0M4.4 5H5.6L6.6 10H3.4Z' },
];
const VALORES = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const COR_TINTA = { preto: '#000000', vermelho: '#d00000' };

// As posições dos naipes no meio das cartas de 2 a 10 (em % da largura e da altura).
const PIPS = {
  2: [[50, 10], [50, 90]],
  3: [[50, 10], [50, 50], [50, 90]],
  4: [[25, 10], [75, 10], [25, 90], [75, 90]],
  5: [[25, 10], [75, 10], [50, 50], [25, 90], [75, 90]],
  6: [[25, 10], [75, 10], [25, 50], [75, 50], [25, 90], [75, 90]],
  7: [[25, 10], [75, 10], [50, 30], [25, 50], [75, 50], [25, 90], [75, 90]],
  8: [[25, 10], [75, 10], [50, 30], [25, 50], [75, 50], [50, 70], [25, 90], [75, 90]],
  9: [[25, 10], [75, 10], [25, 36.7], [75, 36.7], [50, 50], [25, 63.3], [75, 63.3], [25, 90], [75, 90]],
  10: [[25, 10], [75, 10], [50, 23.3], [25, 36.7], [75, 36.7], [25, 63.3], [75, 63.3], [50, 76.7], [25, 90], [75, 90]],
};

export const VERSOS = {
  azul: { nome: marcar('Azul'), cor: '#1c3ea8', linha: '#7f9bf0' },
  vermelho: { nome: marcar('Vermelho'), cor: '#a81c1c', linha: '#f08f7f' },
  verde: { nome: marcar('Verde'), cor: '#1c7a3a', linha: '#8fe0a0' },
};

const iconeNaipe = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 10 10"><path d="${NAIPES[n].d}"/></svg>`;

/* ---------- O jogo (sem a tela, para os testes) ---------- */

export const corDe = (c) => NAIPES[c.naipe].cor;

export class Jogo {
  constructor({ virar = 1, sorteio = Math.random } = {}) {
    this.virar = virar;
    const baralho = [];
    for (let naipe = 0; naipe < 4; naipe++) for (let valor = 1; valor <= 13; valor++) baralho.push({ id: naipe * 13 + valor, naipe, valor, aberta: false });
    for (let i = baralho.length - 1; i > 0; i--) {
      const j = Math.floor(sorteio() * (i + 1));
      [baralho[i], baralho[j]] = [baralho[j], baralho[i]];
    }
    this.colunas = Array.from({ length: 7 }, () => []);
    for (let i = 0; i < 7; i++) {
      for (let k = 0; k <= i; k++) this.colunas[i].push(baralho.pop());
      this.colunas[i][i].aberta = true;
    }
    this.estoque = baralho;
    this.descarte = [];
    this.fundacoes = [[], [], [], []];
    this.jogadas = 0;
    this.historico = [];
  }

  /** Uma pilha pelo nome: 'estoque', 'descarte', 'f0'…'f3', 'c0'…'c6'. */
  pilha(nome) {
    if (nome === 'estoque') return this.estoque;
    if (nome === 'descarte') return this.descarte;
    if (nome[0] === 'f') return this.fundacoes[Number(nome.slice(1))];
    return this.colunas[Number(nome.slice(1))];
  }

  guardar() {
    this.historico.push(JSON.stringify({ e: this.estoque, d: this.descarte, f: this.fundacoes, c: this.colunas, j: this.jogadas }));
    if (this.historico.length > 200) this.historico.shift();
  }

  desfazer() {
    const s = this.historico.pop();
    if (!s) return false;
    const o = JSON.parse(s);
    Object.assign(this, { estoque: o.e, descarte: o.d, fundacoes: o.f, colunas: o.c, jogadas: o.j });
    return true;
  }

  /** Vira 1 (ou 3) cartas do estoque; com o estoque vazio, o descarte volta para ele. */
  comprar() {
    if (!this.estoque.length && !this.descarte.length) return false;
    this.guardar();
    if (!this.estoque.length) {
      this.estoque = this.descarte.reverse().map((c) => ({ ...c, aberta: false }));
      this.descarte = [];
    } else {
      for (let i = 0; i < this.virar && this.estoque.length; i++) {
        const c = this.estoque.pop();
        c.aberta = true;
        this.descarte.push(c);
      }
    }
    this.jogadas++;
    return true;
  }

  podeNaFundacao(carta, f) {
    const p = this.fundacoes[f];
    const topo = p[p.length - 1];
    return topo ? topo.naipe === carta.naipe && topo.valor === carta.valor - 1 : carta.valor === 1;
  }

  podeNaColuna(carta, c) {
    const p = this.colunas[c];
    const topo = p[p.length - 1];
    if (!topo) return carta.valor === 13;
    return topo.aberta && corDe(topo) !== corDe(carta) && topo.valor === carta.valor + 1;
  }

  /** As cartas que saem juntas a partir de um índice (só da última de cima, fora das colunas). */
  grupo(origem, indice) {
    const p = this.pilha(origem);
    if (origem === 'estoque' || indice < 0 || indice >= p.length || !p[indice].aberta) return null;
    if (origem[0] !== 'c' && indice !== p.length - 1) return null;
    const g = p.slice(indice);
    for (let i = 1; i < g.length; i++) if (corDe(g[i]) === corDe(g[i - 1]) || g[i].valor !== g[i - 1].valor - 1) return null;
    return g;
  }

  /** Move as cartas de origem (a partir do índice) para o destino, se a regra deixar. */
  mover(origem, indice, destino) {
    if (origem === destino) return false;
    const g = this.grupo(origem, indice);
    if (!g) return false;
    if (destino[0] === 'f') {
      if (g.length !== 1 || !this.podeNaFundacao(g[0], Number(destino.slice(1)))) return false;
    } else if (destino[0] === 'c') {
      if (!this.podeNaColuna(g[0], Number(destino.slice(1)))) return false;
    } else return false;
    this.guardar();
    const p = this.pilha(origem);
    p.splice(indice);
    this.pilha(destino).push(...g);
    // A carta que ficou por cima na coluna se vira sozinha.
    if (origem[0] === 'c' && p.length && !p[p.length - 1].aberta) p[p.length - 1].aberta = true;
    this.jogadas++;
    return true;
  }

  /** A pilha de cima para onde a última carta da origem pode ir (ou null). */
  fundacaoPara(origem) {
    const p = this.pilha(origem);
    const c = p[p.length - 1];
    if (!c || !c.aberta) return null;
    for (let f = 0; f < 4; f++) if (this.podeNaFundacao(c, f)) return 'f' + f;
    return null;
  }

  get ganhou() {
    return this.fundacoes.every((p) => p.length === 13);
  }
}

/* ---------- A janela ---------- */

const cfg = () => (estado.config.jogos && estado.config.jogos.paciencia) || {};

class Paciencia {
  constructor() {
    this.j = new Janela({
      id: 'paciencia', titulo: tr('Paciência'), icone: 'paciencia', largura: 620, altura: 470, minLargura: 600, minAltura: 360,
      classe: 'paciencia', status: ['', ''],
      menus: [
        {
          rotulo: tr('&Jogo'), itens: () => [
            { rotulo: tr('&Novo'), atalho: 'F2', acao: () => this.novo() },
            { rotulo: tr('&Desfazer'), atalho: 'Ctrl+Z', desativado: !this.jogo.historico.length, acao: () => this.desfazer() },
            { separador: true },
            { rotulo: tr('Virar &1 carta'), radio: true, marcado: this.virar() === 1, acao: () => this.mudarVirar(1) },
            { rotulo: tr('Virar &3 cartas'), radio: true, marcado: this.virar() === 3, acao: () => this.mudarVirar(3) },
            { separador: true },
            { rotulo: tr('&Verso das cartas'), sub: () => Object.entries(VERSOS).map(([k, v]) => ({ rotulo: tr(v.nome), radio: true, marcado: this.verso() === k, acao: () => this.mudarVerso(k) })) },
            { separador: true },
            { rotulo: tr('Sai&r'), acao: () => this.j.fechar() },
          ],
        },
        {
          rotulo: tr('A&juda'), itens: [
            { rotulo: tr('&Como jogar'), acao: () => info(tr('Leve todas as cartas para as quatro pilhas de cima, do Ás ao Rei, cada pilha com um naipe.\n\nNas sete colunas, as cartas descem alternando as cores (vermelho sobre preto). Só um Rei vai para uma coluna vazia.\n\nArraste as cartas com o mouse ou o dedo. Clique no monte para virar cartas. O clique duplo manda uma carta para as pilhas de cima, e o botão direito manda todas as que puderem ir. Ctrl+Z desfaz.'), tr('Paciência')) },
          ],
        },
      ],
    });
    this.mesa = h('div.pac-mesa');
    this.j.corpo.append(this.mesa);
    this.els = new Map();
    this.vagas = {};
    for (const nome of ['estoque', 'descarte', 'f0', 'f1', 'f2', 'f3', 'c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6']) {
      const v = h('div.pac-vaga' + (nome === 'estoque' ? '.estoque' : nome[0] === 'f' ? '.fundacao' : ''), { dataset: { pilha: nome } });
      this.vagas[nome] = v;
      this.mesa.append(v);
    }
    this.mesa.addEventListener('pointerdown', (e) => this.apertar(e));
    this.mesa.addEventListener('contextmenu', (e) => { e.preventDefault(); this.tudoParaCima(); });
    this.j.el.addEventListener('keydown', (e) => {
      if (e.key === 'F2') { e.preventDefault(); this.novo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); this.desfazer(); }
    });
    this.j.ev.on('tamanho', () => this.desenhar(false));
    this.j.ev.on('fechada', () => { clearInterval(this.timer); this.pararVitoria(); aberto = null; });
    this.timer = setInterval(() => this.atualizarStatus(), 1000);
    this.novo();
  }

  virar() { return cfg().virar === 3 ? 3 : 1; }
  verso() { return VERSOS[cfg().verso] ? cfg().verso : 'azul'; }

  async mudarVirar(n) {
    await definirConfig({ jogos: { paciencia: { virar: n } } });
    if (!this.jogo.jogadas || await confirmar(tr('A mudança vale a partir do próximo jogo. Começar um jogo novo agora?'), { titulo: tr('Paciência') })) this.novo();
  }

  async mudarVerso(k) {
    await definirConfig({ jogos: { paciencia: { verso: k } } });
    this.desenhar(false);
  }

  novo() {
    this.pararVitoria();
    this.jogo = new Jogo({ virar: this.virar() });
    this.inicio = Date.now();
    this.ganho = false;
    for (const el of this.els.values()) el.remove();
    this.els.clear();
    this.desenhar(false);
    this.atualizarStatus();
  }

  desfazer() {
    if (this.ganho || !this.jogo.desfazer()) return;
    this.desenhar(true);
  }

  atualizarStatus() {
    if (!this.jogo) return;
    const s = Math.floor(((this.fimEm || Date.now()) - this.inicio) / 1000);
    const tempo = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    this.j.definirStatus([tr('Jogadas: {n}', { n: this.jogo.jogadas }), tr('Tempo: {t}', { t: tempo })]);
  }

  /* ---------- O desenho ---------- */

  posVaga(nome) {
    const largura = this.mesa.clientWidth;
    const sobra = Math.max(0, largura - (MARGEM * 2 + 7 * CW + 6 * GAP));
    const x0 = MARGEM + sobra / 2;
    const col = (i) => x0 + i * (CW + GAP);
    if (nome === 'estoque') return { x: col(0), y: MARGEM };
    if (nome === 'descarte') return { x: col(1), y: MARGEM };
    if (nome[0] === 'f') return { x: col(3 + Number(nome.slice(1))), y: MARGEM };
    return { x: col(Number(nome.slice(1))), y: MARGEM + CH + 16 };
  }

  /** O passo das cartas abertas numa coluna, menor quando a coluna não caberia. */
  passoColuna(p) {
    const fechadas = p.filter((c) => !c.aberta).length;
    const abertas = p.length - fechadas;
    const livre = this.mesa.clientHeight - (MARGEM + CH + 16) - CH - MARGEM - fechadas * FECHADA;
    return abertas > 1 ? Math.max(10, Math.min(ABERTA, livre / (abertas - 1))) : ABERTA;
  }

  elCarta(c) {
    let el = this.els.get(c.id);
    if (!el) {
      el = h('div.pac-carta', { dataset: { id: c.id } });
      el.append(this.frente(c), h('div.verso'));
      this.mesa.append(el);
      this.els.set(c.id, el);
    }
    return el;
  }

  frente(c) {
    const n = NAIPES[c.naipe];
    const f = h('div.frente.' + n.cor);
    const canto = `<div class="valor">${VALORES[c.valor]}</div>${iconeNaipe(c.naipe, 'naipe-p')}`;
    let meio = '';
    if (c.valor === 1) meio = iconeNaipe(c.naipe, 'naipe-as');
    else if (c.valor <= 10) {
      meio = '<div class="pips">' + PIPS[c.valor].map(([x, y]) => `<span style="left:${x}%;top:${y}%"${y > 50 ? ' class="inv"' : ''}>${iconeNaipe(c.naipe)}</span>`).join('') + '</div>';
    } else {
      // As figuras: uma moldura com a letra grande e o naipe (desenho próprio).
      meio = `<div class="figura"><div class="letra">${VALORES[c.valor]}</div>${iconeNaipe(c.naipe, 'naipe-fig')}<div class="letra inv">${VALORES[c.valor]}</div></div>`;
    }
    f.innerHTML = `<div class="canto">${canto}</div><div class="canto inv">${canto}</div>${meio}`;
    return f;
  }

  desenhar(animar = true) {
    const jg = this.jogo;
    const v = VERSOS[this.verso()];
    this.mesa.style.setProperty('--verso', v.cor);
    this.mesa.style.setProperty('--verso-linha', v.linha);
    this.mesa.classList.toggle('animar', animar);
    for (const [nome, el] of Object.entries(this.vagas)) {
      const p = this.posVaga(nome);
      el.style.left = p.x + 'px';
      el.style.top = p.y + 'px';
    }
    this.vagas.estoque.classList.toggle('vazio-reciclar', !jg.estoque.length && jg.descarte.length > 0);
    let z = 1;
    const pos = (c, x, y) => {
      const el = this.elCarta(c);
      el.classList.toggle('aberta', c.aberta);
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.zIndex = z++;
      el.dataset.pilha = '';
    };
    const marcarPilha = (c, nome, i) => { const el = this.elCarta(c); el.dataset.pilha = nome; el.dataset.indice = i; };
    const e = this.posVaga('estoque');
    jg.estoque.forEach((c, i) => { pos(c, e.x + Math.min(Math.floor(i / 8), 3) * 2, e.y + Math.min(Math.floor(i / 8), 3) * 1); marcarPilha(c, 'estoque', i); });
    const d = this.posVaga('descarte');
    const leque = this.virar() === 3 ? 3 : 1;
    jg.descarte.forEach((c, i) => {
      const k = Math.max(0, i - (jg.descarte.length - leque));
      pos(c, d.x + k * 14, d.y);
      marcarPilha(c, 'descarte', i);
    });
    jg.fundacoes.forEach((p, f) => { const q = this.posVaga('f' + f); p.forEach((c, i) => { pos(c, q.x, q.y); marcarPilha(c, 'f' + f, i); }); });
    jg.colunas.forEach((p, k) => {
      const q = this.posVaga('c' + k);
      const passo = this.passoColuna(p);
      let y = q.y;
      p.forEach((c, i) => { pos(c, q.x, y); marcarPilha(c, 'c' + k, i); y += c.aberta ? passo : FECHADA; });
    });
    this.atualizarStatus();
    if (jg.ganhou && !this.ganho) this.venceu();
  }

  /* ---------- Arrastar ---------- */

  apertar(e) {
    if (e.button !== 0 || this.ganho) return;
    const el = e.target.closest('.pac-carta');
    const vaga = e.target.closest('.pac-vaga');
    if (!el) {
      if (vaga && vaga.dataset.pilha === 'estoque' && this.jogo.comprar()) { tocar('carta'); this.desenhar(true); }
      return;
    }
    const origem = el.dataset.pilha;
    const indice = Number(el.dataset.indice);
    if (origem === 'estoque') {
      if (this.jogo.comprar()) { tocar('carta'); this.desenhar(true); }
      return;
    }
    const grupo = this.jogo.grupo(origem, indice);
    if (!grupo) return;
    e.preventDefault();
    // O toque duplo (ou o clique duplo): a carta vai para as pilhas de cima.
    const agora = Date.now();
    if (this.ultimoToque && this.ultimoToque.id === el.dataset.id && agora - this.ultimoToque.em < 380) {
      this.ultimoToque = null;
      const f = indice === this.jogo.pilha(origem).length - 1 && this.jogo.fundacaoPara(origem);
      if (f && this.jogo.mover(origem, indice, f)) { tocar('carta'); this.desenhar(true); }
      return;
    }
    this.ultimoToque = { id: el.dataset.id, em: agora };
    const els = grupo.map((c) => this.els.get(c.id));
    const ini = els.map((x) => ({ x: parseFloat(x.style.left), y: parseFloat(x.style.top) }));
    const p0 = { x: e.clientX, y: e.clientY };
    let arrastou = false;
    this.mesa.setPointerCapture(e.pointerId);
    this.mesa.classList.remove('animar');
    const mover = (ev) => {
      const dx = ev.clientX - p0.x;
      const dy = ev.clientY - p0.y;
      if (!arrastou && Math.hypot(dx, dy) < 4) return;
      arrastou = true;
      els.forEach((x, i) => { x.style.left = ini[i].x + dx + 'px'; x.style.top = ini[i].y + dy + 'px'; x.style.zIndex = 1000 + i; });
    };
    const soltar = (ev) => {
      this.mesa.removeEventListener('pointermove', mover);
      this.mesa.removeEventListener('pointerup', soltar);
      this.mesa.removeEventListener('pointercancel', soltar);
      if (!arrastou) return this.desenhar(false);
      this.ultimoToque = null;
      const destino = this.destinoEm(parseFloat(els[0].style.left) + CW / 2, parseFloat(els[0].style.top) + 20, origem);
      if (destino && this.jogo.mover(origem, indice, destino)) tocar('carta');
      this.desenhar(true);
    };
    this.mesa.addEventListener('pointermove', mover);
    this.mesa.addEventListener('pointerup', soltar);
    this.mesa.addEventListener('pointercancel', soltar);
  }

  /** A pilha sob o ponto (em coordenadas da mesa), a mais próxima das que aceitam. */
  destinoEm(x, y, origem) {
    let melhor = null;
    let dist = Infinity;
    for (const nome of ['f0', 'f1', 'f2', 'f3', 'c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6']) {
      if (nome === origem) continue;
      const q = this.posVaga(nome);
      let fundo = q.y + CH;
      if (nome[0] === 'c') {
        const p = this.jogo.colunas[Number(nome.slice(1))];
        const passo = this.passoColuna(p);
        fundo = q.y + p.reduce((s, c, i) => s + (i < p.length - 1 ? (c.aberta ? passo : FECHADA) : 0), 0) + CH;
      }
      if (x < q.x - GAP / 2 || x > q.x + CW + GAP / 2 || y < q.y - 30 || y > fundo + 30) continue;
      const d = Math.abs(x - (q.x + CW / 2)) + Math.abs(y - Math.min(Math.max(y, q.y), fundo));
      if (d < dist) { dist = d; melhor = nome; }
    }
    return melhor;
  }

  /** O botão direito: todas as cartas que puderem vão para as pilhas de cima. */
  tudoParaCima() {
    if (this.ganho) return;
    let mexeu = false;
    for (let volta = 0; volta < 60; volta++) {
      let achou = false;
      for (const origem of ['descarte', 'c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6']) {
        const f = this.jogo.fundacaoPara(origem);
        if (f && this.jogo.mover(origem, this.jogo.pilha(origem).length - 1, f)) { achou = true; mexeu = true; }
      }
      if (!achou) break;
    }
    if (mexeu) { tocar('carta'); this.desenhar(true); }
  }

  /* ---------- A vitória: as cartas pulam das pilhas e deixam o rastro ---------- */

  venceu() {
    this.ganho = true;
    this.fimEm = Date.now();
    tocar('vitoria');
    const tela = h('canvas.pac-vitoria', { width: this.mesa.clientWidth, height: this.mesa.clientHeight });
    this.mesa.append(tela);
    const ctx = tela.getContext('2d');
    const desenhos = this.jogo.fundacoes.map((p) => p.map((c) => this.imagemCarta(c)));
    const fila = [];
    for (let v = 12; v >= 0; v--) for (let f = 0; f < 4; f++) fila.push({ img: desenhos[f][v], ...this.posVaga('f' + f) });
    let atual = null;
    const passo = () => {
      if (!atual) {
        const prox = fila.shift();
        if (!prox) { this.vitoria = null; return this.mostrarVitoria(); }
        atual = { ...prox, vx: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 4), vy: -Math.random() * 6 };
      }
      atual.vy += 0.6;
      atual.x += atual.vx;
      atual.y += atual.vy;
      if (atual.y + CH > tela.height) { atual.y = tela.height - CH; atual.vy = -atual.vy * 0.75; }
      ctx.drawImage(atual.img, Math.round(atual.x), Math.round(atual.y));
      if (atual.x + CW < 0 || atual.x > tela.width) atual = null;
      this.vitoria = requestAnimationFrame(passo);
    };
    this.vitoria = requestAnimationFrame(passo);
    tela.addEventListener('pointerdown', () => { this.pararVitoria(); this.mostrarVitoria(); });
  }

  pararVitoria() {
    if (this.vitoria) cancelAnimationFrame(this.vitoria);
    this.vitoria = null;
    const t = this.mesa && this.mesa.querySelector('.pac-vitoria');
    if (t) t.remove();
  }

  async mostrarVitoria() {
    if (this.perguntou) return;
    this.perguntou = true;
    const novo = await confirmar(tr('Parabéns, você ganhou!\n\nJogar de novo?'), { titulo: tr('Paciência') });
    this.perguntou = false;
    if (novo) this.novo();
  }

  /** A carta desenhada num canvas (para a animação da vitória). */
  imagemCarta(c) {
    const cv = document.createElement('canvas');
    cv.width = CW;
    cv.height = CH;
    const g = cv.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, CW, CH);
    g.fillStyle = '#fff';
    g.fillRect(1, 1, CW - 2, CH - 2);
    const tinta = COR_TINTA[NAIPES[c.naipe].cor];
    const naipe = (x, y, t) => { g.save(); g.translate(x, y); g.scale(t / 10, t / 10); g.fillStyle = tinta; g.fill(new Path2D(NAIPES[c.naipe].d)); g.restore(); };
    g.fillStyle = tinta;
    g.font = 'bold 13px Katica, sans-serif';
    g.textBaseline = 'top';
    g.fillText(VALORES[c.valor], 5, 4);
    naipe(5, 19, 9);
    naipe(CW / 2 - 12, CH / 2 - 12, 24);
    return cv;
  }
}

let aberto = null;

registrarApp('paciencia', {
  nome: 'Paciência', icone: 'paciencia',
  abrir: () => {
    if (aberto && !aberto.j.fechada) { aberto.j.focar(); return aberto; }
    aberto = new Paciencia();
    return aberto;
  },
});
