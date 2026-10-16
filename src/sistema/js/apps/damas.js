/*
 * As Damas: contra o computador (três níveis) ou entre duas pessoas. As regras brasileiras são
 * o padrão (a pedra toma para trás, a dama anda e toma de longe, e tomar o maior número de
 * peças é obrigatório); as inglesas (as "checkers") ficam em Jogo › Regras. As regras ficam em
 * jogos/damas.js; as pedras são desenhadas na hora (jogos/pecas.js).
 */
import { h } from '../util.js';
import { registrarApp } from '../sistema.js';
import { tr } from '../idioma.js';
import { Damas, REGRAS } from '../jogos/damas.js';
import { pecaDamas } from '../jogos/pecas.js';
import { JanelaTabuleiro } from '../jogos/janela.js';

const nomeCasa = (c) => 'abcdefgh'[c & 7] + (8 - (c >> 3));
// Na notação das "checkers", as casas escuras são numeradas de 1 a 32, de cima (as pretas) para baixo.
const numeroCasa = (c) => (c >> 3) * 4 + ((c & 7) >> 1) + 1;

class JogoDamas extends JanelaTabuleiro {
  constructor() {
    super({
      id: 'damas', titulo: tr('Damas'), icone: 'damas', chave: 'damas',
      tabuleiro: { casa: 40, claro: '#eadfc2', escuro: '#4d7a46', veio: false },
      comoJogar: () => (this.regra === 'inglesas'
        ? tr('Tome todas as peças do adversário ou deixe-o sem lances.\n\nAs regras inglesas (as "checkers"): as pretas começam; a pedra anda e toma só para a frente, na diagonal, uma casa por vez. Tomar é obrigatório, e a pedra que toma continua tomando enquanto puder. A pedra que chega à última fileira vira dama (e o lance acaba ali); a dama anda e toma uma casa, para a frente e para trás.\n\nClique na pedra e depois na casa de destino (ou arraste); numa tomada com mais de um caminho, clique nas casas uma a uma. A partida empata com 40 lances seguidos só de damas, sem tomar, ou com a mesma posição três vezes.')
        : tr('Tome todas as peças do adversário ou deixe-o sem lances.\n\nAs regras brasileiras: as brancas começam; a pedra anda uma casa para a frente, na diagonal, e toma para a frente e para trás. Tomar é obrigatório, e é obrigatório tomar o maior número de peças (as que devem tomar ficam marcadas). A pedra que termina o lance na última fileira vira dama; a dama anda quantas casas quiser na diagonal e toma de longe.\n\nClique na pedra e depois na casa de destino (ou arraste); numa tomada com mais de um caminho, clique nas casas uma a uma. A partida empata com 20 lances seguidos só de damas, sem tomar, ou com a mesma posição três vezes.')),
      menuExtra: () => [
        { separador: true },
        {
          rotulo: tr('R&egras'), sub: () => [
            { rotulo: tr('&Brasileiras'), radio: true, marcado: this.regra === 'brasileiras', acao: () => this.mudar({ regra: 'brasileiras' }) },
            { rotulo: tr('&Inglesas ("checkers")'), radio: true, marcado: this.regra === 'inglesas', acao: () => this.mudar({ regra: 'inglesas' }) },
          ],
        },
      ],
      aoFechar: () => { aberto = null; },
    });
    this.parcial = [];
    this.comecar();
  }

  get regra() { return REGRAS[this.cfg().regra] ? this.cfg().regra : 'brasileiras'; }
  valorAtual(k) { return k === 'regra' ? this.regra : super.valorAtual(k); }

  criar() {
    this.d = new Damas(this.regra);
    this.parcial = [];
  }

  restaurar(p) {
    if ((p.regra || 'brasileiras') !== this.regra) return false;
    const d = new Damas(this.regra);
    for (const m of p.lances || []) if (!d.jogar(m)) return false;
    this.d = d;
    return true;
  }

  partida() { return { regra: this.regra, lances: this.d.feitos.map((f) => ({ de: f.m.de, caminho: f.m.caminho })) }; }
  lancesFeitos() { return this.d.feitos.length; }
  vez() { return this.d.vez; }
  primeiro() { return this.d.r.comeca; }
  voltar() { this.d.voltar(); this.parcial = []; }
  peca(c) { return this.d.t[c] ? pecaDamas(this.d.t[c], 36) : null; }

  situacao() {
    const chave = this.d.chaves[this.d.chaves.length - 1] + ':' + this.d.feitos.length;
    if (!this.cacheSit || this.cacheSit.chave !== chave) this.cacheSit = { chave, s: this.d.situacao() };
    return this.cacheSit.s;
  }

  notacao() {
    const ingles = this.regra === 'inglesas';
    const nome = ingles ? numeroCasa : nomeCasa;
    return this.d.feitos.map(({ m }) => nome(m.de) + (m.tomadas.length ? 'x' : '-') + m.caminho.map(nome).join('x'));
  }

