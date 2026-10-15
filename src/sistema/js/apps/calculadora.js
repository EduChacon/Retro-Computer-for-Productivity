/*
 * A Calculadora: a padrão da época (memória, porcentagem, raiz, 1/x), com o
 * teclado numérico e o separador decimal do idioma.
 */
import { h } from '../util.js';
import { Janela, lista as janelas } from '../janelas.js';
import { registrarApp } from '../sistema.js';
import { ajustarAoConteudo, info } from '../dialogos.js';
import { tr, localidade } from '../idioma.js';

const DIGITOS_MAX = 16;

/** O separador decimal do idioma (a vírgula em português e em espanhol). */
const decimal = () => (1.5).toLocaleString(localidade()).charAt(1);

/** Tira os restos do ponto flutuante (0,1 + 0,2 = 0,3). */
const arredondar = (v) => Number(v.toPrecision(15));

/** O número como aparece no visor. */
function formatar(v) {
  if (!Number.isFinite(v)) return tr('Entrada inválida.');
  const a = Math.abs(v);
  let s;
  if (a !== 0 && (a >= 1e16 || a < 1e-15)) s = v.toExponential(10).replace(/\.?0+e/, 'e');
  else s = String(arredondar(v));
  return s.replace('.', decimal());
}

/** A conta, separada da tela (para os testes). */
export class Conta {
  constructor() {
    this.zerar();
    this.memoria = 0;
  }

  zerar() {
    this.texto = '0';      // o que está no visor enquanto se digita
    this.acumulado = null; // o primeiro termo
    this.operador = null;
    this.novo = true;      // o próximo dígito começa um número novo
    this.repetir = null;   // [operador, valor] para o "=" repetido
    this.erro = null;
  }

  get valor() {
    return Number(this.texto.replace(decimal(), '.'));
  }

  mostrar(v) {
    if (!Number.isFinite(v)) return this.falhar(tr('Entrada inválida.'));
    this.texto = formatar(arredondar(v));
    this.novo = true;
  }

  falhar(msg) {
    this.zerar();
    this.erro = msg;
    this.texto = msg;
  }

  /** O que aparece no visor. */
  get visor() {
    return this.texto;
  }

  digito(d) {
    if (this.erro) this.zerar();
    if (this.novo) {
      this.texto = d;
      this.novo = false;
      if (!this.operador) this.repetir = null;
      return;
    }
    if (this.texto.replace(/[^0-9]/g, '').length >= DIGITOS_MAX) return;
    this.texto = this.texto === '0' ? d : this.texto + d;
  }

  virgula() {
    if (this.erro) this.zerar();
    if (this.novo) { this.texto = '0' + decimal(); this.novo = false; return; }
    if (!this.texto.includes(decimal())) this.texto += decimal();
  }

  apagar() {
    if (this.erro) return this.zerar();
    if (this.novo) return;
    this.texto = this.texto.length > 1 && !(this.texto.length === 2 && this.texto[0] === '-') ? this.texto.slice(0, -1) : '0';
  }

  limparEntrada() {
    if (this.erro) return this.zerar();
    this.texto = '0';
    this.novo = true;
  }

  static aplicar(a, op, b) {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b === 0 ? NaN : a / b;
      default: return b;
    }
  }

  calcularPendente() {
    if (this.operador == null || this.acumulado == null) return this.valor;
    if (this.operador === '/' && this.valor === 0) {
      this.falhar(tr('Não é possível dividir por zero.'));
      return null;
    }
    return arredondar(Conta.aplicar(this.acumulado, this.operador, this.valor));
  }

  operacao(op) {
    if (this.erro) return;
    let v = this.valor;
    if (this.operador && !this.novo) {
      v = this.calcularPendente();
      if (v == null) return;
      this.mostrar(v);
    }
    this.acumulado = v;
    this.operador = op;
    this.novo = true;
    this.repetir = null;
  }

  igual() {
    if (this.erro) return this.zerar();
    if (this.operador) {
      const b = this.valor;
      const v = this.calcularPendente();
      if (v == null) return;
      this.repetir = [this.operador, b];
      this.operador = null;
      this.acumulado = null;
      this.mostrar(v);
    } else if (this.repetir) {
      const [op, b] = this.repetir;
      if (op === '/' && b === 0) return this.falhar(tr('Não é possível dividir por zero.'));
      this.mostrar(Conta.aplicar(this.valor, op, b));
    }
  }

  /** A porcentagem, como nas calculadoras de mesa: 200 + 10 % = 220. */
  porcento() {
    if (this.erro) return;
    const base = this.acumulado == null ? 0 : this.acumulado;
    const v = (this.operador === '*' || this.operador === '/') ? this.valor / 100 : base * this.valor / 100;
    this.mostrar(v);
  }

  raiz() {
    if (this.erro) return;
    if (this.valor < 0) return this.falhar(tr('Entrada inválida.'));
    this.mostrar(Math.sqrt(this.valor));
  }

  inverso() {
    if (this.erro) return;
    if (this.valor === 0) return this.falhar(tr('Não é possível dividir por zero.'));
    this.mostrar(1 / this.valor);
  }

  sinal() {
    if (this.erro) return;
    if (this.texto === '0') return;
    this.texto = this.texto.startsWith('-') ? this.texto.slice(1) : '-' + this.texto;
  }

  memoriaLimpar() { this.memoria = 0; }
  memoriaLer() { if (!this.erro) this.mostrar(this.memoria); }
  memoriaGuardar() { if (!this.erro) { this.memoria = this.valor; this.novo = true; } }
  memoriaSomar() { if (!this.erro) { this.memoria = arredondar(this.memoria + this.valor); this.novo = true; } }

  /** Cola um número (aceita vírgula ou ponto e ignora os espaços). */
  colar(t) {
    const s = String(t || '').trim().replace(/\s/g, '');
    const m = s.match(/^-?\d+(?:[.,]\d+)?(?:e[+-]?\d+)?$/i);
    if (!m) return false;
    const v = Number(s.replace(',', '.'));
    if (!Number.isFinite(v)) return false;
    this.texto = formatar(v);
    this.novo = false;
    if (this.erro) this.erro = null;
    return true;
  }
}

