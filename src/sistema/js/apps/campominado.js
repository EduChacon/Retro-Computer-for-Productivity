/*
 * O Campo Minado: abra as casas sem minas. O número diz quantas minas há em
 * volta; o botão direito (ou o toque longo) marca uma bandeira. O primeiro
 * clique nunca acha mina. Os desenhos (a mina, a bandeira, o rosto e os
 * números de sete segmentos) são do próprio projeto.
 */
import { h } from '../util.js';
import { Janela } from '../janelas.js';
import { registrarApp, estado, definirConfig } from '../sistema.js';
import { entrada, info, confirmar, mensagem, ajustarAoConteudo } from '../dialogos.js';
import { tocar } from '../sons.js';
import { tr, marcar } from '../idioma.js';

export const NIVEIS = {
  iniciante: { nome: marcar('Iniciante'), colunas: 9, linhas: 9, minas: 10 },
  intermediario: { nome: marcar('Intermediário'), colunas: 16, linhas: 16, minas: 40 },
  avancado: { nome: marcar('Avançado'), colunas: 30, linhas: 16, minas: 99 },
};

/* ---------- Os desenhos ---------- */

const svg = (w, hh, corpo) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hh}" viewBox="0 0 ${w} ${hh}" shape-rendering="crispEdges">${corpo}</svg>`;

const MINA = svg(15, 15, '<path fill="#000" d="M7 1h1v2H7zM7 12h1v2H7zM1 7h2v1H1zM12 7h2v1h-2zM3 3h1v1H3zM11 3h1v1h-1zM3 11h1v1H3zM11 11h1v1h-1zM5 4h5v1H5zM4 5h7v5H4zM5 10h5v1H5z"/><path fill="#fff" d="M6 6h2v2H6z"/>');
const BANDEIRA = svg(15, 15, '<path fill="#e00000" d="M7 2h1v5H7zM5 3h2v3H5zM4 4h1v1H4z"/><path fill="#000" d="M7 7h1v3H7zM5 10h5v1H5zM3 11h9v2H3z"/>');
const ERRADA = svg(15, 15, '<path fill="#000" d="M7 1h1v2H7zM7 12h1v2H7zM1 7h2v1H1zM12 7h2v1h-2zM5 4h5v1H5zM4 5h7v5H4zM5 10h5v1H5z"/><path fill="#e00000" d="M2 2h2v1h1v1h1v1h3V4h1V3h1V2h2v1h-1v1h-1v1h-1v1H9v3h1v1h1v1h1v1h1v1h-2v-1h-1v-1H9v-1H6v1H5v1H4v1H2v-1h1v-1h1v-1h1V9h1V6H5V5H4V4H3V3H2z"/>');

/** O rosto do botão do meio: normal, surpreso (com o botão apertado), perdeu e ganhou. */
function rosto(tipo) {
  const olhos = {
    normal: '<path fill="#000" d="M8 8h2v2H8zM14 8h2v2h-2z"/>',
    surpreso: '<path fill="#000" d="M8 7h2v3H8zM14 7h2v3h-2z"/>',
    perdeu: '<path fill="#000" d="M7 7h1v1H7zM10 7h1v1h-1zM8 8h2v1H8zM7 9h1v1H7zM10 9h1v1h-1zM13 7h1v1h-1zM16 7h1v1h-1zM14 8h2v1h-2zM13 9h1v1h-1zM16 9h1v1h-1z"/>',
    ganhou: '<path fill="#000" d="M5 7h14v1H5zM6 8h4v2H6zM14 8h4v2h-4zM10 8h1v1h-1zM13 8h1v1h-1z"/>',
  }[tipo];
  const boca = {
    normal: '<path fill="#000" d="M8 14h1v1H8zM15 14h1v1h-1zM9 15h6v1H9z"/>',
    surpreso: '<path fill="#000" d="M10 13h4v1h-4zM9 14h1v2H9zM14 14h1v2h-1zM10 16h4v1h-4z"/>',
    perdeu: '<path fill="#000" d="M9 15h6v1H9zM8 16h1v1H8zM15 16h1v1h-1z"/>',
    ganhou: '<path fill="#000" d="M8 14h1v1H8zM15 14h1v1h-1zM9 15h6v1H9z"/>',
  }[tipo];
  return svg(24, 24, '<path fill="#000" d="M8 2h8v1H8zM6 3h2v1H6zM16 3h2v1h-2zM5 4h1v1H5zM18 4h1v1h-1zM4 5h1v1H4zM19 5h1v1h-1zM3 6h1v2H3zM20 6h1v2h-1zM2 8h1v8H2zM21 8h1v8h-1zM3 16h1v2H3zM20 16h1v2h-1zM4 18h1v1H4zM19 18h1v1h-1zM5 19h1v1H5zM18 19h1v1h-1zM6 20h2v1H6zM16 20h2v1h-2zM8 21h8v1H8z"/>'
    + '<path fill="#ffff00" d="M8 3h8v1h2v1h1v1h1v2h1v8h-1v2h-1v1h-1v1h-2v1H8v-1H6v-1H5v-1H4v-2H3V8h1V6h1V5h1V4h2z"/>' + olhos + boca);
}

