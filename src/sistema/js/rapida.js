/*
 * A visualização rápida: a barra de espaço num arquivo do Explorador abre uma janela grande com o
 * painel de visualização (o mesmo do Explorador: fotos, PDFs, textos, Word, planilhas, vídeos). As
 * setas passam para o arquivo do lado, Enter o abre no programa, e a barra de espaço ou Esc fecham.
 */
import { h, rotulo } from './util.js';
import { Janela } from './janelas.js';
import { PainelVisualizacao } from './visualizar.js';
import { tr } from './idioma.js';

let aberta = null;

class VisualizacaoRapida {
  constructor() {
    this.itens = [];
    this.i = 0;
    this.vis = new PainelVisualizacao();
    this.j = new Janela({ id: 'visualizacao-rapida', titulo: tr('Visualização rápida'), icone: 'imagens', largura: 680, altura: 500, status: [''] });
    this.j.el.tabIndex = -1;
    this.btAbrir = h('button.padrao', { on: { click: () => this.abrir() } }, rotulo(tr('&Abrir')));
    this.btAnterior = h('button', { title: tr('Arquivo anterior (←)'), on: { click: () => this.passo(-1) } }, '◄');
    this.btProximo = h('button', { title: tr('Próximo arquivo (→)'), on: { click: () => this.passo(1) } }, '►');
    this.j.corpo.classList.add('rapida-corpo');
    this.j.corpo.append(
      h('div.rapida-vis', this.vis.el),
      h('div.acoes', this.btAnterior, this.btProximo, h('div', { style: { flex: '1' } }), this.btAbrir, h('button', { on: { click: () => this.j.fechar() } }, tr('Fechar'))),
    );
    this.j.el.addEventListener('keydown', (e) => this.tecla(e));
    this.j.ev.on('fechada', () => {
      this.vis.limpar();
      aberta = null;
      if (this.aoFechar) this.aoFechar();
    });
  }

  tecla(e) {
    if (e.target.closest('input, textarea, select, video, audio')) return;
    if (e.key === ' ' || e.key === 'Escape') { e.preventDefault(); this.j.fechar(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); this.passo(-1); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); this.passo(1); }
    else if (e.key === 'Enter') { e.preventDefault(); this.abrir(); }
  }

  mostrar(itens, i, o) {
    this.itens = itens;
    this.i = Math.max(0, Math.min(itens.length - 1, i));
    this.o = o;
    this.aoFechar = o.aoFechar;
    this.desenhar();
  }

  desenhar() {
    const it = this.itens[this.i];
    if (!it) return this.j.fechar();
    this.j.definirTitulo(tr('Visualização rápida: {nome}', { nome: it.rotulo }));
    this.vis.mostrar(it);
    this.btAnterior.disabled = this.i <= 0;
    this.btProximo.disabled = this.i >= this.itens.length - 1;
    this.j.definirStatus(tr('{i} de {n} · Barra de espaço ou Esc fecha', { i: this.i + 1, n: this.itens.length }));
    this.j.el.focus();
  }

  passo(d) {
    const k = this.i + d;
    if (k < 0 || k >= this.itens.length) return;
    this.i = k;
    this.desenhar();
    if (this.o.aoMudar) this.o.aoMudar(this.itens[k]);
  }

  abrir() {
    const it = this.itens[this.i];
    if (!it) return;
    this.j.fechar();
    if (this.o.aoAbrir) this.o.aoAbrir(it);
  }
}

/**
 * Abre (ou atualiza) a visualização rápida: itens são os arquivos da pasta (os itens da vista, sem as
 * pastas), i o escolhido. aoMudar(it) acompanha a seleção; aoAbrir(it) abre no programa.
 */
export function visualizacaoRapida(itens, i, o = {}) {
  if (!itens.length) return null;
  if (!aberta) aberta = new VisualizacaoRapida();
  aberta.mostrar(itens, i, o);
  aberta.j.focar();
  return aberta;
}

/** Fecha a visualização rápida, se estiver aberta (a barra de espaço de novo, no Explorador). */
export function fecharVisualizacaoRapida() {
  if (!aberta) return false;
  aberta.j.fechar();
  return true;
}
