/*
 * O Prompt de comando: um terminal de verdade (o shell do computador principal),
 * aberto numa pasta do disco. O "Claude" é o mesmo terminal com o Claude Code.
 */
import { h, img, caminhoTela } from '../util.js';
import { Janela } from '../janelas.js';
import { abrirMenu } from '../menus.js';
import { registrarApp, estado, definirConfig, abrir } from '../sistema.js';
import { mensagem, erro, ajustarAoConteudo } from '../dialogos.js';

// As cores dos monitores VGA da época.
const TEMA = {
  background: '#000000', foreground: '#c0c0c0', cursor: '#c0c0c0', cursorAccent: '#000000',
  selectionBackground: '#c0c0c0', selectionForeground: '#000000',
  black: '#000000', red: '#aa0000', green: '#00aa00', yellow: '#aa5500', blue: '#0000aa', magenta: '#aa00aa', cyan: '#00aaaa', white: '#aaaaaa',
  brightBlack: '#555555', brightRed: '#ff5555', brightGreen: '#55ff55', brightYellow: '#ffff55', brightBlue: '#5555ff', brightMagenta: '#ff55ff', brightCyan: '#55ffff', brightWhite: '#ffffff',
};
const FONTE = "'Csilla', 'DejaVu Sans Mono', Menlo, Consolas, 'Liberation Mono', monospace";

const terminais = new Map(); // id → Prompt
let ouvindo = false;

function ouvirTerminais() {
  if (ouvindo) return;
  ouvindo = true;
  retro.terminal.aoDados((id, d) => { const p = terminais.get(id); if (p) p.term.write(d); });
  retro.terminal.aoSair((id, codigo) => { const p = terminais.get(id); if (p) p.saiu(codigo); });
}

class Prompt {
  constructor({ pasta, comando, titulo, icone } = {}) {
    this.pasta = pasta != null ? pasta : '';
    this.comando = comando || null;
    this.tituloBase = titulo || 'Prompt de comando';
    this.id = null;
    this.encerrado = false;
    const tam = (estado.config.prompt && estado.config.prompt.fonte) || 10;
    this.j = new Janela({
      titulo: this.tituloBase,
      icone: icone || 'prompt',
      largura: tam > 10 ? 980 : 700,
      altura: tam > 10 ? 600 : 440,
      minLargura: 300,
      minAltura: 160,
      aoFechar: () => this.podeFechar(),
    });
    this.seletorFonte = h('select', { title: 'Tamanho da letra' }, [10, 15, 20].map((n) => h('option', { value: String(n) }, n === 10 ? 'Normal' : n === 15 ? 'Média' : 'Grande')));
    this.seletorFonte.value = String(tam);
    this.seletorFonte.addEventListener('change', () => this.mudarFonte(Number(this.seletorFonte.value)));
    const barra = h('div.barra-ferramentas',
      h('div.select-caixa', { style: { width: '84px' } }, this.seletorFonte),
      h('div.sep'),
      h('button.ferramenta', { title: 'Copiar (Ctrl+Shift+C)', on: { click: () => this.copiar() } }, 'Copiar'),
      h('button.ferramenta', { title: 'Colar (Ctrl+Shift+V)', on: { click: () => this.colar() } }, 'Colar'),
      h('div.sep'),
      h('button.ferramenta', { title: 'Mostrar a pasta no computador principal', on: { click: () => retro.disco.mostrar(this.pasta) } }, img('pasta-aberta', 16), 'Pasta'),
    );
    this.areaTerm = h('div.prompt-corpo');
    this.j.corpo.append(barra, this.areaTerm);
    this.j.ev.on('fechada', () => this.encerrar());
    this.j.ev.on('ativada', () => setTimeout(() => this.term && this.term.focus(), 0));
    this.j.ev.on('tamanho', () => this.ajustar());
    this.iniciar(tam);
  }

