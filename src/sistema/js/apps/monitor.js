/*
 * O Monitor do sistema (Ctrl+Shift+Esc): os programas abertos no Retro Computer, os processos
 * do computador e o desempenho (o processador e a memória, com os gráficos da época).
 * Finalizar um programa travado é o motivo de ele existir: no notebook que trava, é o
 * caminho para fechar o que parou de responder sem desligar tudo.
 */
import { h, img, tamanho } from '../util.js';
import { Janela, lista as janelas, eventos as eventosJanelas } from '../janelas.js';
import { registrarApp, abrir, estado, definirConfig } from '../sistema.js';
import { confirmar, erro, info } from '../dialogos.js';
import { tr, marcar, localidade } from '../idioma.js';

const RITMOS = { alta: 1000, normal: 2000, baixa: 4000, pausada: 0 };
const HISTORICO = 90;

const pct = (v) => (v == null ? '—' : `${Math.round(v).toLocaleString(localidade())}%`);

/** "3 h 25 min" (ou "2 dias, 4 h"). */
export function duracao(segundos) {
  const s = Math.max(0, Math.floor(segundos));
  const d = Math.floor(s / 86400);
  const hh = Math.floor((s % 86400) / 3600);
  const mm = Math.floor((s % 3600) / 60);
  if (d) return tr('{d} dia(s), {h} h', { d, h: hh });
  if (hh) return tr('{h} h {m} min', { h: hh, m: mm });
  return tr('{m} min', { m: mm });
}

/** Uma tabela da época: o cabeçalho clicável (ordena) e uma linha selecionada. */
class Tabela {
  constructor(colunas, { aoEscolher, aoAbrir, ordem = null } = {}) {
    this.colunas = colunas; // [{ id, rotulo, largura, numero, valor(linha), texto(linha) }]
    this.linhas = [];
    this.sel = null;
    this.ordem = ordem || { id: colunas[0].id, desc: false };
    this.aoEscolher = aoEscolher;
    this.aoAbrir = aoAbrir;
    this.cab = h('div.mon-cab');
    this.corpo = h('div.mon-corpo', { tabIndex: 0 });
    this.el = h('div.mon-tabela', this.cab, this.corpo);
    this.corpo.addEventListener('keydown', (e) => this.teclas(e));
    this.desenharCab();
  }

  desenharCab() {
    this.cab.replaceChildren(...this.colunas.map((c) => {
      const seta = this.ordem.id === c.id ? (this.ordem.desc ? ' ▼' : ' ▲') : '';
      const el = h('div', { style: { width: c.largura ? c.largura + 'px' : '', flex: c.largura ? 'none' : '1' }, class: c.numero ? 'numero' : '' }, c.rotulo + seta);
      el.addEventListener('click', () => {
        this.ordem = this.ordem.id === c.id ? { id: c.id, desc: !this.ordem.desc } : { id: c.id, desc: !!c.numero };
        this.desenharCab();
        this.desenhar(this.linhas);
      });
      return el;
    }));
  }

  desenhar(linhas) {
    const c = this.colunas.find((x) => x.id === this.ordem.id) || this.colunas[0];
    const v = c.valor || ((l) => l[c.id]);
    this.linhas = linhas.slice().sort((a, b) => {
      const x = v(a);
      const y = v(b);
      const r = typeof x === 'number' || typeof y === 'number' ? (x ?? -1) - (y ?? -1) : String(x).localeCompare(String(y), localidade(), { numeric: true, sensitivity: 'base' });
      return this.ordem.desc ? -r : r;
    });
    if (this.sel && !this.linhas.some((l) => l.chave === this.sel)) this.sel = null;
    const rolagem = this.corpo.scrollTop;
    this.corpo.replaceChildren(...this.linhas.map((l) => {
      const el = h('div.mon-linha' + (l.chave === this.sel ? '.sel' : '') + (l.apagada ? '.apagada' : ''),
        ...this.colunas.map((c2, i) => h('div', { style: { width: c2.largura ? c2.largura + 'px' : '', flex: c2.largura ? 'none' : '1' }, class: c2.numero ? 'numero' : '' },
          i === 0 && l.icone ? img(l.icone, 16) : null,
          h('span', (c2.texto || ((x) => String(x[c2.id] ?? '')))(l)))));
      el.addEventListener('mousedown', () => this.escolher(l.chave));
      el.addEventListener('dblclick', () => this.aoAbrir && this.aoAbrir(l));
      return el;
    }));
    this.corpo.scrollTop = rolagem;
  }

