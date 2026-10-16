/*
 * O Prompt de comando: um terminal de verdade (o shell do computador principal),
 * aberto numa pasta do disco. O "Claude" é o mesmo terminal com o Claude Code.
 */
import { h, img, caminhoTela } from '../util.js';
import { Janela } from '../janelas.js';
import { abrirMenu } from '../menus.js';
import { registrarApp, estado, definirConfig, abrir, pastaDocs } from '../sistema.js';
import { mensagem, erro, ajustarAoConteudo } from '../dialogos.js';
import { tr } from '../idioma.js';

// As cores: o fundo escuro dos monitores VGA da época (o padrão do Prompt) e o fundo claro, como
// uma folha de papel (o padrão do Claude), com o branco das cores trocado por cinza para aparecer.
const TEMAS = {
  escuro: {
    background: '#000000', foreground: '#c0c0c0', cursor: '#c0c0c0', cursorAccent: '#000000',
    selectionBackground: '#c0c0c0', selectionForeground: '#000000',
    black: '#000000', red: '#aa0000', green: '#00aa00', yellow: '#aa5500', blue: '#0000aa', magenta: '#aa00aa', cyan: '#00aaaa', white: '#aaaaaa',
    brightBlack: '#555555', brightRed: '#ff5555', brightGreen: '#55ff55', brightYellow: '#ffff55', brightBlue: '#5555ff', brightMagenta: '#ff55ff', brightCyan: '#55ffff', brightWhite: '#ffffff',
  },
  claro: {
    background: '#ffffff', foreground: '#000000', cursor: '#000000', cursorAccent: '#ffffff',
    selectionBackground: '#000080', selectionForeground: '#ffffff',
    black: '#000000', red: '#aa0000', green: '#007700', yellow: '#886600', blue: '#0000aa', magenta: '#aa00aa', cyan: '#007777', white: '#777777',
    brightBlack: '#555555', brightRed: '#cc0000', brightGreen: '#008800', brightYellow: '#aa7700', brightBlue: '#0000ff', brightMagenta: '#cc00cc', brightCyan: '#008888', brightWhite: '#444444',
  },
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
  constructor({ pasta, comando, claude, titulo, icone } = {}) {
    this.pasta = pasta != null ? pasta : '';
    this.comando = comando || null;
    // O Claude Code: o processo principal monta o comando (e o pedido vai por uma variável, sem aspas a escapar).
    this.claude = claude || null;
    this.tituloBase = titulo || tr('Prompt de comando');
    this.id = null;
    this.encerrado = false;
    const cfg = estado.config.prompt || {};
    const tam = cfg.fonte || 10;
    // As cores de cada um: o Claude claro e o Prompt escuro, a não ser que o usuário tenha trocado.
    this.chaveTema = this.claude ? 'temaClaude' : 'tema';
    this.tema = TEMAS[cfg[this.chaveTema]] ? cfg[this.chaveTema] : this.claude ? 'claro' : 'escuro';
    this.j = new Janela({
      titulo: this.tituloBase,
      icone: icone || 'prompt',
      largura: tam > 10 ? 980 : 700,
      altura: tam > 10 ? 600 : 440,
      minLargura: 300,
      minAltura: 160,
      aoFechar: () => this.podeFechar(),
    });
    this.seletorFonte = h('select', { title: tr('Tamanho da letra') }, [10, 15, 20].map((n) => h('option', { value: String(n) }, n === 10 ? tr('Normal') : n === 15 ? tr('Média') : tr('Grande'))));
    this.seletorFonte.value = String(tam);
    this.seletorFonte.addEventListener('change', () => this.mudarFonte(Number(this.seletorFonte.value)));
    this.seletorTema = h('select', { title: tr('Cores do terminal') }, h('option', { value: 'claro' }, tr('Fundo claro')), h('option', { value: 'escuro' }, tr('Fundo escuro')));
    this.seletorTema.value = this.tema;
    this.seletorTema.addEventListener('change', () => this.mudarTema(this.seletorTema.value));
    const barra = h('div.barra-ferramentas',
      h('div.select-caixa', { style: { width: '84px' } }, this.seletorFonte),
      h('div.select-caixa', { style: { width: '104px' } }, this.seletorTema),
      h('div.sep'),
      h('button.ferramenta', { title: tr('Copiar (Ctrl+Shift+C)'), on: { click: () => this.copiar() } }, tr('Copiar')),
      h('button.ferramenta', { title: tr('Colar (Ctrl+Shift+V)'), on: { click: () => this.colar() } }, tr('Colar')),
      h('div.sep'),
      h('button.ferramenta', { title: tr('Mostrar a pasta no computador principal'), on: { click: () => retro.disco.mostrar(this.pasta) } }, img('pasta-aberta', 16), tr('Pasta')),
    );
    this.areaTerm = h('div.prompt-corpo');
    this.areaTerm.classList.toggle('claro', this.tema === 'claro');
    this.j.corpo.append(barra, this.areaTerm);
    // Ctrl+roda do mouse: a letra maior ou menor (os mesmos três tamanhos da lista).
    this.areaTerm.addEventListener('wheel', (e) => {
      if (!e.ctrlKey || !e.deltaY) return;
      e.preventDefault();
      e.stopPropagation();
      const tams = [...this.seletorFonte.options].map((o) => Number(o.value));
      const i = tams.indexOf(Number(this.seletorFonte.value)) + (e.deltaY < 0 ? 1 : -1);
      if (i < 0 || i >= tams.length) return;
      this.seletorFonte.value = String(tams[i]);
      this.mudarFonte(tams[i]);
    }, { passive: false, capture: true });
    this.j.ev.on('fechada', () => this.encerrar());
    this.j.ev.on('ativada', () => setTimeout(() => this.term && this.term.focus(), 0));
    this.j.ev.on('tamanho', () => this.ajustar());
    this.iniciar(tam);
  }

  async iniciar(tam) {
    if (!(await retro.terminal.disponivel())) {
      this.areaTerm.textContent = tr('O terminal não está disponível nesta instalação.');
      return;
    }
    await document.fonts.load(`${tam}px Csilla`).catch(() => { });
    ouvirTerminais();
    this.term = new Terminal({
      fontFamily: FONTE,
      fontSize: tam,
      lineHeight: 1.2,
      theme: TEMAS[this.tema],
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
        { rotulo: tr('&Copiar'), desativado: !this.term.hasSelection(), acao: () => this.copiar() },
        { rotulo: tr('C&olar'), acao: () => this.colar() },
        { separador: true },
        { rotulo: tr('Selecionar &tudo'), acao: () => this.term.selectAll() },
        { rotulo: tr('&Limpar a tela'), acao: () => this.term.clear() },
      ], { x: e.clientX, y: e.clientY });
    });
    new ResizeObserver(() => this.ajustar()).observe(this.areaTerm);
    try {
      // O Claude Code abre com o tema que combina com estas cores (main.js, ajustesClaude).
      const claude = this.claude ? { ...this.claude, tema: this.tema } : null;
      this.id = await retro.terminal.criar({ cols: this.term.cols, rows: this.term.rows, pasta: this.pasta, comando: this.comando, claude });
      terminais.set(this.id, this);
    } catch (e) {
      this.term.write(`\r\n${tr('Não foi possível abrir o terminal: {erro}', { erro: e.message })}\r\n`);
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

  mudarTema(tema) {
    if (!TEMAS[tema] || tema === this.tema) return;
    this.tema = tema;
    this.areaTerm.classList.toggle('claro', tema === 'claro');
    if (this.term) this.term.options.theme = TEMAS[tema];
    definirConfig({ prompt: { [this.chaveTema]: tema } }).catch(() => { });
    // O Claude Code escolhe as cores dele ao abrir: com o Claude já aberto, ele acompanha na próxima vez.
    if (this.claude && this.id && !this.encerrado) {
      mensagem({ titulo: 'Claude', tipo: 'info', texto: tr('As cores do Claude acompanham o fundo novo na próxima vez que ele abrir. Para continuar a mesma conversa, digite /resume no Claude novo.') })
        .then(() => this.term && this.term.focus());
    }
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
    const fim = codigo ? tr('[Processo encerrado (código {codigo}). Pressione uma tecla para fechar a janela.]', { codigo }) : tr('[Processo encerrado. Pressione uma tecla para fechar a janela.]');
    this.term.write(`\r\n\x1b[90m${fim}\x1b[0m\r\n`);
  }

  podeFechar() {
    if (this.encerrado || !this.id) return true;
    return mensagem({
      titulo: this.tituloBase,
      tipo: 'aviso',
      texto: tr('O programa ainda está em execução nesta janela.\n\nDeseja encerrá-lo e fechar a janela?'),
      botoes: [{ texto: tr('&Sim'), valor: true, padrao: true }, { texto: tr('&Não'), valor: false }],
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
  const pasta = args.pasta != null ? args.pasta : pastaDocs();
  const caminho = await retro.terminal.acharClaude().catch(() => null);
  if (caminho) {
    return new Prompt({ pasta, claude: { pedido: args.pedido || '' }, titulo: 'Claude', icone: 'claude' });
  }
  const comando = await retro.terminal.comandoInstalarClaude();
  const temChave = estado.config.temChave;
  const j = new Janela({ titulo: 'Claude', icone: 'claude', dialogo: true, largura: 440, altura: 300 });
  j.corpo.append(
    h('div.mensagem', img('claude', 32), h('div.texto.texto-ajuda',
      h('b', tr('O Claude Code ainda não está instalado neste computador.')),
      h('p', tr('Ele roda no Prompt de comando do Retro Computer, trabalhando nos arquivos do disco C:. A instalação usa o instalador oficial da Anthropic:')),
      h('span.codigo-linha', comando),
      h('p', temChave
        ? tr('A sua chave de API já está guardada: o Claude Code vai usá-la.')
        : tr('Depois de instalar, entre com a sua conta do Claude (assinatura) quando o Claude Code pedir, ou guarde uma chave de API no Painel de controle › Claude.')),
    )),
    h('div.acoes',
      h('button.padrao', { on: { click: () => { j.fechar(true); new Prompt({ pasta, comando, titulo: tr('Instalar o Claude Code'), icone: 'claude' }); } } }, tr('Instalar agora')),
      h('button', { on: { click: () => { j.fechar(true); abrir('painel', { secao: 'claude' }); } } }, tr('Chave de API…')),
      h('button', { on: { click: () => j.fechar(true) } }, tr('Cancelar')),
    ),
  );
  ajustarAoConteudo(j, { minLarg: 440 });
  return null;
}

registrarApp('prompt', { nome: 'Prompt de comando', icone: 'prompt', abrir: (args = {}) => new Prompt({ pasta: args.pasta, comando: args.comando, titulo: args.titulo }) });
registrarApp('claude', { nome: 'Claude', icone: 'claude', abrir: abrirClaude });

export { caminhoTela, erro };