  /** Os lances da pedra escolhida que começam pelo caminho já clicado. */
  candidatos() {
    if (this.escolhida < 0) return [];
    return this.situacao().legais.filter((m) => m.de === this.escolhida && this.parcial.every((c, i) => m.caminho[i] === c));
  }

  podeArrastar(c) {
    return this.situacao().legais.some((m) => m.de === c);
  }

  marcar(s) {
    const ult = this.d.feitos[this.d.feitos.length - 1];
    const mostrar = this.cfg().mostrar !== false;
    const cands = this.candidatos();
    const humano = this.humanoJoga();
    // As pedras que podem (e devem) tomar ficam marcadas quando tomar é obrigatório.
    const tomar = humano && mostrar && s.legais.length && s.legais[0].tomadas.length ? [...new Set(s.legais.map((m) => m.de))] : [];
    this.tab.marcas = {
      ultimo: ult ? [ult.m.de, ...ult.m.caminho] : [],
      escolhida: this.escolhida,
      alvos: mostrar ? [...new Set(cands.map((m) => m.caminho[this.parcial.length]).filter((c) => c != null))] : [],
      caminho: this.parcial,
      obrigatorias: this.escolhida >= 0 ? [] : tomar,
    };
  }

  tocarCasa(c) {
    if (!this.humanoJoga()) return;
    if (c >= 0 && this.escolhida >= 0) {
      const cands = this.candidatos();
      // A casa final de um só lance (pulando as do meio) já joga.
      const pelaFinal = cands.filter((m) => m.caminho[m.caminho.length - 1] === c);
      if (pelaFinal.length && pelaFinal.every((m) => m.caminho.join() === pelaFinal[0].caminho.join())) { this.aplicar(pelaFinal[0]); return; }
      if (cands.some((m) => m.caminho[this.parcial.length] === c)) {
        this.parcial.push(c);
        const resta = this.candidatos();
        if (resta.length === 1 && resta[0].caminho.length === this.parcial.length) { this.aplicar(resta[0]); return; }
        this.marcar(this.situacao());
        return;
      }
    }
    this.parcial = [];
    const legais = this.situacao().legais;
    if (c >= 0 && legais.some((m) => m.de === c)) this.escolhida = c;
    else {
      this.escolhida = -1;
      // A pedra da vez que não pode andar porque outra precisa tomar: o aviso na barra.
      if (c >= 0 && this.d.t[c] && Math.sign(this.d.t[c]) === this.d.vez && legais.length && legais[0].tomadas.length) {
        this.j.definirStatus([this.regra === 'brasileiras' ? tr('Tomar é obrigatório (e com o maior número de peças).') : tr('Tomar é obrigatório.'), this.ladoStatus()]);
      }
    }
    this.marcar(this.situacao());
  }

  soltarPeca(de, para) {
    if (this.escolhida !== de) { this.escolhida = de; this.parcial = []; }
    this.tocarCasa(para);
    this.tab.desenhar();
  }

  aplicar(m) {
    const feito = this.d.jogar(m);
    this.parcial = [];
    if (feito) this.depoisDoLance(feito, feito.tomadas.length > 0);
  }

  dadosParaPensar(nivel) {
    return { jogo: 'damas', nivel, regra: this.regra, t: Array.from(this.d.t), vez: this.d.vez, semTomar: this.d.semTomar, chaves: this.d.chaves };
  }

  jogarComputador(r) {
    const m = r.lance && this.situacao().legais.find((x) => x.de === r.lance.de && x.caminho.join() === r.lance.caminho.join());
    if (!m) return false;
    this.aplicar(m);
    return true;
  }

  textoVez() {
    const brancas = this.d.vez === 1;
    if (this.contraComputador) return brancas ? tr('Sua vez, com as brancas.') : tr('Sua vez, com as pretas.');
    return brancas ? tr('Vez das brancas.') : tr('Vez das pretas.');
  }

  textoFim(s) {
    if (s.fim === 'sem-progresso') return tr('Empate: {n} lances seguidos só com damas, sem tomar.', { n: this.d.r.semProgresso / 2 });
    if (s.fim === 'repeticao') return tr('Empate: a mesma posição três vezes.');
    if (this.contraComputador) return s.vencedor === this.corHumano ? tr('Você venceu!') : tr('O computador venceu.');
    return s.vencedor === 1 ? tr('As brancas venceram.') : tr('As pretas venceram.');
  }

  /** Embaixo do nome, as pedras e as damas que este lado ainda tem. */
  extraJogador(cor) {
    const n = this.d.contar();
    const icone = (p) => { const c = pecaDamas(p, 16); return h('img', { src: c.toDataURL(), width: 16, height: 16, alt: '', draggable: 'false' }); };
    return h('div.tab-tomadas', icone(cor), h('span', '× ' + n[cor]), icone(2 * cor), h('span', '× ' + n[2 * cor]));
  }
}

let aberto = null;

registrarApp('damas', {
  nome: 'Damas', icone: 'damas',
  abrir: () => {
    if (aberto && !aberto.j.fechada) { aberto.j.focar(); return aberto; }
    aberto = new JogoDamas();
    return aberto;
  },
});