// Os números de sete segmentos (o contador de minas e o relógio).
const SEGMENTOS = { a: [2, 1, 9, 2], b: [10, 2, 2, 9], c: [10, 12, 2, 9], d: [2, 20, 9, 2], e: [1, 12, 2, 9], f: [1, 2, 2, 9], g: [2, 10, 9, 2] };
const DIGITOS = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g' };

function painelNumero(n) {
  const v = Math.max(-99, Math.min(999, n));
  const texto = v < 0 ? '-' + String(-v).padStart(2, '0') : String(v).padStart(3, '0');
  let corpo = '<rect width="41" height="25" fill="#000"/>';
  [...texto].forEach((d, i) => {
    for (const [s, [x, y, w, hh]] of Object.entries(SEGMENTOS)) {
      corpo += `<rect x="${i * 13 + 1 + x}" y="${1 + y}" width="${w}" height="${hh}" fill="${DIGITOS[d].includes(s) ? '#ff0000' : '#400000'}"/>`;
    }
  });
  return svg(41, 25, corpo);
}

/* ---------- O jogo (sem a tela, para os testes) ---------- */

export class Campo {
  constructor(colunas, linhas, minas, sorteio = Math.random) {
    this.colunas = colunas;
    this.linhas = linhas;
    this.minas = Math.min(minas, colunas * linhas - 9);
    this.sorteio = sorteio;
    this.n = colunas * linhas;
    this.mina = new Uint8Array(this.n);
    this.aberta = new Uint8Array(this.n);
    this.marca = new Uint8Array(this.n); // 0 nada, 1 bandeira, 2 interrogação
    this.vizinhas = new Uint8Array(this.n);
    this.semeado = false;
    this.fim = null; // null, 'ganhou' ou 'perdeu'
    this.explodiu = -1;
    this.abertas = 0;
  }

  vizinhosDe(i) {
    const x = i % this.colunas;
    const y = Math.floor(i / this.colunas);
    const r = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < this.colunas && ny < this.linhas) r.push(ny * this.colunas + nx);
      }
    }
    return r;
  }

  /** As minas entram no primeiro clique, longe dele (a casa e as vizinhas ficam livres). */
  semear(primeira) {
    const livres = new Set([primeira, ...this.vizinhosDe(primeira)]);
    const lugares = [];
    for (let i = 0; i < this.n; i++) if (!livres.has(i)) lugares.push(i);
    for (let k = 0; k < this.minas; k++) {
      const j = k + Math.floor(this.sorteio() * (lugares.length - k));
      [lugares[k], lugares[j]] = [lugares[j], lugares[k]];
      this.mina[lugares[k]] = 1;
    }
    for (let i = 0; i < this.n; i++) this.vizinhas[i] = this.vizinhosDe(i).reduce((s, v) => s + this.mina[v], 0);
    this.semeado = true;
  }

  /** Abre uma casa (e as vizinhas, se não houver mina em volta). Devolve as casas abertas. */
  abrir(i) {
    if (this.fim || this.aberta[i] || this.marca[i] === 1) return [];
    if (!this.semeado) this.semear(i);
    if (this.mina[i]) {
      this.aberta[i] = 1;
      this.explodiu = i;
      this.fim = 'perdeu';
      return [i];
    }
    const abertas = [];
    const pilha = [i];
    while (pilha.length) {
      const c = pilha.pop();
      if (this.aberta[c] || this.marca[c] === 1) continue;
      this.aberta[c] = 1;
      this.marca[c] = 0;
      this.abertas++;
      abertas.push(c);
      if (this.vizinhas[c] === 0) for (const v of this.vizinhosDe(c)) if (!this.aberta[v] && !this.mina[v]) pilha.push(v);
    }
    if (this.abertas === this.n - this.minas) {
      this.fim = 'ganhou';
      for (let k = 0; k < this.n; k++) if (this.mina[k]) this.marca[k] = 1;
    }
    return abertas;
  }

  /** Num número já aberto com as bandeiras certas em volta, abre as outras vizinhas. */
  acordo(i) {
    if (this.fim || !this.aberta[i] || !this.vizinhas[i]) return [];
    const viz = this.vizinhosDe(i);
    if (viz.filter((v) => this.marca[v] === 1).length !== this.vizinhas[i]) return [];
    return viz.flatMap((v) => this.abrir(v));
  }

  marcar(i, comInterrogacao = false) {
    if (this.fim || this.aberta[i]) return;
    this.marca[i] = this.marca[i] === 0 ? 1 : (this.marca[i] === 1 && comInterrogacao ? 2 : 0);
  }

  get bandeiras() {
    return this.marca.reduce((s, m) => s + (m === 1 ? 1 : 0), 0);
  }
}