  escolher(chave) {
    this.sel = chave;
    for (const [i, el] of [...this.corpo.children].entries()) el.classList.toggle('sel', this.linhas[i].chave === chave);
    if (this.aoEscolher) this.aoEscolher(this.selecionada());
  }

  selecionada() {
    return this.linhas.find((l) => l.chave === this.sel) || null;
  }

  teclas(e) {
    const i = this.linhas.findIndex((l) => l.chave === this.sel);
    let n = null;
    if (e.key === 'ArrowDown') n = Math.min(this.linhas.length - 1, i + 1);
    else if (e.key === 'ArrowUp') n = Math.max(0, i - 1);
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = this.linhas.length - 1;
    else if (e.key === 'Enter' && this.aoAbrir && this.selecionada()) { this.aoAbrir(this.selecionada()); e.preventDefault(); return; }
    else return;
    e.preventDefault();
    if (this.linhas[n]) {
      this.escolher(this.linhas[n].chave);
      this.corpo.children[n].scrollIntoView({ block: 'nearest' });
    }
  }
}

/** O gráfico da época: a grade verde que corre e a linha do uso. */
function desenharGrafico(canvas, series, deslocamento) {
  // O gráfico ocupa a largura que sobrar: os pontos do desenho acompanham (sem esticar a grade).
  if (canvas.clientWidth && canvas.width !== canvas.clientWidth) canvas.width = canvas.clientWidth;
  const g = canvas.getContext('2d');
  const W = canvas.width;
  const A = canvas.height;
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, A);
  g.strokeStyle = '#008040';
  g.lineWidth = 1;
  g.beginPath();
  for (let x = W - (deslocamento % 12) - 0.5; x > 0; x -= 12) { g.moveTo(x, 0); g.lineTo(x, A); }
  for (let y = A - 0.5; y > 0; y -= 12) { g.moveTo(0, y); g.lineTo(W, y); }
  g.stroke();
  for (const { valores, cor } of series) {
    g.strokeStyle = cor;
    g.beginPath();
    const passo = W / (HISTORICO - 1);
    valores.forEach((v, i) => {
      const x = W - (valores.length - 1 - i) * passo;
      const y = A - 1 - (Math.max(0, Math.min(100, v)) / 100) * (A - 2);
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    });
    g.stroke();
  }
}

/** O medidor de barras (como o da época) com a porcentagem embaixo. */
function desenharMedidor(canvas, valor, cor, texto) {
  const g = canvas.getContext('2d');
  const W = canvas.width;
  const A = canvas.height;
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, A);
  const blocos = 18;
  const altBloco = Math.floor((A - 18) / blocos);
  const acesos = Math.round((Math.max(0, Math.min(100, valor)) / 100) * blocos);
  for (let i = 0; i < blocos; i++) {
    g.fillStyle = i < acesos ? cor : '#004020';
    const y = A - 18 - (i + 1) * altBloco + 1;
    g.fillRect(10, y, W / 2 - 12, altBloco - 1);
    g.fillRect(W / 2 + 2, y, W / 2 - 12, altBloco - 1);
  }
  g.fillStyle = cor;
  g.font = '11px sans-serif';
  g.textAlign = 'center';
  g.fillText(texto, W / 2, A - 5);
}

class MonitorSistema {
  constructor({ aba = 0 } = {}) {
    const cfg = estado.config.monitor || {};
    this.ritmo = cfg.ritmo in RITMOS ? cfg.ritmo : 'normal';
    this.todos = !!cfg.todos;
    this.cpu = [];
    this.mem = [];
    this.passos = 0;
    this.ultima = null;
    this.j = new Janela({
      titulo: tr('Monitor do sistema'),
      icone: 'monitor',
      largura: 500,
      altura: 450,
      classe: 'monitor',
      menus: this.menus(),
      status: [{ texto: '', largura: 110, fixo: true }, { texto: '', largura: 110, fixo: true }, ''],
    });
    this.montarProgramas();
    this.montarProcessos();
    this.montarDesempenho();
    this.abasEl = h('div.abas');
    this.paineis = [this.pProgramas, this.pProcessos, this.pDesempenho];
    this.j.corpo.append(this.abasEl, h('div.mon-paineis', ...this.paineis));
    this.mostrarAba(aba);
    const largar = eventosJanelas.on('mudou', () => this.atualizarProgramas());
    this.j.ev.on('fechada', () => { clearInterval(this.relogio); largar(); this.fechada = true; });
    this.iniciar();
  }

