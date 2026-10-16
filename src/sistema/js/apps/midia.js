/*
 * O Reprodutor de mídia: vídeos e músicas do disco, com a fila da própria pasta (o próximo
 * começa sozinho), as legendas .srt e .vtt de mesmo nome, a velocidade, a tela cheia e as
 * teclas de mídia do teclado. Nas músicas, as barras de som da época.
 */
import { h, img, nomeDe, paiDe, juntar, extensao, semExtensao, urlDoDisco } from '../util.js';
import { Janela } from '../janelas.js';
import { registrarApp, abrir, programasPara, adicionarRecente, pastaDocs, estado, definirConfig, abrirNoComputador } from '../sistema.js';
import { caixaArquivo, erro, info, propriedades } from '../dialogos.js';
import { deslizante } from '../controles.js';
import { irmaos } from './imagens.js';
import { tr, marcar, localidade } from '../idioma.js';

export const TIPOS_VIDEO = ['mp4', 'm4v', 'webm', 'mkv', 'mov', 'ogv'];
export const TIPOS_AUDIO = ['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'oga', 'opus', 'weba'];
const TIPOS = [...TIPOS_VIDEO, ...TIPOS_AUDIO];
const VELOCIDADES = [0.5, 0.75, 1, 1.25, 1.5, 2];

/** 75 → "1:15"; 3725 → "1:02:05". */
export function tempo(s) {
  if (!Number.isFinite(s) || s < 0) s = 0;
  s = Math.floor(s);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return hh ? `${hh}:${String(mm).padStart(2, '0')}:${ss}` : `${mm}:${ss}`;
}

/** Legenda .srt → WebVTT (o que o <video> entende): as vírgulas dos tempos viram pontos. */
export function srtParaVtt(srt) {
  const corpo = String(srt).replace(/^﻿/, '').replace(/\r\n?/g, '\n')
    .replace(/(\d{1,2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  return 'WEBVTT\n\n' + corpo.trim() + '\n';
}

class Reprodutor {
  constructor({ arquivo } = {}) {
    const cfg = estado.config.reprodutor || {};
    this.rel = null;
    this.lista = [];
    this.repetir = !!cfg.repetir;
    this.aleatorio = !!cfg.aleatorio;
    this.legendas = cfg.legendas !== false;
    this.temLegenda = false;
    this.video = h('video.rep-video', { preload: 'metadata', playsInline: true });
    this.video.volume = cfg.volume ?? 0.8;
    this.video.muted = !!cfg.mudo;
    this.capa = h('div.rep-capa', img('som', 32), this.capaTitulo = h('div.rep-capa-titulo'), this.barras = h('canvas.rep-barras', { width: 256, height: 64 }));
    this.aviso = h('div.rep-aviso');
    this.tela = h('div.rep-tela', this.video, this.capa, this.aviso);
    this.j = new Janela({
      titulo: tr('Reprodutor de mídia'),
      icone: 'reprodutor',
      largura: 560,
      altura: 420,
      classe: 'reprodutor',
      menus: this.menus(),
      status: [{ texto: tr('Parado'), largura: 110, fixo: true }, { texto: '', largura: 70, fixo: true }, ''],
    });
    this.montarControles();
    this.j.corpo.append(this.tela, this.controles);
    this.ligarEventos();
    if (arquivo) this.tocarArquivo(arquivo);
    else this.atualizar();
    this.j.el.focus();
  }

  menus() {
    return [
      {
        rotulo: tr('&Arquivo'), itens: () => [
          { rotulo: tr('&Abrir…'), atalho: 'Ctrl+O', acao: () => this.abrirOutro() },
          { rotulo: tr('Abrir c&om'), desativado: !this.rel, sub: () => this.itensAbrirCom() },
          { separador: true },
          { rotulo: tr('&Propriedades'), desativado: !this.rel, acao: () => propriedades(this.rel) },
          { separador: true },
          { rotulo: tr('Sai&r'), acao: () => this.j.fechar() },
        ],
      },
      {
        rotulo: tr('Re&produzir'), itens: () => [
          { rotulo: this.video.paused ? tr('&Reproduzir') : tr('Pa&usar'), atalho: tr('Espaço'), desativado: !this.rel, acao: () => this.alternar() },
          { rotulo: tr('&Parar'), desativado: !this.rel, acao: () => this.parar() },
          { separador: true },
          { rotulo: tr('&Anterior'), atalho: 'PgUp', desativado: this.lista.length < 2, acao: () => this.ir(-1) },
          { rotulo: tr('Pró&ximo'), atalho: 'PgDn', desativado: this.lista.length < 2, acao: () => this.ir(1) },
          { separador: true },
          { rotulo: tr('A&vançar 10 segundos'), atalho: '→', desativado: !this.rel, acao: () => this.pular(10) },
          { rotulo: tr('V&oltar 10 segundos'), atalho: '←', desativado: !this.rel, acao: () => this.pular(-10) },
          { separador: true },
          { rotulo: tr('Repe&tir'), marcado: this.repetir, acao: () => this.opcao('repetir', !this.repetir) },
          { rotulo: tr('A&leatório'), marcado: this.aleatorio, acao: () => this.opcao('aleatorio', !this.aleatorio) },
          { separador: true },
          { rotulo: tr('&Mais alto'), atalho: '↑', acao: () => this.mudarVolume(0.1) },
          { rotulo: tr('Mais &baixo'), atalho: '↓', acao: () => this.mudarVolume(-0.1) },
          { rotulo: tr('&Sem som'), atalho: 'M', marcado: this.video.muted, acao: () => this.mudo(!this.video.muted) },
        ],
      },
      {
        rotulo: tr('E&xibir'), itens: () => [
          { rotulo: tr('&Tela cheia'), atalho: 'Alt+Enter', desativado: !this.ehVideo(), acao: () => this.telaCheia() },
          { rotulo: tr('Tamanho &original'), desativado: !this.ehVideo() || !this.video.videoWidth, acao: () => this.tamanhoOriginal() },
          { separador: true },
          { rotulo: tr('&Legendas'), desativado: !this.temLegenda, marcado: this.temLegenda && this.legendas, acao: () => this.opcao('legendas', !this.legendas) },
          {
            rotulo: tr('&Velocidade'), desativado: !this.rel, sub: () => VELOCIDADES.map((v) => ({
              rotulo: v === 1 ? tr('Normal') : `${v.toLocaleString(localidade())}×`, radio: true, marcado: this.video.playbackRate === v, acao: () => { this.video.playbackRate = v; this.atualizar(); },
            })),
          },
        ],
      },
      {
        rotulo: tr('A&juda'), itens: [
          { rotulo: tr('&Sobre o Reprodutor de mídia'), acao: () => info(tr('Reprodutor de mídia') + '\n\n' + tr('Toca os vídeos (MP4, WebM, MKV, MOV) e as músicas (MP3, M4A, WAV, FLAC, OGG) do disco C:. Os outros arquivos da mesma pasta formam a fila; as legendas .srt ou .vtt de mesmo nome aparecem sozinhas.\nVídeos em HEVC (H.265) e em AVI não são reproduzidos: use um programa do computador principal.'), tr('Sobre o Reprodutor de mídia')) },
        ],
      },
    ];
  }

  itensAbrirCom() {
    const outros = programasPara(nomeDe(this.rel)).filter((p) => p.id !== 'midia');
    return [
      ...outros.map((p) => ({ rotulo: p.nome, icone: p.icone, acao: () => abrir(p.id, { arquivo: this.rel }) })),
      ...(outros.length ? [{ separador: true }] : []),
      { rotulo: tr('Programa do computador principal'), icone: 'computador', acao: () => abrirNoComputador(this.rel).catch((e) => erro(e.message)) },
    ];
  }

  montarControles() {
    const bt = (icone, dica, acao) => h('button.ferramenta', { title: dica, on: { click: acao } }, img(icone, 16));
    this.btTocar = bt('tocar', tr('Reproduzir (Espaço)'), () => this.alternar());
    this.btParar = bt('parar', tr('Parar'), () => this.parar());
    this.btAnterior = bt('anterior', tr('Anterior (PgUp)'), () => this.ir(-1));
    this.btProximo = bt('proximo', tr('Próximo (PgDn)'), () => this.ir(1));
    this.posicao = deslizante({
      valor: 0, min: 0, max: 1, tamanho: 'flex', rotulo: tr('Posição'), passo: 5, passoGrande: 30,
      aoMudar: (v) => { if (this.posicao && this.posicao.arrastando()) this.relogio.textContent = `${tempo(v)} / ${tempo(this.video.duration)}`; },
      aoSoltar: (v) => { if (Number.isFinite(this.video.duration)) this.video.currentTime = v; },
    });
    this.relogio = h('span.rep-tempo', '0:00 / 0:00');
    this.btSom = bt('som-alto', tr('Sem som (M)'), () => this.mudo(!this.video.muted));
    this.volume = deslizante({
      valor: Math.round(this.video.volume * 100), min: 0, max: 100, tamanho: 70, rotulo: tr('Volume'), passo: 5, passoGrande: 20,
      aoMudar: (v) => { this.video.volume = v / 100; if (v && this.video.muted) this.video.muted = false; this.atualizarSom(); },
      aoSoltar: () => this.guardar(),
    });
    this.btCheia = bt('tela-cheia', tr('Tela cheia (Alt+Enter)'), () => this.telaCheia());
    this.controles = h('div.rep-controles',
      this.btTocar, this.btParar, h('span.sep'), this.btAnterior, this.btProximo, h('span.sep'),
      this.posicao.el, this.relogio, h('span.sep'), this.btSom, this.volume.el, this.btCheia);
  }

  ligarEventos() {
    const v = this.video;
    v.addEventListener('loadedmetadata', () => {
      this.posicao.limites(0, Number.isFinite(v.duration) ? v.duration : 0);
      this.atualizar();
    });
    v.addEventListener('timeupdate', () => {
      this.posicao.mostrar(v.currentTime);
      if (!this.posicao.arrastando()) this.relogio.textContent = `${tempo(v.currentTime)} / ${tempo(v.duration)}`;
    });
    for (const ev of ['play', 'pause', 'ratechange', 'volumechange']) v.addEventListener(ev, () => this.atualizar());
    v.addEventListener('play', () => this.comecouATocar());
    v.addEventListener('ended', () => this.terminou());
    v.addEventListener('error', () => this.falhou());
    v.addEventListener('click', () => this.alternar());
    v.addEventListener('dblclick', () => this.telaCheia());
    this.j.el.addEventListener('keydown', (e) => this.teclas(e));
    this.j.el.tabIndex = -1;
    this.j.ev.on('ativada', () => setTimeout(() => { if (!this.j.el.contains(document.activeElement) || document.activeElement === document.body) this.j.el.focus(); }, 0));
    this.j.ev.on('fechada', () => this.fechou());
    // Enquanto um vídeo toca, a proteção de tela não entra (com música, entra).
    this.ativo = setInterval(() => { if (!v.paused && this.ehVideo()) document.dispatchEvent(new Event('retro-atividade')); }, 20000);
  }

  ehVideo() {
    return !!this.rel && TIPOS_VIDEO.includes(extensao(this.rel));
  }

  /* ---------- Tocar ---------- */

  async tocarArquivo(rel, { tocar = true } = {}) {
    this.rel = rel;
    adicionarRecente(rel);
    this.aviso.textContent = '';
    this.tela.classList.remove('com-aviso');
    this.tela.classList.toggle('audio', !this.ehVideo());
    this.capaTitulo.textContent = semExtensao(nomeDe(rel));
    for (const t of [...this.video.querySelectorAll('track')]) t.remove();
    this.temLegenda = false;
    const velocidade = this.video.playbackRate;
    this.video.src = urlDoDisco(rel);
    this.video.playbackRate = velocidade;
    this.posicao.limites(0, 0);
    this.posicao.mostrar(0);
    this.relogio.textContent = '0:00 / 0:00';
    if (tocar) this.video.play().catch(() => { });
    this.atualizar();
    this.lista = await irmaos(rel, TIPOS);
    if (!this.lista.includes(rel)) this.lista.push(rel);
    if (this.ehVideo()) this.procurarLegenda(rel);
    this.atualizar();
  }

  /** A legenda de mesmo nome (.vtt ou .srt) na mesma pasta. */
  async procurarLegenda(rel) {
    const pai = paiDe(rel);
    const base = semExtensao(nomeDe(rel)).toLowerCase();
    const lista = await retro.disco.listar(pai).catch(() => []);
    const leg = lista.find((i) => !i.pasta && ['vtt', 'srt'].includes(extensao(i.nome)) && semExtensao(i.nome).toLowerCase().replace(/\.[a-z]{2,3}(-[a-z]{2})?$/i, '') === base)
      || lista.find((i) => !i.pasta && ['vtt', 'srt'].includes(extensao(i.nome)) && semExtensao(i.nome).toLowerCase() === base);
    if (!leg || this.rel !== rel) return;
    try {
      const texto = await retro.disco.lerTexto(juntar(pai, leg.nome));
      const vtt = extensao(leg.nome) === 'srt' ? srtParaVtt(texto) : texto;
      const faixa = h('track', { kind: 'subtitles', label: leg.nome, src: URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' })), default: true });
      this.video.append(faixa);
      this.temLegenda = true;
      setTimeout(() => this.aplicarLegendas(), 0);
    } catch { }
  }

  aplicarLegendas() {
    for (const t of this.video.textTracks) t.mode = this.legendas ? 'showing' : 'hidden';
  }

  alternar() {
    if (!this.rel) return this.abrirOutro();
    if (this.video.paused || this.video.ended) this.video.play().catch(() => { });
    else this.video.pause();
  }

  parar() {
    this.video.pause();
    if (Number.isFinite(this.video.duration)) this.video.currentTime = 0;
    this.atualizar();
  }

  pular(s) {
    if (!Number.isFinite(this.video.duration)) return;
    this.video.currentTime = Math.max(0, Math.min(this.video.duration, this.video.currentTime + s));
  }

  ir(passo) {
    if (this.lista.length < 2) return;
    let i = this.lista.indexOf(this.rel);
    if (this.aleatorio && passo > 0) {
      let j = i;
      while (j === i) j = Math.floor(Math.random() * this.lista.length);
      i = j;
    } else {
      i = (i + passo + this.lista.length) % this.lista.length;
    }
    this.tocarArquivo(this.lista[i]);
  }

  terminou() {
    const i = this.lista.indexOf(this.rel);
    const ultimo = i === this.lista.length - 1;
    if (this.lista.length > 1 && (!ultimo || this.repetir || this.aleatorio)) return this.ir(1);
    if (this.repetir) {
      this.video.currentTime = 0;
      this.video.play().catch(() => { });
      return;
    }
    this.atualizar();
  }

  falhou() {
    if (!this.rel || !this.video.getAttribute('src')) return;
    this.tela.classList.add('com-aviso');
    this.aviso.textContent = tr('Não foi possível reproduzir {nome}. O formato pode não ser aceito (como o HEVC e o AVI) ou o arquivo está danificado. Experimente Arquivo › Abrir com › Programa do computador principal.', { nome: nomeDe(this.rel) });
    this.atualizar();
  }

  comecouATocar() {
    if (!this.ehVideo()) this.ligarBarras();
    // As teclas de mídia do teclado (e o controle do sistema) passam a falar com este reprodutor.
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({ title: semExtensao(nomeDe(this.rel)), artist: 'Retro Computer' });
        navigator.mediaSession.setActionHandler('play', () => this.video.play().catch(() => { }));
        navigator.mediaSession.setActionHandler('pause', () => this.video.pause());
        navigator.mediaSession.setActionHandler('stop', () => this.parar());
        navigator.mediaSession.setActionHandler('nexttrack', this.lista.length > 1 ? () => this.ir(1) : null);
        navigator.mediaSession.setActionHandler('previoustrack', this.lista.length > 1 ? () => this.ir(-1) : null);
      } catch { }
    }
  }

  /* ---------- As barras de som (músicas) ---------- */

  ligarBarras() {
    if (!this.analisador) {
      try {
        this.contexto = new AudioContext();
        const fonte = this.contexto.createMediaElementSource(this.video);
        this.analisador = this.contexto.createAnalyser();
        this.analisador.fftSize = 64;
        fonte.connect(this.analisador);
        this.analisador.connect(this.contexto.destination);
      } catch {
        this.analisador = null;
        return;
      }
    }
    if (this.contexto.state === 'suspended') this.contexto.resume().catch(() => { });
    if (this.raf) return;
    const g = this.barras.getContext('2d');
    const dados = new Uint8Array(this.analisador.frequencyBinCount);
    const picos = new Array(dados.length).fill(0);
    const quadro = () => {
      this.raf = null;
      if (this.j.fechada || this.video.paused || this.ehVideo()) {
        g.clearRect(0, 0, this.barras.width, this.barras.height);
        return;
      }
      this.analisador.getByteFrequencyData(dados);
      const W = this.barras.width;
      const A = this.barras.height;
      g.fillStyle = '#000';
      g.fillRect(0, 0, W, A);
      const n = 24;
      const larg = Math.floor(W / n);
      for (let i = 0; i < n; i++) {
        const v = dados[Math.min(dados.length - 1, i)] / 255;
        const blocos = Math.round(v * 12);
        picos[i] = Math.max(blocos, (picos[i] || 0) - 0.15);
        for (let b = 0; b < blocos; b++) {
          g.fillStyle = b > 9 ? '#ff3030' : b > 6 ? '#ffd800' : '#00d000';
          g.fillRect(i * larg + 1, A - (b + 1) * 5, larg - 2, 4);
        }
        g.fillStyle = '#c0c0c0';
        g.fillRect(i * larg + 1, A - Math.ceil(picos[i]) * 5 - 5, larg - 2, 2);
      }
      this.raf = requestAnimationFrame(quadro);
    };
    this.raf = requestAnimationFrame(quadro);
  }

  /* ---------- Som, opções, tela ---------- */

  mudarVolume(d) {
    this.volume.definir(Math.round(this.video.volume * 100 + d * 100));
    this.guardar();
  }

  mudo(v) {
    this.video.muted = v;
    this.atualizarSom();
    this.guardar();
  }

  atualizarSom() {
    const v = this.video.muted ? 0 : this.video.volume;
    const nome = this.video.muted ? 'som-mudo' : v === 0 ? 'som-zero' : v < 0.34 ? 'som-baixo' : v < 0.67 ? 'som-medio' : 'som-alto';
    const im = this.btSom.querySelector('img');
    if (im) im.src = `icones/16/${nome}.png`;
  }

  opcao(k, v) {
    this[k] = v;
    if (k === 'legendas') this.aplicarLegendas();
    this.guardar();
  }

  guardar() {
    definirConfig({ reprodutor: { volume: this.video.volume, mudo: this.video.muted, repetir: this.repetir, aleatorio: this.aleatorio, legendas: this.legendas } }).catch(() => { });
  }

  /** A tela cheia: o vídeo cobre a tela; os controles aparecem ao mexer o mouse. */
  telaCheia() {
    if (!this.ehVideo()) return;
    const el = this.j.el;
    const sair = () => {
      el.classList.remove('rep-cheia', 'rep-mostrar');
      window.removeEventListener('keydown', tecla, true);
      this.tela.removeEventListener('pointermove', mexeu);
      this.controles.removeEventListener('pointermove', mexeu);
      clearTimeout(this.esconder);
      this.sairCheia = null;
    };
    if (this.sairCheia) return this.sairCheia();
    const mexeu = () => {
      el.classList.add('rep-mostrar');
      clearTimeout(this.esconder);
      this.esconder = setTimeout(() => el.classList.remove('rep-mostrar'), 2500);
    };
    const tecla = (e) => {
      if (e.key === 'Escape' || (e.altKey && e.key === 'Enter')) {
        e.preventDefault();
        e.stopPropagation();
        sair();
      }
    };
    this.sairCheia = sair;
    el.classList.add('rep-cheia');
    window.addEventListener('keydown', tecla, true);
    this.tela.addEventListener('pointermove', mexeu);
    this.controles.addEventListener('pointermove', mexeu);
    mexeu();
    el.focus();
  }

  /** A janela do tamanho do vídeo (limitado pela tela). */
  tamanhoOriginal() {
    const v = this.video;
    if (!v.videoWidth) return;
    if (this.j.maximizada) this.j.restaurar();
    const extraL = this.j.el.offsetWidth - this.tela.clientWidth;
    const extraA = this.j.el.offsetHeight - this.tela.clientHeight;
    const area = this.j.el.parentElement.getBoundingClientRect();
    this.j.ret.w = Math.min(area.width, v.videoWidth + extraL);
    this.j.ret.h = Math.min(area.height, v.videoHeight + extraA);
    this.j.ret.x = Math.max(0, Math.min(this.j.ret.x, area.width - this.j.ret.w));
    this.j.ret.y = Math.max(0, Math.min(this.j.ret.y, area.height - this.j.ret.h));
    this.j.aplicarRet();
  }

  atualizar() {
    const nome = this.rel ? nomeDe(this.rel) : '';
    this.j.definirTitulo(nome ? `${nome} - ${tr('Reprodutor de mídia')}` : tr('Reprodutor de mídia'));
    const tocando = !!this.rel && !this.video.paused && !this.video.ended;
    const im = this.btTocar.querySelector('img');
    if (im) im.src = `icones/16/${tocando ? 'pausar' : 'tocar'}.png`;
    this.btTocar.title = tocando ? tr('Pausar (Espaço)') : tr('Reproduzir (Espaço)');
    this.btParar.disabled = !this.rel;
    this.btAnterior.disabled = this.lista.length < 2;
    this.btProximo.disabled = this.lista.length < 2;
    this.btCheia.disabled = !this.ehVideo();
    this.atualizarSom();
    this.volume.mostrar(Math.round(this.video.volume * 100));
    const i = this.lista.indexOf(this.rel);
    const estadoTxt = !this.rel ? tr('Parado') : this.tela.classList.contains('com-aviso') ? tr('Erro') : tocando ? tr('Reproduzindo') : this.video.currentTime > 0 ? tr('Pausado') : tr('Parado');
    const extra = [];
    if (this.video.videoWidth && this.ehVideo()) extra.push(`${this.video.videoWidth} × ${this.video.videoHeight}`);
    if (this.video.playbackRate !== 1) extra.push(`${this.video.playbackRate.toLocaleString(localidade())}×`);
    this.j.definirStatus([
      { texto: estadoTxt, largura: 110, fixo: true },
      { texto: this.lista.length > 1 && i >= 0 ? tr('{n} de {total}', { n: i + 1, total: this.lista.length }) : '', largura: 70, fixo: true },
      extra.join(' · '),
    ]);
  }

  async abrirOutro() {
    const rel = await caixaArquivo({
      modo: 'abrir', pasta: this.rel ? paiDe(this.rel) : pastaDocs(),
      tipos: [{ rotulo: tr('Vídeos e músicas'), exts: TIPOS }, { rotulo: tr('Vídeos'), exts: TIPOS_VIDEO }, { rotulo: tr('Músicas'), exts: TIPOS_AUDIO }],
    });
    if (rel) this.tocarArquivo(rel);
  }

  teclas(e) {
    if (e.target.closest('.menubar') || e.target.closest('.deslizante')) return;
    const ctrl = e.ctrlKey || e.metaKey;
    const k = e.key;
    let feito = true;
    if (ctrl && k.toLowerCase() === 'o') this.abrirOutro();
    else if (e.altKey && k === 'Enter') this.telaCheia();
    else if (ctrl || e.altKey) feito = false;
    else if (k === ' ' || k.toLowerCase() === 'k' || k === 'MediaPlayPause') this.alternar();
    else if (k === 'MediaStop') this.parar();
    else if (k === 'ArrowRight') this.pular(e.shiftKey ? 30 : 5);
    else if (k === 'ArrowLeft') this.pular(e.shiftKey ? -30 : -5);
    else if (k.toLowerCase() === 'l') this.pular(10);
    else if (k.toLowerCase() === 'j') this.pular(-10);
    else if (k === 'ArrowUp') this.mudarVolume(0.1);
    else if (k === 'ArrowDown') this.mudarVolume(-0.1);
    else if (k.toLowerCase() === 'm') this.mudo(!this.video.muted);
    else if (k === 'PageDown' || k === 'MediaTrackNext') this.ir(1);
    else if (k === 'PageUp' || k === 'MediaTrackPrevious') this.ir(-1);
    else if (k === 'Home') this.pular(-Infinity);
    else if (k.toLowerCase() === 'f') this.telaCheia();
    else if (/^[0-9]$/.test(k) && Number.isFinite(this.video.duration)) this.video.currentTime = (Number(k) / 10) * this.video.duration;
    else feito = false;
    if (feito) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  fechou() {
    clearInterval(this.ativo);
    if (this.sairCheia) this.sairCheia();
    if (this.raf) cancelAnimationFrame(this.raf);
    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load();
    if (this.contexto) this.contexto.close().catch(() => { });
    if ('mediaSession' in navigator) {
      for (const a of ['play', 'pause', 'stop', 'nexttrack', 'previoustrack']) {
        try { navigator.mediaSession.setActionHandler(a, null); } catch { }
      }
    }
  }
}

function abrirReprodutor(args = {}) {
  return new Reprodutor(args);
}

registrarApp('midia', { nome: marcar('Reprodutor de mídia'), icone: 'reprodutor', abrir: abrirReprodutor, tipos: TIPOS });