/* ---------- A janela ---------- */

const cfg = () => (estado.config.jogos && estado.config.jogos.campoMinado) || {};

class CampoMinado {
  constructor() {
    this.nivel = NIVEIS[cfg().nivel] ? cfg().nivel : 'iniciante';
    this.j = new Janela({
      id: 'campo-minado', titulo: tr('Campo Minado'), icone: 'campo-minado',
      redimensionavel: false, maximizavel: false, classe: 'campo-minado',
      menus: [
        {
          rotulo: tr('&Jogo'), itens: () => [
            { rotulo: tr('&Novo'), atalho: 'F2', acao: () => this.novo() },
            { separador: true },
            ...Object.entries(NIVEIS).map(([k, n]) => ({ rotulo: tr(n.nome), radio: true, marcado: this.nivel === k, acao: () => this.mudarNivel(k) })),
            { separador: true },
            { rotulo: tr('&Marcas (?)'), marcado: !!cfg().interrogacao, acao: () => this.salvar({ interrogacao: !cfg().interrogacao }) },
            { separador: true },
            { rotulo: tr('Melhores &tempos…'), acao: () => this.recordes() },
            { separador: true },
            { rotulo: tr('Sai&r'), acao: () => this.j.fechar() },
          ],
        },
        {
          rotulo: tr('A&juda'), itens: [
            { rotulo: tr('&Como jogar'), acao: () => info(tr('Abra todas as casas que não têm mina.\n\nO número de uma casa diz quantas minas há nas oito vizinhas. Clique com o botão direito (ou toque e segure) para marcar uma mina com a bandeira.\n\nNum número com todas as bandeiras em volta, clique com os dois botões (ou com o do meio, ou duas vezes) para abrir as outras vizinhas.\n\nO primeiro clique nunca acha uma mina.'), tr('Campo Minado')) },
          ],
        },
      ],
    });
    this.contador = h('div.cm-numero');
    this.relogio = h('div.cm-numero');
    this.botao = h('button.cm-rosto', { title: tr('Novo jogo (F2)'), on: { click: () => this.novo() } });
    this.grade = h('div.cm-grade');
    this.j.corpo.append(h('div.cm-moldura', h('div.cm-topo', this.contador, this.botao, this.relogio), this.grade));
    this.grade.addEventListener('mousedown', (e) => this.apertar(e));
    // O toque longo (numa tela de toque) chega só como "contextmenu", sem o botão direito antes: vira a bandeira.
    this.grade.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (Date.now() - (this.direitoEm || 0) < 600) return;
      const i = this.casaDe(e);
      if (i >= 0 && !this.c.fim) { this.c.marcar(i, !!cfg().interrogacao); this.desenharCasa(i); this.atualizarPainel(); }
    });
    this.grade.addEventListener('dblclick', (e) => { const i = this.casaDe(e); if (i >= 0) this.mostrar(this.c.acordo(i)); });
    this.j.el.addEventListener('keydown', (e) => { if (e.key === 'F2') { e.preventDefault(); this.novo(); } });
    this.j.ev.on('fechada', () => { clearInterval(this.timer); aberto = null; });
    this.novo();
  }

  salvar(parte) {
    return definirConfig({ jogos: { campoMinado: parte } });
  }

  mudarNivel(k) {
    this.nivel = k;
    this.salvar({ nivel: k });
    this.novo();
  }

  novo() {
    const n = NIVEIS[this.nivel];
    this.c = new Campo(n.colunas, n.linhas, n.minas);
    clearInterval(this.timer);
    this.timer = null;
    this.segundos = 0;
    this.grade.style.gridTemplateColumns = `repeat(${n.colunas}, 16px)`;
    this.casas = Array.from({ length: this.c.n }, (_, i) => h('div.cm-c', { dataset: { i } }));
    this.grade.replaceChildren(...this.casas);
    this.definirRosto('normal');
    this.atualizarPainel();
    ajustarAoConteudo(this.j);
  }

  casaDe(e) {
    const el = e.target.closest('.cm-c');
    return el ? Number(el.dataset.i) : -1;
  }

  definirRosto(tipo) {
    this.botao.innerHTML = rosto(tipo);
  }

  atualizarPainel() {
    this.contador.innerHTML = painelNumero(this.c.minas - this.c.bandeiras);
    this.relogio.innerHTML = painelNumero(this.segundos);
  }

  apertar(e) {
    const i = this.casaDe(e);
    if (i < 0 || this.c.fim) return;
    e.preventDefault();
    const doisBotoes = e.buttons === 3 || e.button === 1;
    if (e.button === 2) this.direitoEm = Date.now();
    if (e.button === 2 && !doisBotoes) {
      this.c.marcar(i, !!cfg().interrogacao);
      this.desenharCasa(i);
      this.atualizarPainel();
      return;
    }
    // Enquanto o botão está apertado, a casa (ou as vizinhas, no acordo) afunda e o rosto se assusta.
    const afundadas = doisBotoes ? [i, ...this.c.vizinhosDe(i)] : [i];
    const marcar = (v) => afundadas.forEach((k) => { if (!this.c.aberta[k] && !this.c.marca[k]) this.casas[k].classList.toggle('apertada', v); });
    marcar(true);
    this.definirRosto('surpreso');
    const soltar = (ev) => {
      window.removeEventListener('mouseup', soltar);
      marcar(false);
      if (this.c.fim) return;
      this.definirRosto('normal');
      if (this.casaDe(ev) !== i) return;
      if (doisBotoes || ev.buttons) this.mostrar(this.c.acordo(i));
      else this.mostrar(this.c.abrir(i));
    };
    window.addEventListener('mouseup', soltar);
  }

  mostrar(abertas) {
    if (abertas.length && !this.timer && !this.c.fim) {
      this.segundos = 1;
      this.timer = setInterval(() => { this.segundos = Math.min(999, this.segundos + 1); this.atualizarPainel(); }, 1000);
    }
    abertas.forEach((k) => this.desenharCasa(k));
    if (this.c.fim) this.terminar();
    this.atualizarPainel();
  }

  desenharCasa(k) {
    const el = this.casas[k];
    const c = this.c;
    el.className = 'cm-c';
    el.innerHTML = '';
    if (c.aberta[k]) {
      el.classList.add('aberta');
      if (c.mina[k]) { el.innerHTML = MINA; if (k === c.explodiu) el.classList.add('explodiu'); }
      else if (c.vizinhas[k]) { el.textContent = c.vizinhas[k]; el.classList.add('n' + c.vizinhas[k]); }
    } else if (c.fim === 'perdeu' && c.mina[k] && c.marca[k] !== 1) {
      el.classList.add('aberta');
      el.innerHTML = MINA;
    } else if (c.fim === 'perdeu' && c.marca[k] === 1 && !c.mina[k]) {
      el.classList.add('aberta');
      el.innerHTML = ERRADA;
    } else if (c.marca[k] === 1) {
      el.innerHTML = BANDEIRA;
    } else if (c.marca[k] === 2) {
      el.textContent = '?';
      el.classList.add('interrogacao');
    }
  }

  async terminar() {
    clearInterval(this.timer);
    for (let k = 0; k < this.c.n; k++) this.desenharCasa(k);
    if (this.c.fim === 'perdeu') {
      this.definirRosto('perdeu');
      tocar('explosao');
      return;
    }
    this.definirRosto('ganhou');
    tocar('vitoria');
    const recordes = cfg().recordes || {};
    const atual = recordes[this.nivel];
    if (!atual || this.segundos < atual.tempo) {
      const nome = await entrada({
        titulo: tr('Campo Minado'), icone: 'campo-minado',
        texto: tr('Você fez o melhor tempo do nível {nivel}: {tempo} segundos.\nDigite o seu nome:', { nivel: tr(NIVEIS[this.nivel].nome), tempo: this.segundos }),
        valor: (cfg().ultimoNome) || '',
      });
      await this.salvar({ recordes: { [this.nivel]: { tempo: this.segundos, nome: (nome || '').trim() || tr('Anônimo') } }, ...(nome ? { ultimoNome: nome.trim() } : {}) });
      this.recordes();
    }
  }

  async recordes() {
    const r = cfg().recordes || {};
    const linhas = Object.entries(NIVEIS).map(([k, n]) => `${tr(n.nome)}: ${r[k] ? tr('{tempo} segundos', { tempo: r[k].tempo }) + ' — ' + r[k].nome : tr('(nenhum)')}`);
    const v = await mensagem({
      titulo: tr('Melhores tempos'), tipo: 'info', texto: linhas.join('\n'),
      botoes: [{ texto: tr('OK'), valor: true, padrao: true }, { texto: tr('&Zerar os tempos'), valor: 'zerar' }],
    });
    if (v === 'zerar' && await confirmar(tr('Apagar os melhores tempos do Campo Minado?'), { titulo: tr('Campo Minado') })) {
      await this.salvar({ recordes: null });
    }
  }
}

let aberto = null;

registrarApp('campo-minado', {
  nome: 'Campo Minado', icone: 'campo-minado',
  abrir: (args = {}) => {
    if (aberto && !aberto.j.fechada) { aberto.j.focar(); return aberto; }
    aberto = new CampoMinado();
    return aberto;
  },
});
