/* O Bloco de notas: textos simples, gravados no disco em UTF-8. */
import { h, nomeDe, paiDe } from '../util.js';
import { Janela } from '../janelas.js';
import { registrarApp, adicionarRecente, avisar, estado, definirConfig, pastaDocs } from '../sistema.js';
import { caixaArquivo, simNaoCancelar, erro, entrada, info } from '../dialogos.js';
import { tr, marcar } from '../idioma.js';

const ZOOM_MAX = 4;
const TIPOS = [{ rotulo: marcar('Documentos de texto (*.txt)'), exts: ['txt'] }, { rotulo: marcar('Markdown (*.md)'), exts: ['md'] }];

class Bloco {
  constructor({ arquivo } = {}) {
    this.rel = null;
    this.sujo = false;
    this.crlf = false;
    this.busca = '';
    this.quebra = true;
    this.zoom = 1;
    this.fixa = !!(estado.config.bloco && estado.config.bloco.fixa);
    this.texto = h('textarea.quebra', { spellcheck: false, wrap: 'soft' });
    this.texto.classList.toggle('proporcional', !this.fixa);
    this.j = new Janela({
      titulo: `${tr('Sem título')} - ${tr('Bloco de notas')}`,
      icone: 'bloco',
      largura: 520,
      altura: 360,
      classe: 'bloco',
      menus: this.menus(),
      aoFechar: () => this.podeFechar(),
    });
    this.j.corpo.append(this.texto);
    this.texto.addEventListener('input', () => this.marcarSujo(true));
    this.texto.addEventListener('keydown', (e) => this.teclas(e));
    // Ctrl+roda do mouse: o zoom do texto.
    this.texto.addEventListener('wheel', (e) => {
      if (!e.ctrlKey || !e.deltaY) return;
      e.preventDefault();
      this.mudarZoom(e.deltaY < 0 ? 1 : -1);
    }, { passive: false });
    this.j.ev.on('ativada', () => setTimeout(() => this.texto.focus(), 0));
    if (arquivo) this.abrirRel(arquivo);
    else this.texto.focus();
  }

  menus() {
    return [
      {
        rotulo: tr('&Arquivo'), itens: [
          { rotulo: tr('&Novo'), atalho: 'Ctrl+N', acao: () => this.novo() },
          { rotulo: tr('&Abrir…'), atalho: 'Ctrl+O', acao: () => this.abrir() },
          { rotulo: tr('&Salvar'), atalho: 'Ctrl+S', acao: () => this.salvar() },
          { rotulo: tr('Salvar &como…'), acao: () => this.salvar(true) },
          { separador: true },
          { rotulo: tr('&Imprimir…'), atalho: 'Ctrl+P', acao: () => this.imprimir() },
          { rotulo: tr('Salvar como P&DF…'), acao: () => this.salvarPdf() },
          { separador: true },
          { rotulo: tr('Sai&r'), acao: () => this.j.fechar() },
        ],
      },
      {
        rotulo: tr('&Editar'), itens: () => [
          { rotulo: tr('&Desfazer'), atalho: 'Ctrl+Z', acao: () => document.execCommand('undo') },
          { separador: true },
          { rotulo: tr('Recor&tar'), atalho: 'Ctrl+X', acao: () => { this.texto.focus(); document.execCommand('cut'); } },
          { rotulo: tr('&Copiar'), atalho: 'Ctrl+C', acao: () => { this.texto.focus(); document.execCommand('copy'); } },
          { rotulo: tr('C&olar'), atalho: 'Ctrl+V', acao: () => this.colar() },
          { rotulo: tr('&Excluir'), atalho: 'Del', acao: () => { this.texto.focus(); document.execCommand('delete'); } },
          { separador: true },
          { rotulo: tr('Selecionar &tudo'), atalho: 'Ctrl+A', acao: () => { this.texto.focus(); this.texto.select(); } },
          { rotulo: tr('&Hora/data'), atalho: 'F5', acao: () => this.horaData() },
        ],
      },
      {
        rotulo: tr('F&ormatar'), itens: () => [
          { rotulo: tr('&Quebra automática de linha'), marcado: this.quebra, acao: () => this.alternarQuebra() },
          { separador: true },
          { rotulo: tr('Letra &proporcional'), radio: true, marcado: !this.fixa, acao: () => this.definirFonte(false) },
          { rotulo: tr('Letra de largura &fixa'), radio: true, marcado: this.fixa, acao: () => this.definirFonte(true) },
        ],
      },
      {
        // O zoom em números inteiros: as letras de bitmap continuam nítidas.
        rotulo: tr('E&xibir'), itens: () => [
          { rotulo: tr('&Ampliar'), atalho: 'Ctrl++', desativado: this.zoom >= ZOOM_MAX, acao: () => this.mudarZoom(1) },
          { rotulo: tr('&Reduzir'), atalho: 'Ctrl+-', desativado: this.zoom <= 1, acao: () => this.mudarZoom(-1) },
          { rotulo: tr('Restaurar o &zoom padrão'), atalho: 'Ctrl+0', desativado: this.zoom === 1, acao: () => this.mudarZoom(0) },
        ],
      },
      {
        rotulo: tr('&Pesquisar'), itens: [
          { rotulo: tr('&Localizar…'), atalho: 'Ctrl+F', acao: () => this.localizar(true) },
          { rotulo: tr('Localizar &próxima'), atalho: 'F3', acao: () => this.localizar(false) },
        ],
      },
      {
        rotulo: tr('A&juda'), itens: [
          { rotulo: tr('&Sobre o Bloco de notas'), acao: () => info(tr('Bloco de notas') + '\n\n' + tr('Textos simples, gravados em UTF-8 no disco C:.\nAs versões anteriores ficam guardadas (botão direito no arquivo › Versões anteriores).'), tr('Sobre o Bloco de notas')) },
        ],
      },
    ];
  }

