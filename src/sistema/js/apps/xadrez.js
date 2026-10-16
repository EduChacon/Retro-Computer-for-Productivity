/*
 * O Xadrez: contra o computador (três níveis, ele pensa num Worker) ou entre duas pessoas no
 * mesmo computador. As regras inteiras (o roque, o en passant, a promoção com a escolha da
 * peça, o xeque-mate, o afogamento e os empates) ficam em jogos/xadrez.js; as peças são
 * desenhadas na hora pelo próprio projeto (jogos/pecas.js).
 */
import { h } from '../util.js';
import { Janela } from '../janelas.js';
import { registrarApp } from '../sistema.js';
import { ajustarAoConteudo } from '../dialogos.js';
import { tr } from '../idioma.js';
import { Xadrez, PEAO, CAVALO, BISPO, TORRE, DAMA } from '../jogos/xadrez.js';
import { pecaXadrez } from '../jogos/pecas.js';
import { JanelaTabuleiro } from '../jogos/janela.js';

const VALOR = { [PEAO]: 1, [CAVALO]: 3, [BISPO]: 3, [TORRE]: 5, [DAMA]: 9 };

/** As letras das peças na notação (o rei, a dama, a torre, o bispo e o cavalo). */
const letras = () => {
  const l = tr('RDTBC');
  return l.length === 5 ? l : 'KQRBN';
};

class JogoXadrez extends JanelaTabuleiro {
  constructor() {
    super({
      id: 'xadrez', titulo: tr('Xadrez'), icone: 'xadrez', chave: 'xadrez',
      tabuleiro: { casa: 40, claro: '#e8d2a6', escuro: '#a8744a', veio: true },
      comoJogar: () => tr('Leve o rei do adversário ao xeque-mate: atacado e sem ter para onde fugir.\n\nClique numa peça e depois na casa de destino (ou arraste a peça). Os pontos mostram os lances possíveis; o último lance fica marcado em amarelo, e o rei em xeque, em vermelho. As setas e o Enter também jogam.\n\nPara o roque, leve o rei duas casas para o lado da torre. O peão que chega à última fileira vira a peça que você escolher.\n\nA partida empata no afogamento (quem tem a vez não está em xeque e não tem lance), com a mesma posição três vezes, com 50 lances sem captura nem lance de peão e quando não sobra material para o mate.\n\nJogo › Desfazer (Ctrl+Z) volta o seu último lance. A partida fica guardada: fechar a janela não a perde.'),
      aoFechar: () => { aberto = null; },
    });
    this.comecar();
  }

  criar() { this.x = new Xadrez(); }

  restaurar(p) {
    const x = new Xadrez(p.fen || undefined);
    for (const u of p.lances || []) {
      const m = x.deUci(u);
      if (!m) return false;
      x.jogar(m, letras());
    }
    this.x = x;
    return true;
  }

  partida() { return { fen: this.x.fenInicial, lances: this.x.feitos.map((f) => Xadrez.uci(f.m)) }; }
  lancesFeitos() { return this.x.feitos.length; }
  vez() { return this.x.vez; }
  primeiro() { return new Xadrez(this.x.fenInicial).vez; }
  voltar() { this.x.voltar(); }
  situacao() { return this.x.situacao(); }
  notacao() { return this.x.feitos.map((f) => f.san); }
  peca(c) { return this.x.t[c] ? pecaXadrez(this.x.t[c], 32) : null; }

  podeArrastar(c) {
    const p = this.x.t[c];
    return !!p && Math.sign(p) === this.x.vez;
  }

  alvosDe(c) {
    return c < 0 ? [] : this.situacaoAtual().legais.filter((m) => m.de === c);
  }

  situacaoAtual() {
    const chave = this.x.chaves[this.x.chaves.length - 1] + ':' + this.x.feitos.length;
    if (!this.cacheSit || this.cacheSit.chave !== chave) this.cacheSit = { chave, s: this.x.situacao() };
    return this.cacheSit.s;
  }

  marcar(s) {
    const ult = this.x.feitos[this.x.feitos.length - 1];
    const mostrar = this.cfg().mostrar !== false;
    this.tab.marcas = {
      ultimo: ult ? [ult.m.de, ult.m.para] : [],
      escolhida: this.escolhida,
      alvos: mostrar && this.escolhida >= 0 ? [...new Set(this.alvosDe(this.escolhida).map((m) => m.para))] : [],
      xeque: s.xeque ? this.x.rei[this.x.vez === 1 ? 0 : 1] : -1,
    };
  }

  tocarCasa(c) {
    if (!this.humanoJoga()) return;
    if (c >= 0 && this.escolhida >= 0 && this.alvosDe(this.escolhida).some((m) => m.para === c)) { this.jogarDe(this.escolhida, c); return; }
    this.escolhida = c >= 0 && this.podeArrastar(c) ? c : -1;
    this.marcar(this.situacaoAtual());
  }

  soltarPeca(de, para) {
    if (this.alvosDe(de).some((m) => m.para === para)) this.jogarDe(de, para);
  }

