/* Regras e física independentes da tela. O relógio só avança durante a partida. */
import { FASES } from './breakout-fases.js';
export { FASES };
const marcar = (s) => s;
export const CAMPO = { largura: 480, altura: 440, topo: 12, margem: 8, raio: 4, raqueteY: 408, raqueteA: 9, raqueteL: 72 };
export const PODERES = {
  larga: { nome: marcar('Raquete larga'), ajuda: marcar('Aumenta a raquete por 16 segundos.'), sigla: '+', cor: '#55dcb0', duracao: 16 },
  multi: { nome: marcar('Multibola'), ajuda: marcar('Divide a bola em três, até seis bolas em jogo.'), sigla: '3', cor: '#7dc9ff' },
  laser: { nome: marcar('Laser'), ajuda: marcar('Segure Espaço ou o botão do mouse para disparar por 14 segundos.'), sigla: 'L', cor: '#ff8fba', duracao: 14 },
  lenta: { nome: marcar('Bola lenta'), ajuda: marcar('Reduz a velocidade das bolas por 12 segundos.'), sigla: 'S', cor: '#baabff', duracao: 12 },
  ima: { nome: marcar('Raquete magnética'), ajuda: marcar('Segura a bola na raquete. Clique ou aperte Espaço para soltá-la.'), sigla: 'M', cor: '#ffe08b', duracao: 15 },
  escudo: { nome: marcar('Escudo'), ajuda: marcar('Protege o fundo do campo por duas rebatidas, até três cargas.'), sigla: 'E', cor: '#82e8f2' },
  fogo: { nome: marcar('Bola de fogo'), ajuda: marcar('Atravessa os tijolos destrutíveis por 11 segundos.'), sigla: 'F', cor: '#ffa469', duracao: 11 },
  vida: { nome: marcar('Vida extra'), ajuda: marcar('Ganha uma vida, até cinco. Com cinco vidas, vale 500 pontos.'), sigla: '+1', cor: '#ff91a0' },
};
const TIPOS = Object.keys(PODERES), limitar = (v, a, b) => Math.max(a, Math.min(b, v));
const sobrepoe = (a, b) => a.x + a.w > b.x && a.x < b.x + b.w && a.y + a.h > b.y && a.y < b.y + b.h;

