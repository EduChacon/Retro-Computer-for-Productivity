/* Breakout: campanha própria, power-ups e desenho em baixa resolução, sem recursos externos. */
import { h } from '../util.js';
import { Janela } from '../janelas.js';
import { registrarApp, estado, definirConfig } from '../sistema.js';
import { ajustarAoConteudo } from '../dialogos.js';
import { tocar } from '../sons.js';
import { tr } from '../idioma.js';
import { PartidaBreakout, CAMPO, PODERES, FASES } from '../jogos/breakout.js';

const { largura: L, altura: A } = CAMPO;
const CORES = ['#fa7e8f', '#ffc576', '#e9e78b', '#79dfac', '#72c7ec', '#be9fed'];
const TEMAS = [
  { fundo: '#101d30', grade: '#192a40', acento: '#72c7ec' },
  { fundo: '#102921', grade: '#1a382e', acento: '#79dfac' },
  { fundo: '#28192f', grade: '#38243e', acento: '#fa7e8f' },
  { fundo: '#292317', grade: '#3b3220', acento: '#ffc576' },
];

class Breakout {
  constructor() {
    const salvo = estado.config.jogos?.breakout || {};
    this.recorde = Number(salvo.recorde) || 0;
    this.desbloqueada = Math.max(1, Math.min(FASES.length, Number(salvo.maiorFase) || 1));
    this.som = salvo.som !== false;
    this.motor = new PartidaBreakout(); this.teclas = new Set(); this.particulas = [];
    this.reduzir = matchMedia('(prefers-reduced-motion: reduce)');
    this.canvas = h('canvas.bo-campo', { width: L, height: A, tabIndex: 0, 'aria-label': tr('Breakout: use as setas para mover e Espaço para lançar.') });
    this.ctx = this.canvas.getContext('2d');
    this.j = new Janela({
      id: 'breakout', titulo: 'Breakout', icone: 'breakout', largura: 518, altura: 640,
      minLargura: 390, minAltura: 490, classe: 'breakout',
      menus: [
        { rotulo: tr('&Jogo'), itens: () => [
          { rotulo: tr('&Novo'), atalho: 'F2', acao: () => this.novo() },
          { rotulo: tr('Escolher fase…'), acao: () => this.escolherFase() },
          { rotulo: tr('&Pausar'), atalho: 'P', marcado: this.motor.estado === 'pausa', acao: () => this.alternarPausa() },
          { rotulo: tr('Sons'), marcado: this.som, acao: () => { this.som = !this.som; this.salvar(); } },
          { separador: true }, { rotulo: tr('Sai&r'), acao: () => this.j.fechar() },
        ] },
        { rotulo: tr('A&juda'), itens: [{ rotulo: tr('&Como jogar'), acao: () => this.ajuda() }] },
      ],
    });
    this.j.breakout = this;
    this.placar = h('div.bo-placar');
    this.faseEl = h('div.bo-fase');
    this.efeitosEl = h('div.bo-efeitos', { role: 'status', 'aria-live': 'polite' });
    this.acaoBt = h('button', { on: { click: () => this.acao() } });
    this.pausaBt = h('button', { on: { click: () => { this.alternarPausa(); this.canvas.focus(); } } });
    this.area = h('div.bo-area', this.canvas);
    this.j.corpo.append(this.placar, this.faseEl, this.area, this.efeitosEl,
      h('div.bo-comandos', this.acaoBt, this.pausaBt,
        h('button', { text: tr('Fases…'), on: { click: () => this.escolherFase() } }),
        h('button', { text: tr('Como jogar'), on: { click: () => this.ajuda() } })),
      h('div.bo-dica', tr('Mouse / ← → / A D: mover · Espaço: lançar / laser · P: pausar')));
    this.canvas.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch' || e.buttons) this.apontar(e); });
    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      this.canvas.setPointerCapture(e.pointerId); this.canvas.focus(); this.apontar(e); this.acao(); this.disparando = true; e.preventDefault();
    });
    for (const evento of ['pointerup', 'pointercancel', 'lostpointercapture']) this.canvas.addEventListener(evento, () => { this.disparando = false; });
    this.j.el.addEventListener('keydown', (e) => this.tecla(e, true));
    this.j.el.addEventListener('keyup', (e) => this.tecla(e, false));
    this.j.ev.on('desativada', () => this.pausar());
    this.j.ev.on('minimizada', () => this.pausar());
    this.j.ev.on('ativada', () => { if (!this.j.fechada) this.canvas.focus(); });
    this.perderFoco = () => this.pausar();
    this.ocultar = () => { if (document.hidden) this.pausar(); };
    window.addEventListener('blur', this.perderFoco);
    document.addEventListener('visibilitychange', this.ocultar);
    this.observador = new ResizeObserver(() => this.redimensionar()); this.observador.observe(this.area);
    this.j.ev.on('fechada', () => {
      this.salvar(); cancelAnimationFrame(this.raf); this.observador.disconnect();
      window.removeEventListener('blur', this.perderFoco); document.removeEventListener('visibilitychange', this.ocultar); aberto = null;
    });
    this.atualizar(); this.canvas.focus();
    const laco = (t) => {
      if (this.j.fechada) return;
      const dt = Math.min(0.04, (t - (this.antes || t)) / 1000); this.antes = t;
      this.motor.passo(dt, { direcao: Number(this.teclas.has('ArrowRight') || this.teclas.has('d')) - Number(this.teclas.has('ArrowLeft') || this.teclas.has('a')), disparando: this.disparando || this.teclas.has(' ') });
      this.eventos(t); this.animar(dt); this.atualizar(); this.desenhar(); this.raf = requestAnimationFrame(laco);
    };
    this.raf = requestAnimationFrame(laco);
  }
  salvar() {
    this.recorde = Math.max(this.recorde, this.motor.pontos);
    this.desbloqueada = Math.max(this.desbloqueada, this.motor.maiorFase + 1);
    const jogos = estado.config.jogos || {}, anterior = jogos.breakout || {};
    if (anterior.recorde === this.recorde && anterior.maiorFase === this.desbloqueada && anterior.som === this.som) return;
    definirConfig({ jogos: { ...jogos, breakout: { ...anterior, recorde: this.recorde, maiorFase: this.desbloqueada, som: this.som } } });
  }
  novo(fase = 0) { this.salvar(); this.motor.novo(fase); this.particulas = []; this.aviso = null; this.limparTeclas(); this.atualizar(); this.canvas.focus(); }
  limparTeclas() { this.teclas.clear(); this.disparando = false; }
  pausar() { this.motor.pausar(); this.limparTeclas(); this.atualizar(); }
  alternarPausa() { this.limparTeclas(); this.motor.alternarPausa(); this.atualizar(); }
  acao() { if (['fim', 'vitoria'].includes(this.motor.estado)) this.salvar(); this.motor.acao(); this.atualizar(); this.canvas.focus(); }
  apontar(e) {
    if (!['pronto', 'jogando'].includes(this.motor.estado)) return;
    const r = this.canvas.getBoundingClientRect(); this.motor.moverRaquete((e.clientX - r.left) * L / r.width);
  }
  tecla(e, baixo) {
    if (!baixo) { this.teclas.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); return; }
    if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.target.tagName) && e.key !== 'F2' && !['p', 'P', 'Escape'].includes(e.key)) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (!['ArrowLeft', 'ArrowRight', 'a', 'd', ' ', 'Enter', 'p', 'Escape', 'F2'].includes(k) || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault(); e.stopPropagation();
    if (baixo) {
      this.teclas.add(k);
      if (e.repeat) return;
      if (k === 'F2') this.novo();
      else if (k === 'p' || k === 'Escape') this.alternarPausa();
      else if (k === ' ' || k === 'Enter') this.acao();
    } else this.teclas.delete(k);
  }
  redimensionar() {
    const escala = Math.max(0.1, Math.min(this.area.clientWidth / L, this.area.clientHeight / A));
    this.canvas.style.width = Math.floor(L * escala) + 'px'; this.canvas.style.height = Math.floor(A * escala) + 'px';
  }
  eventos(agora) {
    const sons = { parede: 'parede', metal: 'parede', raquete: 'raquete', tijolo: 'tijolo', poder: 'bonusBreakout', laser: 'laserBreakout', escudo: 'raquete', explosao: 'tijolo', perdeu: 'perdeu', passou: 'vitoria', vitoria: 'vitoria' };
    for (const e of this.motor.consumirEventos()) {
      if (this.som && sons[e.tipo] && agora - (this.ultimoSom?.[e.tipo] || -1000) > (e.tipo === 'tijolo' ? 65 : 90)) {
        this.ultimoSom ||= {}; this.ultimoSom[e.tipo] = agora; tocar(sons[e.tipo]);
      }
      if (['perdeu', 'passou', 'vitoria'].includes(e.tipo)) this.salvar();
      if (e.tipo === 'fase') { this.particulas = []; this.aviso = null; }
      if (e.tipo === 'poder') this.aviso = { texto: tr(PODERES[e.poder].nome), cor: PODERES[e.poder].cor, tempo: 2 };
      if (!this.reduzir.matches && ['tijolo', 'explosao', 'poder', 'escudo'].includes(e.tipo)) {
        const n = e.tipo === 'explosao' ? 16 : 6;
        for (let i = 0; i < n; i++) this.particulas.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 140, vy: -30 - Math.random() * 90, vida: 0.5, cor: e.tipo === 'poder' ? PODERES[e.poder].cor : CORES[e.cor || 0] });
        this.particulas = this.particulas.slice(-160);
      }
    }
  }
  animar(dt) {
    if (this.motor.estado === 'pausa') return;
    if (this.aviso && (this.aviso.tempo -= dt) <= 0) this.aviso = null;
    for (const p of this.particulas) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 190 * dt; p.vida -= dt; }
    this.particulas = this.particulas.filter((p) => p.vida > 0);
  }
  atualizar() {
    const m = this.motor;
    this.recorde = Math.max(this.recorde, m.pontos);
    this.desbloqueada = Math.max(this.desbloqueada, m.maiorFase + 1);
    const placar = [tr('Pontos'), String(m.pontos).padStart(6, '0'), tr('Recorde'), String(this.recorde).padStart(6, '0'), tr('Vidas'), String(m.vidas)].join('|');
    if (placar !== this.ultimoPlacar) {
      this.ultimoPlacar = placar;
      const partes = placar.split('|');
      this.placar.replaceChildren(...[0, 2, 4].map((i) => h('div', h('span', partes[i]), h('strong', partes[i + 1]))));
    }
    this.faseEl.textContent = tr('Fase {n} de {total} · {nome}', { n: m.fase + 1, total: FASES.length, nome: tr(FASES[m.fase].nome) });
    const efeitos = Object.entries(m.efeitos).filter(([, t]) => t > 0).map(([id, t]) => [id, Math.ceil(t)]);
    if (m.escudo) efeitos.push(['escudo', '×' + m.escudo]);
    if (m.bolas.length > 1) efeitos.push(['multi', '×' + m.bolas.length]);
    const chave = JSON.stringify(efeitos);
    if (chave !== this.ultimosEfeitos) {
      this.ultimosEfeitos = chave;
      this.efeitosEl.replaceChildren(...(efeitos.length ? efeitos.map(([id, n]) => h('span.bo-efeito', { style: { borderColor: PODERES[id].cor }, title: tr(PODERES[id].ajuda) }, tr(PODERES[id].nome) + ' ' + n + (typeof n === 'number' ? 's' : ''))) : [h('span.bo-espera', tr('Pegue as cápsulas que caem dos tijolos.'))]));
    }
    this.acaoBt.textContent = m.estado === 'pausa' ? tr('Continuar') : m.estado === 'passou' ? tr('Próxima fase') : ['fim', 'vitoria'].includes(m.estado) ? tr('Jogar de novo') : m.estado === 'jogando' ? tr('Lançar / laser') : tr('Lançar');
    this.pausaBt.textContent = m.estado === 'pausa' ? tr('Continuar') : tr('Pausar');
    this.pausaBt.disabled = ['fim', 'vitoria'].includes(m.estado);
  }
  escolherFase() {
    this.pausar(); this.salvar();
    const j = new Janela({ titulo: tr('Escolher fase…'), dialogo: true, largura: 460, classe: 'bo-dialogo' });
    const grade = h('div.bo-fases');
    FASES.forEach((f, i) => {
      const livre = i < this.desbloqueada;
      const mini = h('canvas', { width: 96, height: 48, 'aria-hidden': 'true' }), c = mini.getContext('2d');
      c.fillStyle = TEMAS[f.tema].fundo; c.fillRect(0, 0, 96, 48);
      if (livre) f.mapa.forEach((linha, y) => [...linha].forEach((t, x) => { if (t !== '.') { c.fillStyle = t === '#' ? '#8192a6' : CORES['abcdef'.includes(t) ? 'abcdef'.indexOf(t) : (x + y) % 6]; c.fillRect(x * 8 + 1, y * 5 + 3, 6, 3); } }));
      grade.append(h('button', { disabled: !livre, title: livre ? tr(f.nome) : tr('Conclua as fases anteriores para desbloquear.'), on: { click: () => { j.fechar(); this.novo(i); } } }, mini,
        h('span', String(i + 1).padStart(2, '0') + ' · ' + (livre ? tr(f.nome) : tr('Bloqueada')))));
    });
    j.corpo.append(h('p', tr('Comece uma nova partida em uma fase desbloqueada. Seu recorde fica guardado.')), grade,
      h('div.bo-comandos', h('button', { text: tr('Voltar'), on: { click: () => j.fechar() } })));
    ajustarAoConteudo(j, { largura: 470 }); grade.querySelector('button:not(:disabled)')?.focus();
  }
  ajuda() {
    this.pausar();
    const j = new Janela({ titulo: tr('Como jogar') + ' — Breakout', dialogo: true, largura: 460, classe: 'bo-dialogo' });
    j.corpo.append(h('p', tr('24 fases, três vidas e oito power-ups. Derrube todos os tijolos coloridos para avançar. O aço não precisa ser destruído; tijolos reforçados exigem mais impactos e os explosivos atingem os vizinhos.')),
      h('p', tr('Mouse / ← → / A D: mover · Espaço: lançar / laser · P: pausar')),
      h('p', tr('Mire com as bordas da raquete. Derrube tijolos em sequência para multiplicar os pontos. As fases desbloqueadas e o recorde ficam salvos.')),
      h('div.bo-legenda', ...Object.values(PODERES).map((p) => h('div', h('strong', { style: { background: p.cor, color: '#142132' } }, p.sigla), h('span', h('b', tr(p.nome)), h('br'), tr(p.ajuda))))),
      h('div.bo-comandos', h('button', { text: tr('Voltar'), on: { click: () => j.fechar() } })));
    ajustarAoConteudo(j, { largura: 470 }); j.corpo.querySelector('button').focus();
  }
  desenhar() {
    const c = this.ctx, m = this.motor, tema = TEMAS[FASES[m.fase].tema];
    c.globalAlpha = 1; c.fillStyle = tema.fundo; c.fillRect(0, 0, L, A);
    c.fillStyle = tema.grade;
    for (let y = 22; y < A; y += 24) for (let x = 20; x < L; x += 24) c.fillRect(x, y, 1, 1);
    c.fillStyle = tema.grade; c.fillRect(4, 8, L - 8, 4); c.fillRect(4, 8, 4, A - 8); c.fillRect(L - 8, 8, 4, A - 8);
    c.fillStyle = tema.acento;
    for (let y = 24; y < A; y += 36) { c.fillRect(5, y, 2, 8); c.fillRect(L - 7, y, 2, 8); }
    for (const t of m.tijolos) {
      if (!t.vivo) continue;
      const { x, y, w, h: a } = t, metal = t.tipo === '#';
      c.fillStyle = '#050b12'; c.fillRect(x + 2, y + 2, w, a);
      c.fillStyle = metal ? '#6d7f92' : CORES[t.cor]; c.fillRect(x, y, w, a);
      c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(x, y, w, 2); c.fillRect(x, y, 2, a);
      c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x, y + a - 3, w, 3); c.fillRect(x + w - 2, y, 2, a);
      if (metal) { c.fillStyle = '#ccd5df'; c.fillRect(x + 4, y + 6, 3, 3); c.fillRect(x + w - 7, y + 6, 3, 3); }
      else if (t.tipo === '*') { c.fillStyle = '#572b31'; c.fillRect(x + 14, y + 5, 7, 7); c.fillStyle = '#fff6c4'; c.fillRect(x + 17, y + 3, 2, 3); }
      else if (t.max > 1) {
        c.fillStyle = '#403844'; for (let i = 0; i < t.vidas; i++) c.fillRect(x + w / 2 - t.vidas * 3 + i * 6, y + 6, 3, 3);
        if (t.vidas < t.max) { c.fillRect(x + 7, y + 2, 2, 5); c.fillRect(x + 9, y + 7, 2, 5); }
      }
    }
    const r = m.raquete;
    c.fillStyle = '#030b13'; c.fillRect(Math.round(r.x) + 2, r.y + 3, r.w, r.h);
    c.fillStyle = m.efeitos.ima ? '#f1d078' : '#dbe7ee'; c.fillRect(Math.round(r.x), r.y, r.w, r.h);
    c.fillStyle = '#fff'; c.fillRect(Math.round(r.x) + 3, r.y, r.w - 6, 2);
    c.fillStyle = m.efeitos.laser ? '#fa7e8f' : tema.acento; c.fillRect(Math.round(r.x), r.y, 8, r.h); c.fillRect(Math.round(r.x + r.w - 8), r.y, 8, r.h);
    c.fillStyle = '#8498a9'; c.fillRect(Math.round(r.x + 12), r.y + r.h - 2, r.w - 24, 2);
    for (const b of m.bolas) {
      const x = Math.round(b.x), y = Math.round(b.y);
      if (!this.reduzir.matches && !b.presa) {
        c.fillStyle = m.efeitos.fogo ? '#ae5638' : '#435f7d'; c.fillRect(Math.round(x - b.vx * 0.02) - 2, Math.round(y - b.vy * 0.02) - 2, 4, 4);
      }
      c.fillStyle = m.efeitos.fogo ? '#ffae67' : '#edf7ff'; c.fillRect(x - 3, y - 4, 6, 8); c.fillRect(x - 4, y - 3, 8, 6);
      c.fillStyle = '#fff'; c.fillRect(x - 2, y - 3, 3, 2);
    }
    c.font = 'bold 11px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const p of m.poderes) {
      const d = PODERES[p.tipo], x = Math.round(p.x), y = Math.round(p.y);
      c.fillStyle = '#060e1b'; c.fillRect(x + 1, y + 1, p.w, p.h); c.fillStyle = d.cor; c.fillRect(x, y, p.w, p.h);
      c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(x + 2, y + 1, p.w - 4, 2);
      c.fillStyle = '#152433'; c.fillText(d.sigla, x + p.w / 2, y + p.h / 2 + 1);
    }
    c.fillStyle = '#ff8fba'; for (const t of m.tiros) c.fillRect(Math.round(t.x), Math.round(t.y), t.w, t.h);
    if (m.escudo) { c.fillStyle = '#82e8f2'; for (let x = 10; x < L - 10; x += 12) c.fillRect(x, A - 10, 8, 2); }
    for (const p of this.particulas) { c.globalAlpha = Math.min(1, p.vida * 3); c.fillStyle = p.cor; c.fillRect(Math.round(p.x), Math.round(p.y), 3, 3); } c.globalAlpha = 1;
    if (m.combo >= 2 && m.estado === 'jogando') { c.fillStyle = tema.acento; c.fillText(tr('Combo ×{n}', { n: m.combo }), L / 2, 230); }
    if (this.aviso && m.estado === 'jogando') { c.fillStyle = this.aviso.cor; c.font = 'bold 13px Katica, sans-serif'; c.fillText(this.aviso.texto, L / 2, 270); }
    const titulos = { pronto: tr('Prepare a raquete!'), pausa: tr('Pausa'), passou: tr('Fase concluída!'), fim: tr('Fim de jogo'), vitoria: tr('Você venceu as 24 fases!') };
    if (titulos[m.estado]) {
      const y = 258;
      c.fillStyle = 'rgba(5,12,22,.94)'; c.fillRect(26, y - 25, L - 52, 92);
      c.strokeStyle = tema.acento; c.strokeRect(26.5, y - 24.5, L - 53, 91);
      c.fillStyle = tema.acento; c.font = 'bold 19px Katica, sans-serif'; c.fillText(titulos[m.estado], L / 2, y);
      c.fillStyle = '#e6edf5'; c.font = '13px Katica, sans-serif';
      const instrucao = m.estado === 'pronto' ? tr('Clique ou aperte Espaço para lançar a bola') : m.estado === 'pausa' ? tr('Clique ou aperte P para continuar') : m.estado === 'passou' ? tr('Clique ou aperte Espaço para a próxima fase') : tr('Clique ou aperte Espaço para jogar de novo');
      c.fillText(instrucao, L / 2, y + 26);
      if (m.estado === 'pronto') { c.fillStyle = '#8ca0b7'; c.font = '11px Katica, sans-serif'; c.fillText(tr('Pegue as cápsulas que caem dos tijolos.'), L / 2, y + 47); }
    }
  }
}
let aberto = null;
registrarApp('breakout', { nome: 'Breakout', icone: 'breakout', abrir: () => { if (aberto && !aberto.j.fechada) { aberto.j.focar(); return aberto; } aberto = new Breakout(); return aberto; } });