  async iniciar(tam) {
    if (!(await retro.terminal.disponivel())) {
      this.areaTerm.textContent = 'O terminal não está disponível nesta instalação.';
      return;
    }
    await document.fonts.load(`${tam}px Csilla`).catch(() => { });
    ouvirTerminais();
    this.term = new Terminal({
      fontFamily: FONTE,
      fontSize: tam,
      lineHeight: 1.2,
      theme: TEMA,
      cursorBlink: true,
      cursorStyle: 'underline',
      scrollback: 5000,
      allowProposedApi: true,
      macOptionIsMeta: true,
      rightClickSelectsWord: false,
    });
    this.fit = new FitAddon.FitAddon();
    this.term.loadAddon(this.fit);
    try {
      const u = new Unicode11Addon.Unicode11Addon();
      this.term.loadAddon(u);
      this.term.unicode.activeVersion = '11';
    } catch { }
    this.term.open(this.areaTerm);
    try {
      const gl = new WebglAddon.WebglAddon();
      gl.onContextLoss(() => gl.dispose());
      this.term.loadAddon(gl);
    } catch { /* sem WebGL: fica o desenho comum */ }
    this.fit.fit();
    this.term.attachCustomKeyEventHandler((e) => this.teclas(e));
    this.term.onData((d) => { if (this.id && !this.encerrado) retro.terminal.escrever(this.id, d); else if (this.encerrado) this.j.fechar(true); });
    this.term.onTitleChange((t) => { if (t) this.j.definirTitulo(`${this.tituloBase} - ${t}`.slice(0, 120)); });
    this.term.onSelectionChange(() => { });
    this.areaTerm.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      abrirMenu([
        { rotulo: '&Copiar', desativado: !this.term.hasSelection(), acao: () => this.copiar() },
        { rotulo: 'C&olar', acao: () => this.colar() },
        { separador: true },
        { rotulo: 'Selecionar &tudo', acao: () => this.term.selectAll() },
        { rotulo: '&Limpar a tela', acao: () => this.term.clear() },
      ], { x: e.clientX, y: e.clientY });
    });
    new ResizeObserver(() => this.ajustar()).observe(this.areaTerm);
    try {
      this.id = await retro.terminal.criar({ cols: this.term.cols, rows: this.term.rows, pasta: this.pasta, comando: this.comando });
      terminais.set(this.id, this);
    } catch (e) {
      this.term.write(`\r\nNão foi possível abrir o terminal: ${e.message}\r\n`);
    }
    this.term.focus();
  }

  teclas(e) {
    if (e.type !== 'keydown') return true;
    const ctrlShift = e.ctrlKey && e.shiftKey;
    if (ctrlShift && e.code === 'KeyC') { this.copiar(); return false; }
    if (ctrlShift && e.code === 'KeyV') { this.colar(); return false; }
    return true;
  }

  ajustar() {
    if (!this.fit || this.j.minimizada) return;
    clearTimeout(this.timerAjuste);
    this.timerAjuste = setTimeout(() => {
      try {
        this.fit.fit();
        if (this.id) retro.terminal.redimensionar(this.id, this.term.cols, this.term.rows);
      } catch { }
    }, 30);
  }

  mudarFonte(tam) {
    document.fonts.load(`${tam}px Csilla`).finally(() => {
      this.term.options.fontSize = tam;
      this.ajustar();
    });
    definirConfig({ prompt: { fonte: tam } }).catch(() => { });
  }

  copiar() {
    const s = this.term.getSelection();
    if (s) navigator.clipboard.writeText(s).catch(() => { });
    this.term.focus();
  }

  async colar() {
    try {
      const t = await navigator.clipboard.readText();
      if (t) this.term.paste(t);
    } catch { }
    this.term.focus();
  }

  saiu(codigo) {
    this.encerrado = true;
    terminais.delete(this.id);
    this.term.write(`\r\n\x1b[90m[Processo encerrado${codigo ? ` (código ${codigo})` : ''}. Pressione uma tecla para fechar a janela.]\x1b[0m\r\n`);
  }

  podeFechar() {
    if (this.encerrado || !this.id) return true;
    return mensagem({
      titulo: this.tituloBase,
      tipo: 'aviso',
      texto: 'O programa ainda está em execução nesta janela.\n\nDeseja encerrá-lo e fechar a janela?',
      botoes: [{ texto: '&Sim', valor: true, padrao: true }, { texto: '&Não', valor: false }],
    }).then((v) => v === true);
  }

  encerrar() {
    if (this.id) {
      retro.terminal.fechar(this.id);
      terminais.delete(this.id);
    }
    if (this.term) this.term.dispose();
  }
}

/* ---------- O Claude ---------- */

async function abrirClaude(args = {}) {
  const pasta = args.pasta != null ? args.pasta : 'Meus documentos';
  const caminho = await retro.terminal.acharClaude().catch(() => null);
  if (caminho) {
    return new Prompt({ pasta, comando: 'claude', titulo: 'Claude', icone: 'claude' });
  }
  const comando = await retro.terminal.comandoInstalarClaude();
  const temChave = estado.config.temChave;
  const j = new Janela({ titulo: 'Claude', icone: 'claude', dialogo: true, largura: 440, altura: 300 });
  j.corpo.append(
    h('div.mensagem', img('claude', 32), h('div.texto.texto-ajuda',
      h('b', 'O Claude Code ainda não está instalado neste computador.'),
      h('p', 'Ele roda no Prompt de comando do Retro Computer, trabalhando nos arquivos do disco C:. A instalação usa o instalador oficial da Anthropic:'),
      h('span.codigo-linha', comando),
      h('p', temChave
        ? 'A sua chave de API já está guardada: o Claude Code vai usá-la.'
        : 'Depois de instalar, entre com a sua conta do Claude (assinatura) quando o Claude Code pedir, ou guarde uma chave de API no Painel de controle › Claude.'),
    )),
    h('div.acoes',
      h('button.padrao', { on: { click: () => { j.fechar(true); new Prompt({ pasta, comando, titulo: 'Instalar o Claude Code', icone: 'claude' }); } } }, 'Instalar agora'),
      h('button', { on: { click: () => { j.fechar(true); abrir('painel', { secao: 'claude' }); } } }, 'Chave de API…'),
      h('button', { on: { click: () => j.fechar(true) } }, 'Cancelar'),
    ),
  );
  ajustarAoConteudo(j, { minLarg: 440 });
  return null;
}

registrarApp('prompt', { nome: 'Prompt de comando', icone: 'prompt', abrir: (args = {}) => new Prompt({ pasta: args.pasta }) });
registrarApp('claude', { nome: 'Claude', icone: 'claude', abrir: abrirClaude });

export { caminhoTela, erro };