export class PartidaBreakout {
  constructor({ sorteio = Math.random } = {}) { this.sorteio = sorteio; this.eventos = []; this.novo(); }
  emitir(tipo, dados = {}) { this.eventos.push({ tipo, ...dados }); }
  consumirEventos() { return this.eventos.splice(0); }
  novo(fase = 0) { this.eventos = []; this.pontos = 0; this.vidas = 3; this.maiorFase = limitar(Math.trunc(fase) || 0, 0, FASES.length - 1); this.carregarFase(this.maiorFase); }
  carregarFase(indice) {
    this.fase = limitar(indice, 0, FASES.length - 1); this.maiorFase = Math.max(this.maiorFase, this.fase);
    this.tijolos = [];
    FASES[this.fase].mapa.forEach((linha, l) => [...linha].forEach((tipo, c) => {
      if (tipo === '.') return;
      const vidas = tipo === '#' ? Infinity : /^[23]$/.test(tipo) ? Number(tipo) : 1;
      this.tijolos.push({ id: l * 12 + c, l, c, x: 14 + c * 38, y: 38 + l * 20, w: 35, h: 16, tipo, vidas, max: vidas, vivo: true, cor: 'abcdef'.includes(tipo) ? 'abcdef'.indexOf(tipo) : (c + l) % 6 });
    }));
    this.raquete = { x: 204, y: CAMPO.raqueteY, w: CAMPO.raqueteL, h: CAMPO.raqueteA };
    this.toques = 0; this.semPoder = 0; this.proximoPoder = this.fase * 3; this.limparEfeitos(); this.prepararBola();
    this.emitir('fase', { fase: this.fase });
  }
  limparEfeitos() { this.efeitos = {}; this.escudo = 0; this.poderes = []; this.tiros = []; this.combo = 0; this.tempoCombo = 0; this.esperaTiro = 0; this.raquete.w = CAMPO.raqueteL; }
  prepararBola() { this.estado = 'pronto'; this.bolas = [{ x: this.raquete.x + this.raquete.w / 2, y: this.raquete.y - CAMPO.raio - 1, vx: 0, vy: 0, presa: true, deslocamento: 0 }]; }
  velocidade() { return Math.min(245 + this.fase * 5 + this.toques * 1.3, 425) * (this.efeitos.lenta > 0 ? 0.72 : 1); }
  acelerar(b) {
    const v = Math.hypot(b.vx, b.vy); if (!v || b.presa) return;
    const alvo = this.velocidade(); b.vx *= alvo / v; b.vy *= alvo / v;
    if (Math.abs(b.vy) < alvo * 0.25) { b.vy = (b.vy < 0 ? -1 : 1) * alvo * 0.25; b.vx = (b.vx < 0 ? -1 : 1) * Math.sqrt(alvo ** 2 - b.vy ** 2); }
  }
  moverRaquete(centro) {
    const r = this.raquete; r.x = limitar(centro - r.w / 2, CAMPO.margem, CAMPO.largura - CAMPO.margem - r.w);
    for (const b of this.bolas) if (b.presa) { b.x = r.x + r.w / 2 + limitar(b.deslocamento, -r.w / 2 + 5, r.w / 2 - 5); b.y = r.y - CAMPO.raio - 1; }
  }
  acao() {
    if (this.estado === 'pausa') { this.estado = this.antesDaPausa; return; }
    if (this.estado === 'fim' || this.estado === 'vitoria') { this.novo(); return; }
    if (this.estado === 'passou') { this.carregarFase(this.fase + 1); return; }
    for (const b of this.bolas) if (b.presa) {
      const angulo = (b.deslocamento / this.raquete.w * 1.6 || (this.sorteio() < 0.5 ? -0.35 : 0.35));
      b.presa = false; b.vx = Math.sin(angulo) * this.velocidade(); b.vy = -Math.cos(angulo) * this.velocidade(); this.estado = 'jogando';
    }
    if (this.estado === 'jogando' && this.efeitos.laser > 0) this.disparar();
  }
  pausar() { if (['pronto', 'jogando', 'passou'].includes(this.estado)) { this.antesDaPausa = this.estado; this.estado = 'pausa'; } }
  alternarPausa() { if (this.estado === 'pausa') this.acao(); else this.pausar(); }
  disparar() {
    if (this.esperaTiro > 0 || this.estado !== 'jogando' || !this.efeitos.laser) return;
    for (const x of [this.raquete.x + 5, this.raquete.x + this.raquete.w - 7]) this.tiros.push({ x, y: this.raquete.y - 8, w: 2, h: 8 });
    this.esperaTiro = 0.22; this.emitir('laser');
  }
  receberPoder(tipo) {
    if (!PODERES[tipo] || this.estado !== 'jogando') return;
    const p = PODERES[tipo];
    if (p.duracao) this.efeitos[tipo] = p.duracao;
    if (tipo === 'larga') { const centro = this.raquete.x + this.raquete.w / 2; this.raquete.w = 116; this.moverRaquete(centro); }
    if (tipo === 'lenta') this.bolas.forEach((b) => this.acelerar(b));
    if (tipo === 'escudo') this.escudo = Math.min(3, this.escudo + 2);
    if (tipo === 'vida') { if (this.vidas < 5) this.vidas++; else this.pontos += 500; }
    if (tipo === 'multi') {
      const origem = this.bolas.find((b) => !b.presa) || this.bolas[0];
      if (origem) for (const ang of [-0.42, 0.42]) {
        if (this.bolas.length >= 6) break;
        const vx = origem.vx || 100, vy = origem.vy || -220;
        const b = { x: origem.x, y: origem.y, vx: vx * Math.cos(ang) - vy * Math.sin(ang), vy: vx * Math.sin(ang) + vy * Math.cos(ang), presa: false };
        this.acelerar(b); this.bolas.push(b);
      }
    }
    this.pontos += 50; this.emitir('poder', { poder: tipo, x: this.raquete.x + this.raquete.w / 2, y: this.raquete.y });
  }
  acertar(t, dano = 1) {
    if (!t.vivo) return;
    if (t.tipo === '#') { this.emitir('metal', { x: t.x + t.w / 2, y: t.y + t.h / 2 }); return; }
    t.vidas -= dano; this.emitir('tijolo', { x: t.x + t.w / 2, y: t.y + t.h / 2, cor: t.cor });
    if (t.vidas > 0) { this.pontos += 10; return; }
    t.vivo = false; this.toques++; this.combo = Math.min(5, this.combo + 1); this.tempoCombo = 3;
    this.pontos += 100 * this.combo + (t.max - 1) * 50;
    this.semPoder++;
    if (this.semPoder >= 4 || this.sorteio() < 0.18) {
      this.semPoder = 0;
      if (this.poderes.length < 12) this.poderes.push({ tipo: TIPOS[this.proximoPoder++ % TIPOS.length], x: t.x + t.w / 2 - 10, y: t.y, w: 20, h: 16 });
    }
    if (t.tipo === '*') {
      this.emitir('explosao', { x: t.x + t.w / 2, y: t.y + t.h / 2 });
      for (const vizinho of this.tijolos) if (vizinho.vivo && vizinho.tipo !== '#' && Math.abs(vizinho.l - t.l) <= 1 && Math.abs(vizinho.c - t.c) <= 1) this.acertar(vizinho);
    }
    // Aço é obstáculo, não objetivo. A última fase tem um final de verdade.
    if (this.estado === 'jogando' && !this.tijolos.some((b) => b.vivo && b.tipo !== '#')) {
      this.pontos += 500 + this.vidas * 100; this.bolas = []; this.tiros = []; this.poderes = [];
      this.estado = this.fase === FASES.length - 1 ? 'vitoria' : 'passou';
      this.maiorFase = Math.min(FASES.length - 1, Math.max(this.maiorFase, this.fase + 1));
      this.emitir(this.estado, { fase: this.fase });
    }
  }
  passo(segundos, { direcao = 0, disparando = false } = {}) {
    if (!['pronto', 'jogando'].includes(this.estado)) return;
    const dt = limitar(Number(segundos) || 0, 0, 0.05);
    if (direcao) this.moverRaquete(this.raquete.x + this.raquete.w / 2 + limitar(direcao, -1, 1) * 390 * dt);
    if (this.estado === 'pronto') { this.moverRaquete(this.raquete.x + this.raquete.w / 2); return; }
    this.esperaTiro = Math.max(0, this.esperaTiro - dt); this.tempoCombo -= dt; if (this.tempoCombo <= 0) this.combo = 0;
    for (const tipo of Object.keys(this.efeitos)) {
      this.efeitos[tipo] -= dt;
      if (this.efeitos[tipo] <= 0) {
        delete this.efeitos[tipo];
        if (tipo === 'larga') { const centro = this.raquete.x + this.raquete.w / 2; this.raquete.w = CAMPO.raqueteL; this.moverRaquete(centro); }
        if (tipo === 'lenta') this.bolas.forEach((b) => this.acelerar(b));
        if (tipo === 'ima') for (const b of this.bolas) if (b.presa) { b.presa = false; b.vx = this.velocidade() * 0.3; b.vy = -this.velocidade() * Math.sqrt(0.91); }
      }
    }
    if (disparando) this.disparar();
    for (const p of this.poderes) {
      p.y += 96 * dt;
      if (sobrepoe(p, this.raquete)) { p.pego = true; this.receberPoder(p.tipo); }
    }
    this.poderes = this.poderes.filter((p) => !p.pego && p.y < CAMPO.altura);
    for (const tiro of this.tiros) {
      const antes = tiro.y; tiro.y -= 620 * dt;
      const alvo = this.tijolos.filter((t) => t.vivo && tiro.x + tiro.w > t.x && tiro.x < t.x + t.w && t.y <= antes + tiro.h && t.y + t.h >= tiro.y).sort((a, b) => b.y - a.y)[0];
      if (alvo) { tiro.gasto = true; this.acertar(alvo); }
      if (this.estado !== 'jogando') return;
    }
    this.tiros = this.tiros.filter((t) => !t.gasto && t.y > 0);
    for (const b of [...this.bolas]) {
      if (b.presa) continue;
      const n = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt / 2.5));
      for (let i = 0; i < n && this.estado === 'jogando' && !b.perdida && !b.presa; i++) this.moverBola(b, dt / n);
      if (this.estado !== 'jogando') return;
    }
    this.bolas = this.bolas.filter((b) => !b.perdida);
    if (!this.bolas.length) {
      this.vidas--; this.limparEfeitos(); this.emitir('perdeu');
      if (this.vidas <= 0) this.estado = 'fim'; else this.prepararBola();
    }
  }
  moverBola(b, dt) {
    const { raio: r, margem: m, largura: w, altura: h, topo } = CAMPO;
    const px = b.x, py = b.y; b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x - r < m) { b.x = m + r; b.vx = Math.abs(b.vx); this.emitir('parede'); }
    if (b.x + r > w - m) { b.x = w - m - r; b.vx = -Math.abs(b.vx); this.emitir('parede'); }
    if (b.y - r < topo) { b.y = topo + r; b.vy = Math.abs(b.vy); this.emitir('parede'); }
    const raq = this.raquete;
    if (b.vy > 0 && py + r <= raq.y + 1 && b.y + r >= raq.y && b.x + r > raq.x && b.x - r < raq.x + raq.w) {
      const rel = limitar((b.x - raq.x - raq.w / 2) / (raq.w / 2), -1, 1), ang = rel * Math.PI * 0.36;
      b.y = raq.y - r - 0.1; b.vx = Math.sin(ang) * this.velocidade(); b.vy = -Math.cos(ang) * this.velocidade();
      if (Math.abs(b.vx) < this.velocidade() * 0.14) b.vx = (px < w / 2 ? -1 : 1) * this.velocidade() * 0.14;
      if (this.efeitos.ima) { b.presa = true; b.deslocamento = b.x - raq.x - raq.w / 2; }
      this.emitir('raquete', { x: b.x, y: b.y });
    }
    for (const t of this.tijolos) {
      if (!t.vivo || b.x + r <= t.x || b.x - r >= t.x + t.w || b.y + r <= t.y || b.y - r >= t.y + t.h) continue;
      const fogo = this.efeitos.fogo && t.tipo !== '#';
      this.acertar(t, fogo ? Infinity : 1);
      if (!fogo) {
        if (px + r <= t.x || px - r >= t.x + t.w) { b.vx = -b.vx; b.x = px < t.x ? t.x - r - 0.1 : t.x + t.w + r + 0.1; }
        else { b.vy = -b.vy; b.y = py < t.y ? t.y - r - 0.1 : t.y + t.h + r + 0.1; }
        this.acelerar(b); break;
      }
      if (this.estado !== 'jogando') break;
    }
    if (b.vy > 0 && b.y + r >= h - 10 && this.escudo) { b.y = h - 10 - r; b.vy = -Math.abs(b.vy); this.escudo--; this.emitir('escudo', { x: b.x, y: b.y }); }
    if (b.y - r > h) b.perdida = true;
  }
}
