/*
 * O Breakout: rebata a bola com a raquete e derrube os tijolos. Mouse, setas
 * (ou A e D) e toque movem a raquete; o clique ou a barra de espaço lançam a
 * bola; P pausa. A janela pausa sozinha quando perde o foco.
 */
import { h } from '../util.js';
import { Janela } from '../janelas.js';
import { registrarApp, estado, definirConfig } from '../sistema.js';
import { info, ajustarAoConteudo } from '../dialogos.js';
import { tocar } from '../sons.js';
import { tr } from '../idioma.js';

const L = 448;          // largura do campo
const A = 360;          // altura
const TOPO = 22;        // a faixa do placar
const COLUNAS = 14;
const LINHAS = 8;
const TIJ_L = 30;
const TIJ_A = 10;
const TIJ_Y = TOPO + 36;
const RAQ_L = 52;
const RAQ_A = 8;
const RAQ_Y = A - 26;
const BOLA = 6;
const CORES = [['#d83c3c', '#8a1e1e'], ['#d83c3c', '#8a1e1e'], ['#e08a2c', '#8d5212'], ['#e08a2c', '#8d5212'],
  ['#3cae4a', '#1d6a26'], ['#3cae4a', '#1d6a26'], ['#e0cc3c', '#8d7e12'], ['#e0cc3c', '#8d7e12']];
const PONTOS = [7, 7, 5, 5, 3, 3, 1, 1];

class Breakout {
  constructor() {
    this.canvas = h('canvas.bo-campo', { width: L, height: A, tabIndex: 0 });
    this.ctx = this.canvas.getContext('2d');
    this.j = new Janela({
      id: 'breakout', titulo: 'Breakout', icone: 'breakout', redimensionavel: false, maximizavel: false, classe: 'breakout',
      menus: [
        {
          rotulo: tr('&Jogo'), itens: () => [
            { rotulo: tr('&Novo'), atalho: 'F2', acao: () => this.novo() },
            { rotulo: tr('&Pausar'), atalho: 'P', marcado: this.estado === 'pausa', acao: () => this.alternarPausa() },
            { separador: true },
            { rotulo: tr('Sai&r'), acao: () => this.j.fechar() },
          ],
        },
        {
          rotulo: tr('A&juda'), itens: [
            { rotulo: tr('&Como jogar'), acao: () => { this.pausar(); info(tr('Rebata a bola com a raquete e derrube todos os tijolos.\n\nMova a raquete com o mouse, com as setas (ou A e D) ou com o dedo. O clique ou a barra de espaço lançam a bola; P pausa.\n\nOs tijolos de cima valem mais. A cada fase, a bola fica mais rápida. Você tem três bolas.'), 'Breakout'); } },
          ],
        },
      ],
    });
    this.j.corpo.append(this.canvas);
    ajustarAoConteudo(this.j);
    this.teclas = new Set();
    this.canvas.addEventListener('pointermove', (e) => this.apontar(e));
    this.canvas.addEventListener('pointerdown', (e) => { this.canvas.setPointerCapture(e.pointerId); this.apontar(e); this.lancar(); });
    this.canvas.addEventListener('keydown', (e) => this.tecla(e, true));
    this.canvas.addEventListener('keyup', (e) => this.tecla(e, false));
    this.j.ev.on('desativada', () => this.pausar());
    this.j.ev.on('ativada', () => setTimeout(() => this.canvas.focus(), 0));
    this.j.ev.on('fechada', () => { cancelAnimationFrame(this.raf); aberto = null; });
    this.recorde = (estado.config.jogos && estado.config.jogos.breakout && estado.config.jogos.breakout.recorde) || 0;
    this.novo();
    this.canvas.focus();
    const laco = (t) => {
      const dt = Math.min(0.033, (t - (this.antes || t)) / 1000);
      this.antes = t;
      this.passo(dt);
      this.desenhar();
      this.raf = requestAnimationFrame(laco);
    };
    this.raf = requestAnimationFrame(laco);
  }

  novo() {
    this.pontos = 0;
    this.vidas = 3;
    this.fase = 1;
    this.montarFase();
  }

  montarFase() {
    this.tijolos = [];
    for (let l = 0; l < LINHAS; l++) {
      for (let c = 0; c < COLUNAS; c++) this.tijolos.push({ x: 2 + c * (TIJ_L + 2), y: TIJ_Y + l * (TIJ_A + 2), l, vivo: true });
    }
    this.raq = this.raq || { x: (L - RAQ_L) / 2 };
    this.prepararBola();
  }