  menus() {
    return [
      {
        rotulo: tr('&Arquivo'), itens: () => [
          { rotulo: tr('&Novo programa…'), acao: () => abrir('executar') },
          { separador: true },
          { rotulo: tr('Sai&r'), acao: () => this.j.fechar() },
        ],
      },
      {
        rotulo: tr('E&xibir'), itens: () => [
          { rotulo: tr('&Atualizar agora'), atalho: 'F5', acao: () => this.tique(true) },
          {
            rotulo: tr('&Velocidade de atualização'), sub: () => [
              ['alta', tr('&Alta')], ['normal', tr('&Normal')], ['baixa', tr('&Baixa')], ['pausada', tr('&Pausada')],
            ].map(([id, r]) => ({ rotulo: r, radio: true, marcado: this.ritmo === id, acao: () => this.definirRitmo(id) })),
          },
        ],
      },
      {
        rotulo: tr('A&juda'), itens: [
          { rotulo: tr('&Sobre o Monitor do sistema'), acao: () => info(tr('Monitor do sistema') + '\n\n' + tr('Mostra os programas abertos, os processos do computador e o uso do processador e da memória. Um programa que parou de responder pode ser finalizado por aqui.\nAtalho: Ctrl+Shift+Esc.'), tr('Sobre o Monitor do sistema')) },
        ],
      },
    ];
  }

  mostrarAba(i) {
    this.aba = i;
    const nomes = [tr('Programas'), tr('Processos'), tr('Desempenho')];
    this.abasEl.replaceChildren(...nomes.map((t, k) => {
      const el = h('div' + (k === i ? '.ativa' : ''), t);
      el.addEventListener('mousedown', () => this.mostrarAba(k));
      return el;
    }));
    this.paineis.forEach((p, k) => { p.hidden = k !== i; });
    if (i === 0) this.atualizarProgramas();
    if (i === 1) this.atualizarProcessos();
    if (i === 2) this.desenharDesempenho();
  }

  /* ---------- Programas (as janelas do Retro Computer) ---------- */

  montarProgramas() {
    this.tProgramas = new Tabela([
      { id: 'nome', rotulo: tr('Programa') },
      { id: 'situacao', rotulo: tr('Situação'), largura: 110 },
    ], { aoAbrir: (l) => this.alternarPara(l), aoEscolher: () => this.botoesProgramas() });
    this.btFinalizarTarefa = h('button', { type: 'button', on: { click: () => this.finalizarTarefa() } }, tr('Finalizar tarefa'));
    this.btAlternar = h('button', { type: 'button', on: { click: () => this.alternarPara(this.tProgramas.selecionada()) } }, tr('Alternar para'));
    const btNovo = h('button', { type: 'button', on: { click: () => abrir('executar') } }, tr('Novo programa…'));
    this.pProgramas = h('div.painel-aba.mon-painel', this.tProgramas.el, h('div.acoes.direita', this.btFinalizarTarefa, this.btAlternar, btNovo));
  }

  atualizarProgramas() {
    if (this.fechada) return;
    const linhas = janelas
      .filter((j) => !j.dialogo && !j.fechada && j !== this.j)
      .map((j, i) => ({ chave: 'j' + i + ':' + (j.o.id || '') + ':' + j.titulo, nome: j.titulo || '', situacao: j.minimizada ? tr('Minimizado') : tr('Em execução'), icone: j.icone || 'programa', janela: j }));
    // A chave precisa ser estável entre as atualizações: a própria janela.
    for (const l of linhas) l.chave = l.janela;
    this.tProgramas.desenhar(linhas);
    this.botoesProgramas();
  }

  botoesProgramas() {
    const tem = !!this.tProgramas.selecionada();
    this.btFinalizarTarefa.disabled = !tem;
    this.btAlternar.disabled = !tem;
  }

  alternarPara(l) {
    if (l && l.janela && !l.janela.fechada) l.janela.focar();
  }

  async finalizarTarefa() {
    const l = this.tProgramas.selecionada();
    if (!l || l.janela.fechada) return;
    // Fecha do jeito normal: se houver algo por salvar, o programa pergunta.
    await l.janela.fechar();
    this.atualizarProgramas();
  }