  async jogarDe(de, para) {
    const opcoes = this.alvosDe(de).filter((m) => m.para === para);
    if (!opcoes.length) return;
    let m = opcoes[0];
    if (opcoes.length > 1) {
      // A promoção: o peão vira a peça escolhida (a dama, se a caixa for fechada).
      this.escolhida = -1;
      this.marcar(this.situacaoAtual());
      this.tab.desenhar();
      const promo = await escolherPromocao(this.x.vez);
      m = opcoes.find((x) => x.promo === (promo || DAMA));
    }
    this.aplicar(m);
  }

  aplicar(m) {
    const feito = this.x.jogar(m, letras());
    if (feito) this.depoisDoLance(feito, !!feito.cap);
  }

  dadosParaPensar(nivel) {
    return { jogo: 'xadrez', nivel, fen: this.x.fenInicial, lances: this.x.feitos.map((f) => Xadrez.uci(f.m)) };
  }

  jogarComputador(r) {
    const m = r.uci && this.x.deUci(r.uci);
    if (!m) return false;
    this.aplicar(m);
    return true;
  }

  textoVez(s) {
    const voce = this.contraComputador;
    const brancas = this.x.vez === 1;
    if (s.xeque) {
      if (voce) return brancas ? tr('Xeque! Sua vez, com as brancas.') : tr('Xeque! Sua vez, com as pretas.');
      return brancas ? tr('Xeque! Vez das brancas.') : tr('Xeque! Vez das pretas.');
    }
    if (voce) return brancas ? tr('Sua vez, com as brancas.') : tr('Sua vez, com as pretas.');
    return brancas ? tr('Vez das brancas.') : tr('Vez das pretas.');
  }

  textoFim(s) {
    if (s.fim === 'mate') {
      if (this.contraComputador) return s.vencedor === this.corHumano ? tr('Xeque-mate! Você venceu.') : tr('Xeque-mate! O computador venceu.');
      return s.vencedor === 1 ? tr('Xeque-mate! As brancas venceram.') : tr('Xeque-mate! As pretas venceram.');
    }
    return {
      afogamento: tr('Empate por afogamento: quem tem a vez não tem lance.'),
      cinquenta: tr('Empate: 50 lances sem captura nem lance de peão.'),
      repeticao: tr('Empate: a mesma posição três vezes.'),
      material: tr('Empate: não sobrou material para o xeque-mate.'),
    }[s.fim] || '';
  }

  /** Embaixo do nome, as peças que este lado já tomou (e a vantagem em material). */
  extraJogador(cor) {
    const tomadas = this.x.feitos.filter((f) => f.m.cap && Math.sign(f.m.peca) === cor).map((f) => Math.abs(f.m.cap));
    tomadas.sort((a, b) => VALOR[b] - VALOR[a] || b - a);
    const soma = (lado) => this.x.feitos.filter((f) => f.m.cap && Math.sign(f.m.peca) === lado).reduce((s, f) => s + VALOR[Math.abs(f.m.cap)], 0)
      + this.x.feitos.filter((f) => f.m.promo && Math.sign(f.m.peca) === lado).reduce((s, f) => s + VALOR[f.m.promo] - 1, 0);
    const vantagem = soma(cor) - soma(-cor);
    return h('div.tab-tomadas', ...tomadas.map((p) => imagem(pecaXadrez(-cor * p, 16))), vantagem > 0 ? h('span.tab-vantagem', '+' + vantagem) : null);
  }
}

function imagem(canvas) {
  return h('img', { src: canvas.toDataURL(), width: canvas.width, height: canvas.height, alt: '', draggable: 'false' });
}

/** A caixa da promoção: as quatro peças, com a dama já escolhida. */
function escolherPromocao(cor) {
  return new Promise((resolve) => {
    let feito = false;
    const j = new Janela({ titulo: tr('Promoção do peão'), dialogo: true, largura: 260, altura: 120, aoFechar: () => { if (!feito) { feito = true; resolve(null); } } });
    const fim = (p) => { if (feito) return; feito = true; j.fechar(true); resolve(p); };
    const nomes = { [DAMA]: tr('Dama'), [TORRE]: tr('Torre'), [BISPO]: tr('Bispo'), [CAVALO]: tr('Cavalo') };
    const botoes = [DAMA, TORRE, BISPO, CAVALO].map((p) => h('button.xz-promo', { title: nomes[p], on: { click: () => fim(p) } }, imagem(pecaXadrez(cor * p, 32)), h('span', nomes[p])));
    j.corpo.append(h('div', { style: { marginBottom: '8px' } }, tr('O peão chegou à última fileira. Escolha a peça:')), h('div.xz-promocoes', ...botoes));
    ajustarAoConteudo(j);
    botoes[0].focus();
  });
}

let aberto = null;

registrarApp('xadrez', {
  nome: 'Xadrez', icone: 'xadrez',
  abrir: () => {
    if (aberto && !aberto.j.fechada) { aberto.j.focar(); return aberto; }
    aberto = new JogoXadrez();
    return aberto;
  },
});
