/*
 * O que a janela das damas e a do xadrez têm em comum: o tabuleiro com o painel ao lado (quem
 * joga com cada cor e os lances da partida), o menu Jogo (partida nova, desfazer, contra o
 * computador ou entre duas pessoas, o nível, a cor, girar o tabuleiro), a vez do computador
 * (pensando num Worker) e a partida guardada nas configurações: fechar a janela no meio não
 * perde nada, e ela continua ao abrir de novo.
 */
import { h } from '../util.js';
import { Janela } from '../janelas.js';
import { estado, definirConfig } from '../sistema.js';
import { info, confirmar, ajustarAoConteudo } from '../dialogos.js';
import { tocar } from '../sons.js';
import { tr, marcar } from '../idioma.js';
import { Computador } from './computador.js';
import { Tabuleiro } from './tabuleiro.js';

export const NIVEIS_JOGO = { facil: marcar('&Fácil'), medio: marcar('&Médio'), dificil: marcar('&Difícil') };
const NOME_NIVEL = { facil: marcar('fácil'), medio: marcar('médio'), dificil: marcar('difícil') };

export class JanelaTabuleiro {
  /**
   * @param {object} o
   * @param {string} o.id  o.titulo  o.icone
   * @param {string} o.chave  onde as configurações ficam (config.jogos[chave])
   * @param {object} o.tabuleiro  as cores e o tamanho das casas (veja Tabuleiro)
   * @param {string} o.comoJogar  o texto da Ajuda › Como jogar
   * @param {()=>Array} [o.menuExtra]  itens a mais no menu Jogo (as regras das damas)
   */
  constructor(o) {
    this.o = o;
    this.ia = new Computador();
    this.escolhida = -1;
    this.j = new Janela({
      id: o.id, titulo: o.titulo, icone: o.icone, redimensionavel: false, maximizavel: false, classe: 'jogo-tabuleiro',
      status: ['', ''],
      menus: [
        {
          rotulo: tr('&Jogo'), itens: () => [
            { rotulo: tr('&Novo'), atalho: 'F2', acao: () => this.novo() },
            { rotulo: tr('&Desfazer'), atalho: 'Ctrl+Z', desativado: !this.podeDesfazer(), acao: () => this.desfazer() },
            { separador: true },
            { rotulo: tr('Contra o &computador'), radio: true, marcado: this.contraComputador, acao: () => this.mudar({ oponente: 'computador' }) },
            { rotulo: tr('Dois &jogadores'), radio: true, marcado: !this.contraComputador, acao: () => this.mudar({ oponente: 'pessoas' }) },
            {
              rotulo: tr('Ní&vel'), desativado: !this.contraComputador, sub: () => Object.entries(NIVEIS_JOGO).map(([k, n]) => ({
                rotulo: tr(n), radio: true, marcado: this.nivel === k, acao: async () => { await this.salvar({ nivel: k }); this.atualizar(); },
              })),
            },
            { rotulo: tr('Jogar com as &brancas'), radio: true, marcado: this.corHumano === 1, desativado: !this.contraComputador, acao: () => this.mudar({ cor: 1 }) },
            { rotulo: tr('Jogar com as &pretas'), radio: true, marcado: this.corHumano === -1, desativado: !this.contraComputador, acao: () => this.mudar({ cor: -1 }) },
            { separador: true },
            { rotulo: tr('&Girar o tabuleiro'), marcado: !!this.cfg().girar, acao: async () => { await this.salvar({ girar: !this.cfg().girar }); this.atualizar(); } },
            { rotulo: tr('Mostrar os &lances possíveis'), marcado: this.cfg().mostrar !== false, acao: async () => { await this.salvar({ mostrar: this.cfg().mostrar === false }); this.atualizar(); } },
            ...(o.menuExtra ? o.menuExtra() : []),
            { separador: true },
            { rotulo: tr('Sai&r'), acao: () => this.j.fechar() },
          ],
        },
        {
          rotulo: tr('A&juda'), itens: [
            { rotulo: tr('&Como jogar'), acao: () => info(o.comoJogar(), o.titulo) },
          ],
        },
      ],
    });
    this.tab = new Tabuleiro({
      ...o.tabuleiro,
      peca: (c) => this.peca(c),
      aoTocar: (c) => this.tocarCasa(c),
      podeArrastar: (c) => this.humanoJoga() && this.podeArrastar(c),
      aoSoltar: (de, para) => { if (this.humanoJoga()) this.soltarPeca(de, para); },
    });
    this.aviso = h('div.tab-aviso', { hidden: true, on: { click: () => { this.aviso.hidden = true; } } });
    this.tab.el.querySelector('.tab-borda').append(this.aviso);
    this.jogadores = { 1: this.blocoJogador(1), [-1]: this.blocoJogador(-1) };
    this.lista = h('div.campo.tab-lances', { tabIndex: -1 });
    this.painel = h('div.tab-painel');
    this.j.corpo.append(h('div.tab-jogo', this.tab.el, this.painel));
    this.j.el.addEventListener('keydown', (e) => {
      if (e.key === 'F2') { e.preventDefault(); this.novo(); } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); this.desfazer(); }
    });
    this.j.ev.on('ativada', () => setTimeout(() => this.tab.canvas.focus(), 0));
    this.j.ev.on('fechada', () => { this.ia.parar(); o.aoFechar && o.aoFechar(); });
  }

  /** Monta a partida guardada (ou uma nova) e mostra a janela. */
  comecar() {
    const p = this.cfg().partida;
    let ok = false;
    if (p) { try { ok = this.restaurar(p); } catch { ok = false; } }
    if (!ok) this.criar();
    // A partida guardada que já tinha acabado volta com o resultado à vista, sem o som.
    const s = this.situacao();
    if (s.fim) { this.fim = s; this.aviso.textContent = this.textoFim(s); this.aviso.hidden = false; }
    this.atualizar();
    ajustarAoConteudo(this.j);
    this.tab.canvas.focus();
  }

  cfg() { return (estado.config.jogos && estado.config.jogos[this.o.chave]) || {}; }
  salvar(parte) { return definirConfig({ jogos: { [this.o.chave]: parte } }).catch(() => { }); }
  get contraComputador() { return this.cfg().oponente !== 'pessoas'; }
  get nivel() { return NIVEIS_JOGO[this.cfg().nivel] ? this.cfg().nivel : 'medio'; }
  get corHumano() { return this.cfg().cor === -1 ? -1 : 1; }
  humanoJoga() { return !this.fim && !this.ia.pensando && (!this.contraComputador || this.vez() === this.corHumano); }

  /** Trocar de adversário ou de cor começa outra partida (perguntando, se a de agora já andou). */
  async mudar(parte) {
    const muda = Object.entries(parte).some(([k, v]) => this.valorAtual(k) !== v);
    if (!muda) return;
    if (this.lancesFeitos() > 0 && !this.fim && !await confirmar(tr('Começar uma partida nova?'), { titulo: this.o.titulo })) return;
    await this.salvar(parte);
    this.novo(true);
  }

  valorAtual(k) {
    if (k === 'oponente') return this.contraComputador ? 'computador' : 'pessoas';
    if (k === 'cor') return this.corHumano;
    return this.cfg()[k];
  }

  async novo(semPerguntar = false) {
    if (!semPerguntar && this.lancesFeitos() > 0 && !this.fim && !await confirmar(tr('Começar uma partida nova?'), { titulo: this.o.titulo })) return;
    this.ia.cancelar();
    this.criar();
    this.escolhida = -1;
    this.aviso.hidden = true;
    this.guardar();
    this.atualizar();
  }

  /** Volta o último lance (contra o computador, até a sua vez de novo). */
  desfazer() {
    if (!this.podeDesfazer()) return;
    this.ia.cancelar();
    this.voltar();
    if (this.contraComputador) while (this.lancesFeitos() > 0 && this.vez() !== this.corHumano) this.voltar();
    this.escolhida = -1;
    this.aviso.hidden = true;
    this.guardar();
    this.atualizar();
  }

  podeDesfazer() {
    if (this.lancesFeitos() === 0) return false;
    // Contra o computador, quando ele começa, o primeiro lance dele não se desfaz sozinho.
    return !this.contraComputador || this.lancesFeitos() > (this.primeiro() === this.corHumano ? 0 : 1);
  }

  guardar() { this.salvar({ partida: this.partida() }); }

  /** Depois de cada lance: guarda, redesenha e, se for o caso, passa a vez ao computador. */
  depoisDoLance(m, tomou) {
    tocar(tomou ? 'tomada' : 'peca');
    this.escolhida = -1;
    this.guardar();
    this.atualizar();
  }

  atualizar() {
    const s = this.situacao();
    const eraFim = this.fim;
    this.fim = s.fim ? s : null;
    this.tab.girar((this.contraComputador && this.corHumano === -1) !== !!this.cfg().girar);
    this.marcar(s);
    this.tab.desenhar();
    this.desenharPainel();
    this.j.definirStatus([this.textoStatus(s), this.ladoStatus()]);
    if (this.fim && !eraFim && this.lancesFeitos() > 0) this.anunciarFim(s);
    if (!this.fim && this.contraComputador && this.vez() !== this.corHumano && !this.ia.pensando) this.vezDoComputador();
  }

  /** A parte da direita da barra de status: o adversário. */
  ladoStatus() {
    return { texto: this.contraComputador ? tr('Contra o computador ({nivel})', { nivel: tr(NOME_NIVEL[this.nivel]) }) : tr('Dois jogadores'), largura: 176, fixo: true };
  }

  textoStatus(s) {
    if (s.fim) return this.textoFim(s);
    if (this.ia.pensando) return tr('O computador está pensando…');
    return this.textoVez(s);
  }

  anunciarFim(s) {
    this.aviso.textContent = this.textoFim(s);
    this.aviso.hidden = false;
    if (s.vencedor === 0) tocar('info');
    else if (!this.contraComputador || s.vencedor === this.corHumano) tocar('vitoria');
    else tocar('perdeu');
  }

  async vezDoComputador() {
    const pedido = this.dadosParaPensar(this.nivel);
    const promessa = this.ia.pensar(pedido);
    this.j.definirStatus([tr('O computador está pensando…'), this.ladoStatus()]);
    this.tab.canvas.classList.add('pensando');
    const r = await promessa;
    this.tab.canvas.classList.remove('pensando');
    if (!r || this.j.fechada) return;
    if (r.erro || !this.jogarComputador(r)) { this.atualizar(); return; }
  }

  blocoJogador(cor) {
    const el = h('div.tab-jogador');
    el.dataset.cor = String(cor);
    return el;
  }

  /** O painel: o jogador de cima, os lances e o de baixo (o de baixo é quem está do lado de baixo do tabuleiro). */
  desenharPainel() {
    const baixo = this.tab.girado ? -1 : 1;
    for (const cor of [1, -1]) {
      const el = this.jogadores[cor];
      const nome = cor === 1 ? tr('Brancas') : tr('Pretas');
      const quem = this.contraComputador ? (cor === this.corHumano ? tr('Você') : tr('Computador')) : '';
      el.classList.toggle('vez', !this.fim && this.vez() === cor);
      el.replaceChildren(
        h('div.tab-nome', h('span.tab-marca'), h('b', nome), quem ? h('span', ' — ' + quem) : null),
        this.extraJogador(cor));
    }
    const lances = this.notacao();
    const linhas = [];
    // A numeração segue quem começou: com as pretas antes, o primeiro número só tem o lance delas.
    const desloc = this.primeiro() === 1 ? 0 : 1;
    for (let i = 0; i < lances.length + desloc; i += 2) {
      const a = i - desloc;
      linhas.push(h('span.n', (i / 2 + 1) + '.'),
        h('span' + (a === lances.length - 1 ? '.ultimo' : ''), a >= 0 ? lances[a] : '…'),
        h('span' + (a + 1 === lances.length - 1 ? '.ultimo' : ''), lances[a + 1] || ''));
    }
    this.lista.replaceChildren(...linhas);
    this.lista.scrollTop = this.lista.scrollHeight;
    this.painel.replaceChildren(this.jogadores[-baixo], h('div.tab-rotulo', tr('Lances')), this.lista, this.jogadores[baixo]);
  }
}