  /* ---------- Processos (os do computador) ---------- */

  montarProcessos() {
    this.tProcessos = new Tabela([
      { id: 'nome', rotulo: tr('Nome') },
      { id: 'pid', rotulo: 'PID', largura: 56, numero: true },
      { id: 'usuario', rotulo: tr('Usuário'), largura: 70 },
      { id: 'cpu', rotulo: 'CPU', largura: 46, numero: true, texto: (l) => (l.cpu == null ? '—' : pct(l.cpu)) },
      { id: 'memoria', rotulo: tr('Memória'), largura: 76, numero: true, texto: (l) => tamanho(l.memoria) },
    ], { ordem: { id: 'cpu', desc: true }, aoEscolher: () => this.botoesProcessos() });
    this.chkTodos = h('input', { type: 'checkbox', checked: this.todos, on: { change: () => { this.todos = this.chkTodos.checked; this.guardar(); this.atualizarProcessos(); } } });
    this.btFinalizarProc = h('button', { type: 'button', on: { click: () => this.finalizarProcesso() } }, tr('Finalizar processo'));
    this.pProcessos = h('div.painel-aba.mon-painel', this.tProcessos.el,
      h('div.mon-rodape', h('label', this.chkTodos, tr('Mostrar os processos de todos os usuários')), this.btFinalizarProc));
  }

  async atualizarProcessos() {
    if (this.buscandoProc || this.fechada) return;
    this.buscandoProc = true;
    try {
      const lista = await retro.monitor.processos().catch(() => []);
      this.processos = lista;
      const visiveis = lista.filter((p) => this.todos || p.meu);
      this.tProcessos.desenhar(visiveis.map((p) => ({ ...p, chave: p.pid, icone: p.doRetro ? 'logo' : 'programa', apagada: !p.meu || p.doRetro })));
      this.botoesProcessos();
      this.atualizarStatus();
    } finally {
      this.buscandoProc = false;
    }
  }

  botoesProcessos() {
    const p = this.tProcessos.selecionada();
    this.btFinalizarProc.disabled = !p || !p.meu || p.doRetro;
  }

  async finalizarProcesso() {
    const p = this.tProcessos.selecionada();
    if (!p || !p.meu || p.doRetro) return;
    const ok = await confirmar(tr('Finalizar o processo {nome} (PID {pid})?\n\nO que não foi salvo nele será perdido.', { nome: p.nome, pid: p.pid }), { titulo: tr('Monitor do sistema'), sim: tr('&Finalizar'), nao: tr('Cancelar'), tipo: 'aviso' });
    if (!ok) return;
    let r = await retro.monitor.finalizar(p.pid, false);
    if (!r.ok && r.erro !== 'acabou') return erro(this.erroFinalizar(r.erro, p));
    // Dá um tempo para ele fechar sozinho; se não fechar, pergunta se força.
    await new Promise((res) => setTimeout(res, 2500));
    await this.atualizarProcessos();
    if ((this.processos || []).some((x) => x.pid === p.pid)) {
      const forcar = await confirmar(tr('{nome} não fechou. Forçar o fechamento?', { nome: p.nome }), { titulo: tr('Monitor do sistema'), sim: tr('&Forçar'), nao: tr('Cancelar'), tipo: 'aviso' });
      if (!forcar) return;
      r = await retro.monitor.finalizar(p.pid, true);
      if (!r.ok && r.erro !== 'acabou') return erro(this.erroFinalizar(r.erro, p));
      setTimeout(() => this.atualizarProcessos(), 800);
    }
  }

  erroFinalizar(cod, p) {
    if (cod === 'permissao') return tr('{nome} é de outro usuário ou do sistema e não pode ser finalizado por aqui.', { nome: p.nome });
    if (cod === 'protegido') return tr('{nome} faz parte do Retro Computer e não pode ser finalizado por aqui.', { nome: p.nome });
    return tr('Não foi possível finalizar {nome}: {erro}', { nome: p.nome, erro: cod });
  }

  /* ---------- Desempenho ---------- */