class Calculadora {
  constructor() {
    this.c = new Conta();
    this.visor = h('div.calc-visor');
    this.marcaM = h('div.calc-m');
    this.j = new Janela({
      id: 'calculadora',
      titulo: tr('Calculadora'),
      icone: 'calculadora',
      largura: 260,
      altura: 240,
      redimensionavel: false,
      maximizavel: false,
      classe: 'calculadora',
      menus: [
        {
          rotulo: tr('&Editar'), itens: [
            { rotulo: tr('&Copiar'), atalho: 'Ctrl+C', acao: () => this.copiar() },
            { rotulo: tr('C&olar'), atalho: 'Ctrl+V', acao: () => this.colar() },
          ],
        },
        {
          rotulo: tr('A&juda'), itens: [
            { rotulo: tr('&Sobre a Calculadora'), acao: () => info(tr('Calculadora') + '\n\n' + tr('Teclas: os números, + - * /, Enter (=), Esc (C), Delete (CE), Backspace, % e F9 (±).'), tr('Sobre a Calculadora')) },
          ],
        },
      ],
    });
    const b = (rotulo, acao, cls = '', dica = '') => h('button.calc-b' + cls, { title: dica, tabIndex: -1, on: { click: () => { acao(); this.desenhar(); } } }, rotulo);
    const c = this.c;
    const d = (n) => b(n, () => c.digito(n), '.azul');
    const op = (s, o) => b(s, () => c.operacao(o), '.vermelho');
    const linha1 = h('div.calc-linha1',
      this.marcaM,
      b(tr('Backspace'), () => c.apagar(), '.vermelho.largo'),
      b('CE', () => c.limparEntrada(), '.vermelho.largo', tr('Limpa o número digitado')),
      b('C', () => c.zerar(), '.vermelho.largo', tr('Limpa a conta inteira')));
    const grade = h('div.calc-grade',
      b('MC', () => c.memoriaLimpar(), '.vermelho', tr('Limpa a memória')), d('7'), d('8'), d('9'), op('/', '/'), b('sqrt', () => c.raiz(), '.azul', tr('Raiz quadrada')),
      b('MR', () => c.memoriaLer(), '.vermelho', tr('Mostra o número da memória')), d('4'), d('5'), d('6'), op('*', '*'), b('%', () => c.porcento(), '.azul', tr('Porcentagem')),
      b('MS', () => c.memoriaGuardar(), '.vermelho', tr('Guarda o número na memória')), d('1'), d('2'), d('3'), op('-', '-'), b('1/x', () => c.inverso(), '.azul', tr('Inverso')),
      b('M+', () => c.memoriaSomar(), '.vermelho', tr('Soma o número à memória')), d('0'), b('+/-', () => c.sinal(), '.azul'), b(decimal(), () => c.virgula(), '.azul'), op('+', '+'), b('=', () => c.igual(), '.vermelho'));
    this.j.corpo.append(this.visor, linha1, grade);
    this.j.el.addEventListener('keydown', (e) => this.tecla(e));
    this.j.el.tabIndex = -1;
    this.j.ev.on('ativada', () => setTimeout(() => this.j.el.focus(), 0));
    this.j.ev.on('fechada', () => { janelaAberta = null; });
    this.desenhar();
    ajustarAoConteudo(this.j);
    this.j.el.focus();
  }

  desenhar() {
    this.visor.textContent = this.c.visor;
    this.marcaM.textContent = this.c.memoria ? 'M' : '';
  }

  tecla(e) {
    if (e.target.closest('.menubar')) return;
    const c = this.c;
    const k = e.key;
    const ctrl = e.ctrlKey || e.metaKey;
    let feito = true;
    if (ctrl && (k === 'c' || k === 'C')) this.copiar();
    else if (ctrl && (k === 'v' || k === 'V')) this.colar();
    else if (ctrl || e.altKey) feito = false;
    else if (/^[0-9]$/.test(k)) c.digito(k);
    else if (k === '.' || k === ',' || k === 'Decimal') c.virgula();
    else if (['+', '-', '*', '/'].includes(k)) c.operacao(k);
    else if (k === 'Enter' || k === '=') c.igual();
    else if (k === 'Escape') c.zerar();
    else if (k === 'Delete') c.limparEntrada();
    else if (k === 'Backspace') c.apagar();
    else if (k === '%') c.porcento();
    else if (k === 'F9') c.sinal();
    else if (k === 'r' || k === 'R') c.inverso();
    else if (k === '@') c.raiz();
    else feito = false;
    if (feito) {
      e.preventDefault();
      e.stopPropagation();
      this.desenhar();
    }
  }

  copiar() {
    navigator.clipboard.writeText(this.c.visor).catch(() => { });
  }

  async colar() {
    try {
      if (this.c.colar(await navigator.clipboard.readText())) this.desenhar();
    } catch { }
  }
}

let janelaAberta = null;

function abrirCalculadora() {
  if (janelaAberta && !janelaAberta.j.fechada) { janelaAberta.j.focar(); return janelaAberta; }
  janelaAberta = new Calculadora();
  return janelaAberta;
}

registrarApp('calculadora', { nome: 'Calculadora', icone: 'calculadora', abrir: abrirCalculadora });
export { janelas };
