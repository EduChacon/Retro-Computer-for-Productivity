/* O Bloco de notas: textos simples, gravados no disco em UTF-8. */
import { h, nomeDe, paiDe } from '../util.js';
import { Janela } from '../janelas.js';
import { registrarApp, adicionarRecente, avisar, estado, definirConfig } from '../sistema.js';
import { caixaArquivo, simNaoCancelar, erro, entrada, info } from '../dialogos.js';

const TIPOS = [{ rotulo: 'Documentos de texto (*.txt)', exts: ['txt'] }, { rotulo: 'Markdown (*.md)', exts: ['md'] }];

class Bloco {
  constructor({ arquivo } = {}) {
    this.rel = null;
    this.sujo = false;
    this.crlf = false;
    this.busca = '';
    this.quebra = true;
    this.fixa = !!(estado.config.bloco && estado.config.bloco.fixa);
    this.texto = h('textarea.quebra', { spellcheck: false, wrap: 'soft' });
    this.texto.classList.toggle('proporcional', !this.fixa);
    this.j = new Janela({
      titulo: 'Sem título - Bloco de notas',
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
    this.j.ev.on('ativada', () => setTimeout(() => this.texto.focus(), 0));
    if (arquivo) this.abrirRel(arquivo);
    else this.texto.focus();
  }

  menus() {
    return [
      {
        rotulo: '&Arquivo', itens: [
          { rotulo: '&Novo', atalho: 'Ctrl+N', acao: () => this.novo() },
          { rotulo: '&Abrir…', atalho: 'Ctrl+O', acao: () => this.abrir() },
          { rotulo: '&Salvar', atalho: 'Ctrl+S', acao: () => this.salvar() },
          { rotulo: 'Salvar &como…', acao: () => this.salvar(true) },
          { separador: true },
          { rotulo: 'Sai&r', acao: () => this.j.fechar() },
        ],
      },
      {
        rotulo: '&Editar', itens: () => [
          { rotulo: '&Desfazer', atalho: 'Ctrl+Z', acao: () => document.execCommand('undo') },
          { separador: true },
          { rotulo: 'Recor&tar', atalho: 'Ctrl+X', acao: () => { this.texto.focus(); document.execCommand('cut'); } },
          { rotulo: '&Copiar', atalho: 'Ctrl+C', acao: () => { this.texto.focus(); document.execCommand('copy'); } },
          { rotulo: 'C&olar', atalho: 'Ctrl+V', acao: () => this.colar() },
          { rotulo: '&Excluir', atalho: 'Del', acao: () => { this.texto.focus(); document.execCommand('delete'); } },
          { separador: true },
          { rotulo: 'Selecionar &tudo', atalho: 'Ctrl+A', acao: () => { this.texto.focus(); this.texto.select(); } },
          { rotulo: '&Hora/data', atalho: 'F5', acao: () => this.horaData() },
        ],
      },
      {
        rotulo: 'F&ormatar', itens: () => [
          { rotulo: '&Quebra automática de linha', marcado: this.quebra, acao: () => this.alternarQuebra() },
          { separador: true },
          { rotulo: 'Letra &proporcional', radio: true, marcado: !this.fixa, acao: () => this.definirFonte(false) },
          { rotulo: 'Letra de largura &fixa', radio: true, marcado: this.fixa, acao: () => this.definirFonte(true) },
        ],
      },
      {
        rotulo: '&Pesquisar', itens: [
          { rotulo: '&Localizar…', atalho: 'Ctrl+F', acao: () => this.localizar(true) },
          { rotulo: 'Localizar &próxima', atalho: 'F3', acao: () => this.localizar(false) },
        ],
      },
      {
        rotulo: 'A&juda', itens: [
          { rotulo: '&Sobre o Bloco de notas', acao: () => info('Bloco de notas\n\nTextos simples, gravados em UTF-8 no disco C:.\nAs versões anteriores ficam guardadas (botão direito no arquivo › Versões anteriores).', 'Sobre o Bloco de notas') },
        ],
      },
    ];
  }

  marcarSujo(v) {
    this.sujo = v;
    this.atualizarTitulo();
  }

  atualizarTitulo() {
    const nome = this.rel ? nomeDe(this.rel) : 'Sem título';
    this.j.definirTitulo(`${this.sujo ? '*' : ''}${nome} - Bloco de notas`);
  }

  teclas(e) {
    const ctrl = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (ctrl && k === 's') { e.preventDefault(); this.salvar(e.shiftKey); }
    else if (ctrl && k === 'o') { e.preventDefault(); this.abrir(); }
    else if (ctrl && k === 'n') { e.preventDefault(); this.novo(); }
    else if (ctrl && k === 'f') { e.preventDefault(); this.localizar(true); }
    else if (e.key === 'F3') { e.preventDefault(); this.localizar(false); }
    else if (e.key === 'F5') { e.preventDefault(); this.horaData(); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '\t');
    }
  }

  async podeFechar() {
    if (!this.sujo) return true;
    const r = await simNaoCancelar(`O texto do arquivo ${this.rel ? nomeDe(this.rel) : 'Sem título'} foi alterado.\n\nDeseja salvar as alterações?`, 'Bloco de notas');
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
    const rel = await caixaArquivo({ modo: 'abrir', pasta: this.rel ? paiDe(this.rel) : 'Meus documentos', tipos: TIPOS });
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
      erro(`Não foi possível abrir ${nomeDe(rel)}: ${e.message}`, 'Bloco de notas');
    }
  }

  async salvar(como = false) {
    let rel = this.rel;
    if (!rel || como) {
      rel = await caixaArquivo({ modo: 'salvar', pasta: this.rel ? paiDe(this.rel) : 'Meus documentos', nome: this.rel ? nomeDe(this.rel) : 'Sem título.txt', tipos: TIPOS });
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
      erro(`Não foi possível salvar ${nomeDe(rel)}: ${e.message}`, 'Bloco de notas');
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
      const t = await entrada({ titulo: 'Localizar', texto: 'Localizar:', valor: this.busca || this.texto.value.slice(this.texto.selectionStart, this.texto.selectionEnd) });
      if (!t) return;
      this.busca = t;
    }
    const v = this.texto.value.toLowerCase();
    const alvo = this.busca.toLowerCase();
    let i = v.indexOf(alvo, this.texto.selectionEnd);
    if (i < 0) i = v.indexOf(alvo);
    if (i < 0) {
      info(`Não foi possível localizar "${this.busca}".`, 'Bloco de notas');
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