  async imprimir() {
    const { imprimirTexto } = await import('../impressao.js');
    imprimirTexto(this.rel ? nomeDe(this.rel) : tr('Sem título'), this.texto.value, { fixa: this.fixa });
  }

  async salvarPdf() {
    const { pdfDoTexto } = await import('../impressao.js');
    pdfDoTexto(this.rel ? nomeDe(this.rel) : tr('Sem título'), this.texto.value, { fixa: this.fixa, perto: this.rel || '' });
  }

  marcarSujo(v) {
    this.sujo = v;
    this.atualizarTitulo();
  }

  atualizarTitulo() {
    const nome = this.rel ? nomeDe(this.rel) : tr('Sem título');
    this.j.definirTitulo(`${this.sujo ? '*' : ''}${nome} - ${tr('Bloco de notas')}`);
  }

  teclas(e) {
    const ctrl = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (ctrl && k === 's') { e.preventDefault(); this.salvar(e.shiftKey); }
    else if (ctrl && k === 'o') { e.preventDefault(); this.abrir(); }
    else if (ctrl && k === 'n') { e.preventDefault(); this.novo(); }
    else if (ctrl && k === 'f') { e.preventDefault(); this.localizar(true); }
    else if (ctrl && k === 'p') { e.preventDefault(); this.imprimir(); }
    else if (ctrl && (k === '+' || k === '=')) { e.preventDefault(); this.mudarZoom(1); }
    else if (ctrl && k === '-') { e.preventDefault(); this.mudarZoom(-1); }
    else if (ctrl && k === '0') { e.preventDefault(); this.mudarZoom(0); }
    else if (e.key === 'F3') { e.preventDefault(); this.localizar(false); }
    else if (e.key === 'F5') { e.preventDefault(); this.horaData(); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '\t');
    }
  }

  async podeFechar() {
    if (!this.sujo) return true;
    const r = await simNaoCancelar(tr('O texto do arquivo {nome} foi alterado.\n\nDeseja salvar as alterações?', { nome: this.rel ? nomeDe(this.rel) : tr('Sem título') }), tr('Bloco de notas'));
    if (r === null) return false;
    if (r === 'sim') return this.salvar();
    return true;
  }

  async novo() {
    if (!(await this.podeFechar())) return;
    this.rel = null;
    this.texto.value = '';
    this.marcarSujo(false);
    this.texto.focus();
  }

  async abrir() {
    if (!(await this.podeFechar())) return;
    const rel = await caixaArquivo({ modo: 'abrir', pasta: this.rel ? paiDe(this.rel) : pastaDocs(), tipos: TIPOS });
    if (rel) this.abrirRel(rel);
  }

  async abrirRel(rel) {
    try {
      const t = await retro.disco.lerTexto(rel);
      this.crlf = t.includes('\r\n');
      this.texto.value = t.replace(/\r\n/g, '\n');
      this.rel = rel;
      this.marcarSujo(false);
      this.texto.setSelectionRange(0, 0);
      this.texto.scrollTop = 0;
      this.texto.focus();
      adicionarRecente(rel);
    } catch (e) {
      erro(tr('Não foi possível abrir {nome}: {erro}', { nome: nomeDe(rel), erro: e.message }), tr('Bloco de notas'));
    }
  }

  async salvar(como = false) {
    let rel = this.rel;
    if (!rel || como) {
      rel = await caixaArquivo({ modo: 'salvar', pasta: this.rel ? paiDe(this.rel) : pastaDocs(), nome: this.rel ? nomeDe(this.rel) : tr('Sem título') + '.txt', tipos: TIPOS });
      if (!rel) return false;
    }
    try {
      let t = this.texto.value;
      if (this.crlf) t = t.replace(/\n/g, '\r\n');
      await retro.disco.gravar(rel, new TextEncoder().encode(t));
      this.rel = rel;
      this.marcarSujo(false);
      adicionarRecente(rel);
      return true;
    } catch (e) {
      erro(tr('Não foi possível salvar {nome}: {erro}', { nome: nomeDe(rel), erro: e.message }), tr('Bloco de notas'));
      return false;
    }
  }

  async colar() {
    this.texto.focus();
    try {
      const t = await navigator.clipboard.readText();
      document.execCommand('insertText', false, t);
    } catch {
      document.execCommand('paste');
    }
  }

  horaData() {
    const d = new Date();
    const t = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString('pt-BR');
    this.texto.focus();
    document.execCommand('insertText', false, t);
  }

  /** O zoom (1×, 2×, 3× ou 4×); passo 0 volta ao normal. */
  mudarZoom(passo) {
    this.zoom = passo === 0 ? 1 : Math.min(ZOOM_MAX, Math.max(1, this.zoom + passo));
    this.texto.style.fontSize = this.zoom === 1 ? '' : `${10 * this.zoom}px`;
    this.texto.style.lineHeight = this.zoom === 1 ? '' : `${13 * this.zoom}px`;
  }

  definirFonte(fixa) {
    this.fixa = fixa;
    this.texto.classList.toggle('proporcional', !fixa);
    definirConfig({ bloco: { fixa } }).catch(() => { });
  }

  alternarQuebra() {
    this.quebra = !this.quebra;
    this.texto.classList.toggle('quebra', this.quebra);
    this.texto.wrap = this.quebra ? 'soft' : 'off';
  }

  async localizar(perguntar) {
    if (perguntar || !this.busca) {
      const t = await entrada({ titulo: tr('Localizar'), texto: tr('Localizar:'), valor: this.busca || this.texto.value.slice(this.texto.selectionStart, this.texto.selectionEnd) });
      if (!t) return;
      this.busca = t;
    }
    const v = this.texto.value.toLowerCase();
    const alvo = this.busca.toLowerCase();
    let i = v.indexOf(alvo, this.texto.selectionEnd);
    if (i < 0) i = v.indexOf(alvo);
    if (i < 0) {
      info(tr('Não foi possível localizar "{texto}".', { texto: this.busca }), tr('Bloco de notas'));
      return;
    }
    this.texto.focus();
    this.texto.setSelectionRange(i, i + alvo.length);
    // Rolar até a seleção.
    const linhas = this.texto.value.slice(0, i).split('\n').length;
    this.texto.scrollTop = Math.max(0, (linhas - 5) * 13);
  }
}

registrarApp('bloco', { nome: 'Bloco de notas', icone: 'bloco', abrir: (args) => new Bloco(args) });
export { avisar };
