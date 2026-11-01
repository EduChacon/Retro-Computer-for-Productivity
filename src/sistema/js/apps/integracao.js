/* A moldura é do Retro; só o processo principal conhece a janela nativa escolhida. */
import { h } from '../util.js';
import { Janela, janelaAtiva, daAreaAtual, comPrograma } from '../janelas.js';
import { nomeNativo, abrirNativo, configurarWeb } from '../nativos.js';
import { tr } from '../idioma.js';

const abertas = new Map();
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
  async executar(fn) {
    if (this.ocupada || this.j.fechada) return;
    this.ocupada = true;
    try { await fn(); } catch (e) { if (!this.j.fechada) this.aviso(String(e.message).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')); }
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
      const s = await retro.integracao.abrir(this.id);
      if (this.j.fechada) { await retro.integracao.soltar(s.id); return; }
      this.sessao = s; this.j.el.dataset.modo = s.modo;
      this.aviso(s.modo === 'embutida' ? tr('Integração experimental do Windows. A moldura é do Retro; o conteúdo continua sendo do programa.') : tr('No Mac, esta janela controla o programa no computador. A janela original mantém sua moldura e pode ser organizada ao lado do Retro.'));
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
      this.botao(tr('Abrir no computador'), async () => { await abrirNativo(this.id, { modo: 'externo' }); await this.j.fechar(); }),
      this.botao(tr('Associar versão web…'), async () => { if (await configurarWeb(this.id)) { await this.j.fechar(); await abrirNativo(this.id, { modo: 'integrado' }); } }));
  }
  medida() {
    const r = this.alvo.getBoundingClientRect(), w = innerWidth, h = innerHeight;
    const x = Math.max(0, r.left), y = Math.max(0, r.top), largura = Math.min(w, r.right) - x, altura = Math.min(h, r.bottom) - y;
    const visivel = document.visibilityState === 'visible' && janelaAtiva() === this.j && daAreaAtual(this.j) && !this.j.minimizada && !this.j.recolhida && !document.body.classList.contains('arrastando') && !document.querySelector('.menu, .bloqueio, #bloqueio, #protecao, #visao-tarefas') && !document.body.classList.contains('bloqueado');
    return { ret: { x, y, w: Math.max(1, largura), h: Math.max(1, altura) }, viewport: { w, h }, visivel: !!visivel && largura > 0 && altura > 0 };
  }
  async associar(id) {
    const s = await retro.integracao.associar(this.sessao.id, id, this.medida());
    this.sessao = s; if (this.j.fechada) return;
    this.j.el.dataset.associada = 'true';
    this.barra.replaceChildren(this.botao(tr('Focar programa'), () => retro.integracao.acao(s.id, 'focar')),
      this.botao(tr('Minimizar programa'), async () => { if (this.modo === 'embutida') this.j.minimizar(); else await retro.integracao.acao(s.id, 'minimizar'); }),
      this.botao(tr('Fechar programa…'), () => retro.integracao.acao(s.id, 'fechar')),
      this.botao(tr('Sair da integração'), () => this.j.fechar()));
    if (s.modo === 'acompanhada') {
      this.barra.append(this.botao(tr('Organizar lado a lado'), () => retro.integracao.acao(s.id, 'organizar')));
      this.alvo.replaceChildren(h('p', tr('Use os controles acima para trabalhar com a janela original. Fechar esta janela do Retro mantém o programa aberto.')));
    } else this.alvo.replaceChildren(h('p', tr('O programa aparece nesta área quando esta janela está ativa. Fechar a integração devolve a janela ao computador.')));
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
