/* Um caderno de programação, com o editor e o resultado na mesma janela. */
import { h, nomeDe, paiDe } from '../util.js';
import { Janela } from '../janelas.js';
import { registrarApp, pastaDocs, adicionarRecente, abrir as abrirApp } from '../sistema.js';
import { caixaArquivo, simNaoCancelar, erro, info } from '../dialogos.js';
import { tr, marcar } from '../idioma.js';
import { licoesC } from './licoes-c.js';
import { linguagens } from './linguagens.js';

const EXTENSOES = ['c', 'cpp', 'cc', 'cxx', 'cs', 'py', 'rs', 'java'];
const TIPOS = [{ rotulo: marcar('Código-fonte'), exts: EXTENSOES }];
let atual = null;

class Laboratorio {
  constructor({ arquivo } = {}) {
    this.rel = null;
    this.sujo = false;
    this.ocupado = false;
    this.licoes = licoesC();
    this.linguagens = linguagens(); this.linguagem = 'c';
    this.linguagemEl = h('select.c-linguagem', { 'aria-label': tr('Linguagem'), on: { change: () => this.trocarLinguagem(this.linguagemEl.value) } }, Object.entries(this.linguagens).map(([id, l]) => h('option', { value: id }, l.nome)));
    this.editor = h('textarea.c-editor', { spellcheck: false, wrap: 'off', 'aria-label': tr('Código-fonte'), maxLength: 262144 });
    this.entrada = h('textarea.c-entrada', { spellcheck: false, 'aria-label': tr('Entrada do programa'), maxLength: 262144 });
    this.saida = h('pre.c-saida', { tabIndex: 0, 'aria-label': tr('Saída e erros'), 'aria-live': 'polite' });
    this.guia = h('p.c-guia');
    this.status = h('div.statusbar', tr('Escolha uma linguagem, uma lição ou abra seu código.'));
    this.seletor = h('select', { 'aria-label': tr('Lições de C'), on: { change: () => this.licao(Number(this.seletor.value)) } }, this.licoes.map((l, i) => h('option', { value: String(i) }, l.nome)));
    this.executarBt = h('button', { on: { click: () => this.executar() } }, tr('Compilar e executar (F5)'));
    this.pararBt = h('button', { disabled: true, on: { click: () => retro.laboratorio.parar() } }, tr('Parar'));
    const novo = h('button', { on: { click: () => this.novo() } }, tr('Novo'));
    const abrirBt = h('button', { on: { click: () => this.abrir() } }, tr('Abrir…'));
    const salvar = h('button', { on: { click: () => this.salvar() } }, tr('Salvar'));
    this.trocas = [novo, abrirBt, this.seletor, this.linguagemEl];
    this.j = new Janela({ titulo: tr('Laboratório de programação'), icone: 'codigo', largura: 760, altura: 580, classe: 'laboratorio', aoFechar: () => this.podeFechar() });
    this.j.corpo.append(
      h('div.c-ferramentas', novo, abrirBt, salvar, this.executarBt, this.pararBt, h('button', { on: { click: () => this.preparar() } }, tr('Preparar linguagem')),
        h('button', { on: { click: () => abrirApp('assistente', { pedido: tr('Me ajude a entender este código. Explique os erros e dê pistas, sem resolver tudo por mim.'), contexto: this.editor.value.slice(0, 64000) }) } }, tr('Pedir ajuda'))),
      h('div.c-licoes', h('label', tr('Linguagem: '), this.linguagemEl), h('label.c-licao', tr('Lição: '), this.seletor), this.guia),
      this.editor,
      h('div.c-resultados', h('label', tr('Entrada do programa'), this.entrada), h('div', h('b', tr('Saída e erros')), this.saida)),
      h('p.c-nota', tr('Os programas rodam no seu computador, com as suas permissões. Execute apenas código em que confia.')),
      this.status,
    );
    this.editor.addEventListener('input', () => { this.sujo = true; this.titulo(); });
    this.j.corpo.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); this.salvar(e.shiftKey); }
      if (e.key === 'F5') { e.preventDefault(); this.executar(); }
      if (e.key === 'Tab' && e.target === this.editor) { e.preventDefault(); document.execCommand('insertText', false, '    '); }
    });
    this.j.ev.on('fechada', () => { atual = null; });
    this.j.reabrir = () => this.rel ? { arquivo: this.rel } : {};
    if (arquivo) this.abrirRel(arquivo);
    else this.carregarLicao(0);
  }

  titulo() { this.j.definirTitulo(`${this.sujo ? '*' : ''}${this.rel ? nomeDe(this.rel) : tr('Sem título')} - ${tr('Laboratório de programação')}`); }

  carregarLicao(i) {
    const l = this.licoes[i];
    this.seletor.value = String(i); this.indice = i;
    this.editor.value = l.codigo; this.entrada.value = l.entrada; this.guia.textContent = l.texto;
    this.rel = null; this.sujo = false; this.saida.textContent = ''; this.titulo(); this.editor.focus();
  }

  definirLinguagem(id) {
    this.linguagem = id; this.linguagemEl.value = id;
    this.j.corpo.querySelector('.c-licao').hidden = id !== 'c';
  }

  carregarExemplo() {
    const l = this.linguagens[this.linguagem];
    this.editor.value = l.exemplo; this.entrada.value = l.entrada || '';
    this.guia.textContent = l.guia; this.rel = null; this.sujo = false;
    this.saida.textContent = ''; this.titulo();
  }

  async trocarLinguagem(id) {
    if (this.ocupado || !(await this.podeFechar())) { this.linguagemEl.value = this.linguagem; return; }
    this.definirLinguagem(id);
    if (id === 'c') this.carregarLicao(0); else this.carregarExemplo();
  }

  async licao(i) {
    if (this.ocupado || !(await this.podeFechar())) { this.seletor.value = String(this.indice); return; }
    this.carregarLicao(i);
  }

  async novo() {
    if (this.ocupado || !(await this.podeFechar())) return;
    this.carregarExemplo();
    this.guia.textContent = tr('Programa livre: escreva seu código e pressione F5.');
  }

  async podeFechar() {
    if (this.ocupado) { await info(tr('Pare o programa antes de fechar ou trocar o arquivo.'), tr('Laboratório de programação')); return false; }
    if (!this.sujo) return true;
    const r = await simNaoCancelar(tr('Deseja salvar as alterações no código?'), tr('Laboratório de programação'));
    return r === 'sim' ? this.salvar() : r !== null;
  }

  async abrir() {
    if (this.ocupado || !(await this.podeFechar())) return;
    const rel = await caixaArquivo({ modo: 'abrir', pasta: this.rel ? paiDe(this.rel) : pastaDocs(), tipos: TIPOS });
    if (rel) await this.abrirRel(rel);
  }

  async abrirRel(rel) {
    try {
      const t = await retro.disco.lerTexto(rel);
      if (new TextEncoder().encode(t).length > 262144) throw new Error(tr('O código deve ter no máximo 256 KiB.'));
      const ext = rel.split('.').pop().toLowerCase();
      this.definirLinguagem(({ c: 'c', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', cs: 'csharp', py: 'python', rs: 'rust', java: 'java' })[ext] || 'c');
      this.editor.value = t; this.rel = rel; this.sujo = false; this.titulo();
      this.guia.textContent = tr('Programa livre: escreva seu código e pressione F5.');
      this.saida.textContent = ''; this.entrada.value = ''; adicionarRecente(rel);
    } catch (e) { erro(e.message, tr('Laboratório de programação')); }
  }

  async salvar(como = false) {
    let rel = this.rel;
    if (!rel || como) rel = await caixaArquivo({ modo: 'salvar', pasta: rel ? paiDe(rel) : pastaDocs(), nome: rel ? nomeDe(rel) : (this.linguagens[this.linguagem].arquivo || 'programa.' + this.linguagens[this.linguagem].extensao), tipos: [{ rotulo: tr('Código-fonte'), exts: [this.linguagens[this.linguagem].extensao] }, ...TIPOS] });
    if (!rel) return false;
    try {
      const texto = this.editor.value;
      await retro.disco.gravar(rel, new TextEncoder().encode(texto));
      this.rel = rel; this.sujo = this.editor.value !== texto; this.titulo(); adicionarRecente(rel); return true;
    } catch (e) { erro(e.message, tr('Laboratório de programação')); return false; }
  }

  async preparar() {
    try {
      const c = await retro.laboratorio.detectar(this.linguagem);
      info((c ? tr('Ferramenta encontrada: {versao}', { versao: c.versao }) : tr('Ferramenta não encontrada.')) + '\n\n' + this.linguagens[this.linguagem].preparo, tr('Preparar linguagem'));
    } catch (e) { erro(e.message, tr('Laboratório de programação')); }
  }

  async executar() {
    if (this.ocupado) return;
    this.ocupado = true; this.executarBt.disabled = true; this.pararBt.disabled = false;
    this.trocas.forEach((b) => { b.disabled = true; });
    this.status.textContent = tr('Compilando e executando…'); this.saida.textContent = '';
    try {
      const r = await retro.laboratorio.executar({ codigo: this.editor.value, entrada: this.entrada.value, linguagem: this.linguagem });
      this.saida.textContent = (r.avisos || '') + r.saida;
      if (r.motivo === 'tempo') this.status.textContent = tr('Tempo esgotado. Verifique se há uma repetição sem fim.');
      else if (r.motivo === 'saida') this.status.textContent = tr('Programa interrompido: a saída passou de 64 KiB.');
      else if (r.motivo === 'cancelado') this.status.textContent = tr('Programa interrompido.');
      else if (r.etapa === 'compilar') this.status.textContent = tr('Não compilou. Confira a linha indicada na mensagem acima.');
      else this.status.textContent = tr('Programa encerrado. Código de saída: {codigo}.', { codigo: r.codigo ?? r.sinal });
    } catch (e) { this.saida.textContent = e.message; this.status.textContent = tr('Abra Preparar linguagem se precisar de ajuda.'); }
    finally {
      this.ocupado = false; this.executarBt.disabled = false; this.pararBt.disabled = true;
      this.trocas.forEach((b) => { b.disabled = false; });
    }
  }
}

registrarApp('laboratorio', { nome: 'Laboratório de programação', icone: 'codigo', tipos: EXTENSOES, abrir: async (args = {}) => {
  if (atual && !atual.j.fechada) {
    atual.j.focar();
    if (args.arquivo && await atual.podeFechar()) await atual.abrirRel(args.arquivo);
    return atual.j;
  }
  atual = new Laboratorio(args); return atual.j;
} });
