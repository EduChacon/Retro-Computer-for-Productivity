/* A moldura é do Retro; só o processo principal conhece a janela nativa escolhida. */
import { h } from '../util.js';
import { Janela, janelaAtiva, daAreaAtual, comPrograma } from '../janelas.js';
import { nomeNativo, abrirNativo, configurarWeb } from '../nativos.js';
import { tr } from '../idioma.js';

const abertas = new Map();
const icones = {
  focar: '<path d="M2.5 6.5v-4h4m3 0h4v4m0 3v4h-4m-3 0h-4v-4"/>',
  minimizar: '<path d="M3 11.5h10"/>',
  fechar: '<path d="m4 4 8 8m0-8-8 8"/>',
  sair: '<path d="M6.5 3.5h-3v9h9v-3m-4-6h4v4m0-4-7 7"/>',
  organizar: '<path d="M1.5 3.5h5v9h-5zm8 0h5v9h-5z"/>',
};
class Integracao {
  constructor(id) {
    this.id = id; this.sessao = null; this.ocupada = false; this.movendo = false;
    this.j = comPrograma('nativo:' + id, () => new Janela({ titulo: nomeNativo(id), icone: 'programa', largura: 780, altura: 540, minLargura: 420, minAltura: 260, classe: 'integracao-nativa', aoFechar: () => this.soltar() }));
    this.j.corpo.classList.add('int-corpo');
    this.j.ev.on('fechada', () => { abertas.delete(id); clearInterval(this.relogio); this.observar.disconnect(); this.soltar().catch(() => {}); });
    this.observar = new MutationObserver(() => this.posicionar());
    this.observar.observe(document.body, { subtree: true, attributes: true, childList: true, attributeFilter: ['class', 'style'] });
    this.relogio = setInterval(() => { this.posicionar(); this.consultar(); }, 250);
    this.iniciar();
  }
  aviso(texto) { this.mensagem.textContent = texto; }
  botao(texto, fn) { return h('button', { type: 'button', on: { click: () => this.executar(fn) } }, texto); }
  controle(texto, icone, fn) {
    const mostrar = () => { this.dica.textContent = texto; }, limpar = () => { this.dica.textContent = ''; };
    return h('button.int-bt', { type: 'button', 'aria-label': texto, on: { click: () => this.executar(fn), pointerenter: mostrar, pointerleave: limpar, focus: mostrar, blur: limpar } },
      h('span', { 'aria-hidden': 'true', html: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1">${icones[icone]}</svg>` }));
  }
  async executar(fn) {
    if (this.ocupada || this.j.fechada) return;
    this.ocupada = true;
    try { await fn(); } catch (e) { if (!this.j.fechada) { this.aviso(String(e.message).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')); if (this.sessao && !this.sessao.escolhida && this.tentativa) this.alternativas(); } }
    finally { this.ocupada = false; }
  }
  async iniciar() {
    if (this.iniciando || this.j.fechada) return;
    this.iniciando = true;
    this.mensagem = h('div.int-mensagem', { role: 'status' }, tr('Preparando a integração…'));
    this.barra = h('div.int-acoes');
    this.alvo = h('div.int-alvo', h('p', tr('Escolha uma janela para integrar.')));
    this.j.corpo.replaceChildren(this.mensagem, this.barra, this.alvo);
    try {
      const info = await retro.integracao.info(); if (this.j.fechada) return;
      this.modo = info.modo;
      if (info.modo === 'acompanhada') {
        const a = document.getElementById('janelas').getBoundingClientRect();
        this.j.ret.w = Math.min(540, a.width - 8); this.j.ret.h = Math.min(320, a.height - 8);
        this.j.ret.x = Math.max(0, Math.min(this.j.ret.x, a.width - this.j.ret.w - 8)); this.j.aplicarRet();
      }
      if (!info.disponivel) throw new Error(tr('A integração de programas está disponível no Windows e no Mac.'));
      if (!info.permitido) {
        this.aviso(tr('O Mac precisa da sua permissão de Acessibilidade para controlar janelas. A moldura do aplicativo continua sendo a do macOS.'));
        this.barra.append(this.botao(tr('Permitir controle de janelas…'), async () => { await retro.integracao.permitir(); this.aviso(tr('Permita o controle de janelas em Ajustes do Sistema › Privacidade e Segurança › Acessibilidade e tente novamente.')); }), this.botao(tr('Tentar novamente'), () => this.iniciar()));
        this.alternativas(); return;
      }
      this.aviso(tr('Aguardando a janela do programa… A primeira abertura pode levar até 30 segundos.'));
      const s = await retro.integracao.abrir(this.id);
      if (this.j.fechada) { await retro.integracao.soltar(s.id); return; }
      this.sessao = s; this.j.el.dataset.modo = s.modo;
      this.aviso(s.modo === 'embutida' ? '' : tr('No Mac, esta janela controla o programa no computador. A janela original mantém sua moldura e pode ser organizada ao lado do Retro.'));
      this.alvo.replaceChildren();
      if (s.janelas.length === 1) await this.associar(s.janelas[0].id);
      else {
        this.alvo.append(h('p', tr('O programa tem mais de uma janela. Escolha qual deseja integrar:')));
        for (const j of s.janelas) this.alvo.append(this.botao(j.titulo || nomeNativo(this.id), () => this.associar(j.id)));
      }
    } catch (e) { if (!this.j.fechada) { this.aviso(String(e.message).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')); this.alternativas(); this.barra.append(this.botao(tr('Tentar novamente'), () => this.iniciar())); } }
    finally { this.iniciando = false; }
  }
  alternativas() {
    this.alvo.replaceChildren(h('p', tr('Você pode abrir normalmente ou associar uma versão web para usar uma janela interna completa.')),
      this.sessao?.janelas.length ? this.botao(tr('Mostrar janela original'), async () => {
        const alvo = this.tentativa || this.sessao.janelas[0].id;
        await retro.integracao.original(this.sessao.id, alvo); await this.j.fechar();
      }) : this.botao(tr('Abrir no computador'), async () => { await abrirNativo(this.id, { modo: 'externo' }); await this.j.fechar(); }),
      this.botao(tr('Associar versão web…'), () => this.usarWeb()));
  }
  async usarWeb() { if (await configurarWeb(this.id)) { await this.j.fechar(); await abrirNativo(this.id, { modo: 'integrado' }); } }
  medida() {
    const r = this.alvo.getBoundingClientRect(), w = innerWidth, h = innerHeight;
    const x = Math.max(0, r.left), y = Math.max(0, r.top), largura = Math.min(w, r.right) - x, altura = Math.min(h, r.bottom) - y;
    const visivel = document.visibilityState === 'visible' && janelaAtiva() === this.j && daAreaAtual(this.j) && !this.j.minimizada && !this.j.recolhida && !document.querySelector('.menu, .bloqueio, #bloqueio, #protecao, #visao-tarefas') && !document.body.classList.contains('bloqueado');
    return { ret: { x, y, w: Math.max(1, largura), h: Math.max(1, altura) }, viewport: { w, h }, visivel: !!visivel && largura > 0 && altura > 0 };
  }
  async associar(id) {
    this.tentativa = id;
    const s = await retro.integracao.associar(this.sessao.id, id, this.medida());
    this.sessao = s; if (this.j.fechada) return;
    this.j.el.dataset.associada = 'true';
    const embutida = s.modo === 'embutida';
    this.dica = h('span.int-dica', { 'aria-hidden': 'true' });
    this.barra.replaceChildren(this.controle(embutida ? tr('Focar') : tr('Focar programa'), 'focar', () => retro.integracao.acao(s.id, 'focar')),
      this.controle(embutida ? tr('Minimizar') : tr('Minimizar programa'), 'minimizar', async () => { if (this.modo === 'embutida') this.j.minimizar(); else await retro.integracao.acao(s.id, 'minimizar'); }),
      this.controle(embutida ? tr('Fechar') : tr('Fechar programa…'), 'fechar', async () => { await retro.integracao.acao(s.id, 'fechar'); if (s.modo === 'embutida') await this.j.fechar(); }),
      this.controle(embutida ? tr('Sair') : tr('Sair da integração'), 'sair', () => this.j.fechar()));
    if (s.modo === 'acompanhada') {
      this.barra.append(this.controle(tr('Organizar lado a lado'), 'organizar', () => retro.integracao.acao(s.id, 'organizar')));
      this.alvo.replaceChildren(h('p', tr('Use os controles acima para trabalhar com a janela original. Fechar esta janela do Retro mantém o programa aberto.')),
        this.botao(tr('Usar versão web no Retro…'), () => this.usarWeb()));
    } else { this.alvo.replaceChildren(); this.aviso(''); }
    this.barra.append(this.dica);
    await this.posicionar();
  }
  async posicionar() {
    if (this.movendo || this.j.fechada || !this.sessao?.escolhida || this.modo !== 'embutida') return;
    this.movendo = true;
    try { const o = this.medida(), chave = JSON.stringify(o); if (chave !== this.ultimaGeometria && o.ret.x + o.ret.w <= innerWidth + 1 && o.ret.y + o.ret.h <= innerHeight + 1) { await retro.integracao.atualizar(this.sessao.id, o); this.ultimaGeometria = chave; } }
    catch { } finally { this.movendo = false; }
  }
  async consultar() {
    if (this.consultando || !this.sessao?.escolhida || this.j.fechada) return;
    this.consultando = true;
    try { const s = await retro.integracao.estado(this.sessao.id); if (!s.aberta) await this.j.fechar(); }
    catch (e) { if (!this.j.fechada) this.aviso(String(e.message).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')); }
    finally { this.consultando = false; }
  }
  async soltar() {
    if (!this.sessao) return true;
    try { await retro.integracao.soltar(this.sessao.id); this.sessao = null; return true; }
    catch (e) { if (!this.j.fechada) this.aviso(String(e.message).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')); return false; }
  }
}
export function abrirIntegrado(id) {
  const atual = abertas.get(id); if (atual && !atual.j.fechada) { atual.j.focar(); return atual; }
  const nova = new Integracao(id); abertas.set(id, nova); return nova;
}