  montarDesempenho() {
    const quadro = (titulo, ...filhos) => h('fieldset.mon-quadro', h('legend', titulo), ...filhos);
    this.medCpu = h('canvas.mon-medidor', { width: 70, height: 84 });
    this.medMem = h('canvas.mon-medidor', { width: 70, height: 84 });
    this.grafCpu = h('canvas.mon-grafico', { width: 300, height: 84 });
    this.grafMem = h('canvas.mon-grafico', { width: 300, height: 84 });
    this.totais = h('div.mon-totais');
    this.pDesempenho = h('div.painel-aba.mon-painel.mon-desempenho',
      h('div.mon-linha-graficos', quadro(tr('Uso da CPU'), this.medCpu), quadro(tr('Histórico do uso da CPU'), this.grafCpu)),
      h('div.mon-linha-graficos', quadro(tr('Uso da memória'), this.medMem), quadro(tr('Histórico do uso da memória'), this.grafMem)),
      quadro(tr('Totais'), this.totais));
  }

  desenharDesempenho() {
    const a = this.ultima;
    if (!a || this.aba !== 2) return;
    const memPct = (a.memoria.emUso / a.memoria.total) * 100;
    desenharMedidor(this.medCpu, a.cpu, '#00ff00', pct(a.cpu));
    desenharMedidor(this.medMem, memPct, '#ffff00', tamanho(a.memoria.emUso));
    desenharGrafico(this.grafCpu, [{ valores: this.cpu, cor: '#00ff00' }], this.passos * 4);
    desenharGrafico(this.grafMem, [{ valores: this.mem, cor: '#ffff00' }], this.passos * 4);
    const linha = (r, v) => h('div', h('span', r), h('b', v));
    this.totais.replaceChildren(
      // Duas colunas: a memória e o computador; o Retro Computer e o tempo ligado.
      linha(tr('Memória total'), tamanho(a.memoria.total)),
      linha(tr('Memória em uso'), tamanho(a.memoria.emUso)),
      linha(tr('Memória disponível'), tamanho(a.memoria.total - a.memoria.emUso)),
      linha(tr('Processadores'), String(a.nucleos)),
      linha(tr('Retro Computer (processador)'), pct(a.retro.cpu)),
      linha(tr('Retro Computer (memória)'), tamanho(a.retro.memoria)),
      linha(tr('Ligado há'), duracao(a.ligadoHa)),
    );
    this.totais.title = a.modelo;
  }

  /* ---------- O relógio ---------- */

  iniciar() {
    clearInterval(this.relogio);
    this.tique(true);
    const ms = RITMOS[this.ritmo];
    if (ms) this.relogio = setInterval(() => this.tique(false), ms);
  }

  async tique(forcado) {
    if (this.fechada) return;
    try {
      const a = await retro.monitor.amostra();
      this.ultima = a;
      this.passos++;
      this.cpu = [...this.cpu, a.cpu].slice(-HISTORICO);
      this.mem = [...this.mem, (a.memoria.emUso / a.memoria.total) * 100].slice(-HISTORICO);
      this.desenharDesempenho();
      this.atualizarStatus();
      // Os processos custam mais (o "ps"): só com a aba à vista, a cada dois tiques.
      if (this.aba === 1 && (forcado || this.passos % 2 === 0)) this.atualizarProcessos();
    } catch { }
  }

  atualizarStatus() {
    const a = this.ultima;
    if (!a) return;
    this.j.definirStatus([
      { texto: tr('Processos: {n}', { n: this.processos ? this.processos.length : '—' }), largura: 110, fixo: true },
      { texto: tr('Uso da CPU: {v}', { v: pct(a.cpu) }), largura: 110, fixo: true },
      tr('Memória: {usada} de {total}', { usada: tamanho(a.memoria.emUso), total: tamanho(a.memoria.total) }),
    ]);
  }

  definirRitmo(id) {
    this.ritmo = id;
    this.guardar();
    this.iniciar();
  }

  guardar() {
    definirConfig({ monitor: { ritmo: this.ritmo, todos: this.todos } }).catch(() => { });
  }
}

let aberto = null;
function abrirMonitor(args = {}) {
  if (aberto && !aberto.j.fechada) {
    aberto.j.focar();
    if (args.aba != null) aberto.mostrarAba(args.aba);
    return aberto;
  }
  aberto = new MonitorSistema(args);
  aberto.j.el.addEventListener('keydown', (e) => { if (e.key === 'F5') { e.preventDefault(); aberto.tique(true); } });
  return aberto;
}

registrarApp('monitor', { nome: marcar('Monitor do sistema'), icone: 'monitor', abrir: abrirMonitor });