  prepararBola() {
    this.estado = 'pronto';
    this.bola = { x: 0, y: RAQ_Y - BOLA - 1, vx: 0, vy: 0 };
    this.rapidez = 230 + (this.fase - 1) * 30;
    this.toques = 0;
  }

  lancar() {
    if (this.estado === 'pausa') { this.estado = this.antesDaPausa || 'jogando'; return; }
    if (this.estado === 'fim') { this.novo(); return; }
    if (this.estado !== 'pronto') return;
    const ang = (-60 + Math.random() * 30) * Math.PI / 180;
    this.bola.vx = Math.sin(ang) * this.rapidez;
    this.bola.vy = -Math.cos(ang) * this.rapidez;
    this.estado = 'jogando';
  }

  pausar() {
    if (this.estado === 'jogando' || this.estado === 'pronto') {
      this.antesDaPausa = this.estado;
      this.estado = 'pausa';
    }
  }

  alternarPausa() {
    if (this.estado === 'pausa') this.estado = this.antesDaPausa || 'jogando';
    else this.pausar();
  }

  apontar(e) {
    const r = this.canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (L / r.width);
    this.raq.x = Math.max(0, Math.min(L - RAQ_L, x - RAQ_L / 2));
  }

  tecla(e, desce) {
    const k = e.key;
    if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(k)) {
      e.preventDefault();
      if (desce) this.teclas.add(k.toLowerCase()); else this.teclas.delete(k.toLowerCase());
    } else if (desce && (k === ' ' || k === 'Enter')) {
      e.preventDefault();
      this.lancar();
    } else if (desce && (k === 'p' || k === 'P' || k === 'Escape')) {
      e.preventDefault();
      this.alternarPausa();
    } else if (desce && k === 'F2') {
      e.preventDefault();
      this.novo();
    }
  }

  passo(dt) {
    if (this.estado === 'pausa' || this.estado === 'fim') return;
    const esq = this.teclas.has('arrowleft') || this.teclas.has('a');
    const dir = this.teclas.has('arrowright') || this.teclas.has('d');
    if (esq !== dir) this.raq.x = Math.max(0, Math.min(L - RAQ_L, this.raq.x + (dir ? 1 : -1) * 380 * dt));
    const b = this.bola;
    if (this.estado === 'pronto') {
      b.x = this.raq.x + RAQ_L / 2 - BOLA / 2;
      b.y = RAQ_Y - BOLA - 1;
      return;
    }
    // Passos pequenos, para a bola não atravessar um tijolo.
    const dist = Math.hypot(b.vx, b.vy) * dt;
    const n = Math.max(1, Math.ceil(dist / 2));
    for (let i = 0; i < n && this.estado === 'jogando'; i++) this.mover(dt / n);
  }

  mover(dt) {
    const b = this.bola;
    const px = b.x;
    const py = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    // As paredes.
    if (b.x < 0) { b.x = 0; b.vx = Math.abs(b.vx); tocar('parede'); }
    if (b.x + BOLA > L) { b.x = L - BOLA; b.vx = -Math.abs(b.vx); tocar('parede'); }
    if (b.y < TOPO) { b.y = TOPO; b.vy = Math.abs(b.vy); tocar('parede'); }
    // A raquete: o ângulo depende de onde a bola bate.
    if (b.vy > 0 && b.y + BOLA >= RAQ_Y && py + BOLA <= RAQ_Y + 2 && b.x + BOLA >= this.raq.x && b.x <= this.raq.x + RAQ_L) {
      const rel = ((b.x + BOLA / 2) - (this.raq.x + RAQ_L / 2)) / (RAQ_L / 2);
      const ang = Math.max(-1, Math.min(1, rel)) * 60 * Math.PI / 180;
      const v = Math.hypot(b.vx, b.vy);
      b.vx = Math.sin(ang) * v;
      b.vy = -Math.cos(ang) * v;
      b.y = RAQ_Y - BOLA;
      tocar('raquete');
    }
    // Os tijolos.
    for (const t of this.tijolos) {
      if (!t.vivo || b.x + BOLA <= t.x || b.x >= t.x + TIJ_L || b.y + BOLA <= t.y || b.y >= t.y + TIJ_A) continue;
      t.vivo = false;
      const veioDoLado = px + BOLA <= t.x || px >= t.x + TIJ_L;
      if (veioDoLado) b.vx = -b.vx; else b.vy = -b.vy;
      this.pontos += PONTOS[t.l];
      this.toques++;
      // A bola acelera aos poucos (e mais nos tijolos de cima).
      if (this.toques % 6 === 0 || t.l < 2) {
        const v = Math.hypot(b.vx, b.vy);
        const nova = Math.min(v * 1.04, 520);
        b.vx *= nova / v;
        b.vy *= nova / v;
      }
      tocar('tijolo');
      if (!this.tijolos.some((x) => x.vivo)) {
        this.fase++;
        tocar('vitoria');
        this.montarFase();
      }
      break;
    }
    // Perdeu a bola.
    if (b.y > A) {
      this.vidas--;
      if (this.vidas <= 0) {
        this.estado = 'fim';
        tocar('perdeu');
        if (this.pontos > this.recorde) {
          this.recorde = this.pontos;
          this.novoRecorde = true;
          definirConfig({ jogos: { breakout: { recorde: this.pontos } } });
        }
      } else {
        tocar('perdeu');
        this.prepararBola();
      }
    }
  }

  desenhar() {
    const c = this.ctx;
    c.fillStyle = '#000';
    c.fillRect(0, 0, L, A);
    // O placar.
    c.fillStyle = '#202020';
    c.fillRect(0, 0, L, TOPO - 2);
    c.font = 'bold 12px Katica, sans-serif';
    c.textBaseline = 'middle';
    c.fillStyle = '#fff';
    c.textAlign = 'left';
    c.fillText(tr('Pontos: {n}', { n: this.pontos }), 6, 10);
    c.textAlign = 'center';
    c.fillText(tr('Fase {n}', { n: this.fase }), L / 2, 10);
    c.textAlign = 'right';
    c.fillText(tr('Recorde: {n}', { n: this.recorde }), L - 40, 10);
    for (let i = 0; i < this.vidas; i++) { c.fillStyle = '#c0c0c0'; c.fillRect(L - 30 + i * 9, 7, 6, 6); }
    // Os tijolos, com luz em cima e sombra embaixo.
    for (const t of this.tijolos) {
      if (!t.vivo) continue;
      const [cor, sombra] = CORES[t.l];
      c.fillStyle = cor;
      c.fillRect(t.x, t.y, TIJ_L, TIJ_A);
      c.fillStyle = 'rgba(255,255,255,0.45)';
      c.fillRect(t.x, t.y, TIJ_L, 2);
      c.fillStyle = sombra;
      c.fillRect(t.x, t.y + TIJ_A - 2, TIJ_L, 2);
      c.fillRect(t.x + TIJ_L - 1, t.y, 1, TIJ_A);
    }
    // A raquete e a bola.
    c.fillStyle = '#c0c0c0';
    c.fillRect(this.raq.x, RAQ_Y, RAQ_L, RAQ_A);
    c.fillStyle = '#fff';
    c.fillRect(this.raq.x, RAQ_Y, RAQ_L, 2);
    c.fillStyle = '#808080';
    c.fillRect(this.raq.x, RAQ_Y + RAQ_A - 2, RAQ_L, 2);
    c.fillStyle = '#fff';
    c.fillRect(Math.round(this.bola.x), Math.round(this.bola.y), BOLA, BOLA);
    // Os avisos.
    const aviso = {
      pronto: tr('Clique ou aperte Espaço para lançar a bola'),
      pausa: tr('Pausa — clique ou aperte P para continuar'),
      fim: (this.novoRecorde ? tr('Novo recorde! ') : '') + tr('Fim de jogo — clique para jogar de novo'),
    }[this.estado];
    if (aviso) {
      c.textAlign = 'center';
      c.font = 'bold 13px Katica, sans-serif';
      const w = c.measureText(aviso).width + 24;
      c.fillStyle = 'rgba(0,0,128,0.85)';
      c.fillRect((L - w) / 2, A / 2 + 30, w, 24);
      c.fillStyle = '#fff';
      c.fillText(aviso, L / 2, A / 2 + 42);
    }
    if (this.estado !== 'fim') this.novoRecorde = false;
  }
}

let aberto = null;

registrarApp('breakout', {
  nome: 'Breakout', icone: 'breakout',
  abrir: () => {
    if (aberto && !aberto.j.fechada) { aberto.j.focar(); return aberto; }
    aberto = new Breakout();
    return aberto;
  },
});
