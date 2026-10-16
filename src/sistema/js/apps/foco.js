/*
 * Foco: o relógio Pomodoro (blocos de trabalho com pausas), o cronômetro (com as voltas) e o
 * temporizador. Os três continuam contando com a janela fechada; o tempo do Pomodoro (ou, sem
 * ele, o do temporizador) aparece na bandeja, ao lado do relógio.
 */
import { h, img } from '../util.js';
import { Janela, lista as janelas, minimizarTodas } from '../janelas.js';
import { registrarApp, estado, definirConfig, avisar, eventos } from '../sistema.js';
import { ajustarAoConteudo } from '../dialogos.js';
import { tocar } from '../sons.js';
import { tr, localidade } from '../idioma.js';

const F = {
  fase: 'foco',      // foco | pausa | longa
  rodando: false,
  fim: 0,            // quando a fase acaba (ms)
  resta: 0,          // ms que faltam (pausado)
  ciclo: 1,          // qual foco do ciclo (1 a 4)
  hoje: 0,
  dia: new Date().toDateString(),
};
let timer = null;
let janela = null;

// O cronômetro: o tempo somado (enquanto parado) e o começo da corrida atual; as voltas.
const C = { rodando: false, inicio: 0, acumulado: 0, voltas: [] };
// O temporizador: quando acaba (correndo) ou quanto falta (parado), e o total escolhido.
const T = { rodando: false, fim: 0, resta: 0, total: 5 * 60000 };

const decimal = () => (1.5).toLocaleString(localidade()).charAt(1);
/** 3725400 → "01:02:05,4" (as horas, os minutos, os segundos e o décimo). */
export function hhmmss(ms, decimos = true) {
  const d = Math.floor(Math.max(0, ms) / 100);
  const s = Math.floor(d / 10);
  const p = (n) => String(n).padStart(2, '0');
  const base = `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
  return decimos ? base + decimal() + (d % 10) : base;
}

const valorCronometro = () => C.acumulado + (C.rodando ? Date.now() - C.inicio : 0);
const restaTemporizador = () => (T.rodando ? Math.max(0, T.fim - Date.now()) : T.resta || T.total);

function cronometroAlternar() {
  if (C.rodando) { C.acumulado = valorCronometro(); C.rodando = false; }
  else { C.inicio = Date.now(); C.rodando = true; }
}
function cronometroVolta() {
  if (!C.rodando && !C.acumulado) return;
  const agora = valorCronometro();
  const anterior = C.voltas.length ? C.voltas[0].total : 0;
  C.voltas.unshift({ n: C.voltas.length + 1, total: agora, parcial: agora - anterior });
}
function cronometroZerar() {
  C.rodando = false;
  C.acumulado = 0;
  C.voltas = [];
}

function temporizadorIniciar(total) {
  if (total) { T.total = total; T.resta = 0; }
  if (T.rodando) return;
  T.fim = Date.now() + (T.resta || T.total);
  T.resta = 0;
  T.rodando = true;
  if (!timer) timer = setInterval(tique, 250);
  tique();
}
function temporizadorPausar() {
  if (!T.rodando) return;
  T.resta = Math.max(0, T.fim - Date.now());
  T.rodando = false;
  tique();
}
function temporizadorZerar() {
  T.rodando = false;
  T.resta = 0;
  tique();
}

function cfg() {
  const c = (estado.config && estado.config.foco) || {};
  return { minutos: c.minutos || 25, pausa: c.pausa || 5, longa: c.longa || 15, ciclo: c.ciclo || 4, minimizar: !!c.minimizar, silencio: c.silencio !== false, semJogos: !!c.semJogos };
}

function duracao(fase) {
  const c = cfg();
  return (fase === 'foco' ? c.minutos : fase === 'pausa' ? c.pausa : c.longa) * 60000;
}

function restante() {
  return F.rodando ? Math.max(0, F.fim - Date.now()) : (F.resta || duracao(F.fase));
}

const mmss = (ms) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

function nomeFase() {
  if (F.fase === 'foco') return tr('Foco {n} de {total}', { n: F.ciclo, total: cfg().ciclo });
  return F.fase === 'pausa' ? tr('Pausa curta') : tr('Pausa longa');
}

function avisarBarra() {
  const pomodoro = F.rodando || F.resta > 0;
  const temporizador = T.rodando || T.resta > 0;
  if (!pomodoro && temporizador) return eventos.emit('foco', { ativo: true, texto: mmss(restaTemporizador()), fase: tr('Temporizador') });
  eventos.emit('foco', { ativo: pomodoro, texto: mmss(restante()), fase: nomeFase() });
}

/**
 * O modo foco completo: durante um bloco de foco (não nas pausas), o "Não perturbe" (os avisos
 * esperam no sino) e os jogos deixados para a pausa. Fica só na memória: ao fechar, acaba.
 */
function modoFoco() {
  const c = cfg();
  const novo = F.rodando && F.fase === 'foco' && (c.silencio || c.semJogos) ? { silencio: c.silencio, semJogos: c.semJogos, fim: F.fim } : null;
  if (JSON.stringify(novo) === JSON.stringify(estado.emFoco)) return;
  estado.emFoco = novo;
  eventos.emit('modoFoco', novo);
}

function tique() {
  if (new Date().toDateString() !== F.dia) { F.dia = new Date().toDateString(); F.hoje = 0; }
  if (F.rodando && Date.now() >= F.fim) terminouFase();
  if (T.rodando && Date.now() >= T.fim) terminouTemporizador();
  modoFoco();
  avisarBarra();
  if (janela) janela.atualizar();
}

function terminouTemporizador() {
  T.rodando = false;
  T.resta = 0;
  tocar('foco');
  avisar(tr('Temporizador'), tr('O tempo de {tempo} acabou.', { tempo: hhmmss(T.total, false) }), { icone: 'foco', som: null, ms: 15000, aoClicar: () => abrirFoco({ aba: 2 }) });
  if (janela) janela.piscarTempo();
}

function iniciar() {
  if (F.rodando) return;
  F.fim = Date.now() + (F.resta || duracao(F.fase));
  F.resta = 0;
  F.rodando = true;
  if (F.fase === 'foco' && cfg().minimizar) minimizarTodas();
  if (!timer) timer = setInterval(tique, 250);
  tique();
}

function pausar() {
  if (!F.rodando) return;
  F.resta = Math.max(0, F.fim - Date.now());
  F.rodando = false;
  tique();
}

function zerar() {
  F.rodando = false;
  F.resta = 0;
  F.fase = 'foco';
  F.ciclo = 1;
  tique();
}

function pular() {
  const rodava = F.rodando;
  proximaFase();
  F.resta = 0;
  F.rodando = false;
  if (rodava) iniciar(); else tique();
}

function proximaFase() {
  const c = cfg();
  if (F.fase === 'foco') {
    F.fase = F.ciclo >= c.ciclo ? 'longa' : 'pausa';
  } else {
    if (F.fase === 'longa') F.ciclo = 1; else F.ciclo += 1;
    F.fase = 'foco';
  }
}

function terminouFase() {
  const eraFoco = F.fase === 'foco';
  if (eraFoco) {
    F.hoje++;
    retro.diario.anotar(tr('Foco concluído ({n} minutos)', { n: cfg().minutos })).catch(() => { });
  }
  proximaFase();
  F.rodando = false;
  F.resta = 0;
  // O aviso do fim do foco aparece: o "Não perturbe" do bloco acaba antes dele.
  modoFoco();
  tocar('foco');
  avisar(eraFoco ? tr('Fim do foco!') : tr('Fim da pausa'), eraFoco ? (F.fase === 'longa' ? tr('Bom trabalho. Hora de uma pausa longa.') : tr('Bom trabalho. Hora de uma pausa curta.')) : tr('Hora de voltar ao trabalho.'), { icone: 'foco', som: null, ms: 12000, aoClicar: () => abrirFoco() });
  // A próxima fase começa sozinha.
  iniciar();
}

class JanelaFoco {
  constructor({ aba } = {}) {
    this.j = new Janela({ id: 'foco', titulo: tr('Foco'), icone: 'foco', largura: 320, altura: 300, redimensionavel: false, maximizavel: false });
    this.tempo = h('div.foco-relogio');
    this.fase = h('div.foco-fase');
    this.hoje = h('div', { style: { textAlign: 'center', color: '#808080', marginTop: '4px' } });
    this.btIniciar = h('button.padrao', { on: { click: () => (F.rodando ? pausar() : iniciar()) } });
    const c = cfg();
    const num = (v, min, max) => h('input', { type: 'number', value: v, min, max, style: { width: '46px' } });
    this.cMin = num(c.minutos, 1, 180);
    this.cPausa = num(c.pausa, 1, 60);
    this.cLonga = num(c.longa, 1, 90);
    this.cMinimizar = h('input', { type: 'checkbox', checked: c.minimizar });
    this.cSilencio = h('input', { type: 'checkbox', checked: c.silencio });
    this.cSemJogos = h('input', { type: 'checkbox', checked: c.semJogos });
    const salvar = () => definirConfig({ foco: { minutos: +this.cMin.value || 25, pausa: +this.cPausa.value || 5, longa: +this.cLonga.value || 15, ciclo: 4, minimizar: this.cMinimizar.checked, silencio: this.cSilencio.checked, semJogos: this.cSemJogos.checked } }).then(tique);
    for (const x of [this.cMin, this.cPausa, this.cLonga, this.cMinimizar, this.cSilencio, this.cSemJogos]) x.addEventListener('change', salvar);
    this.j.corpo.style.padding = '6px 8px 8px';
    const pPomodoro = h('div.painel-aba.foco-painel',
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, img('foco', 32), h('div', h('b', tr('Foco (Pomodoro)')), h('div', tr('Trabalhe em blocos, com pausas no meio.')))),
      this.tempo, this.fase, this.hoje,
      h('div.acoes', this.btIniciar, h('button', { on: { click: pular } }, tr('Pular')), h('button', { on: { click: zerar } }, tr('Zerar'))),
      h('fieldset', { style: { margin: '10px 0 0' } }, h('legend', tr('Minutos')),
        h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'space-between' } }, tr('Foco'), this.cMin, tr('Pausa'), this.cPausa, tr('Longa'), this.cLonga)),
      h('fieldset', { style: { margin: '8px 0 0' } }, h('legend', tr('Durante o foco')),
        h('div', h('label', this.cSilencio, h('span', tr('Não perturbe: os avisos esperam no sino')))),
        h('div', { style: { marginTop: '4px' } }, h('label', this.cSemJogos, h('span', tr('Deixar os jogos para as pausas')))),
        h('div', { style: { marginTop: '4px' } }, h('label', this.cMinimizar, h('span', tr('Minimizar as outras janelas no começo do foco'))))));
    this.paineis = [pPomodoro, this.montarCronometro(), this.montarTemporizador()];
    this.abasEl = h('div.abas');
    this.j.corpo.append(this.abasEl, h('div.foco-paineis', ...this.paineis));
    this.j.ev.on('fechada', () => { janela = null; cancelAnimationFrame(this.raf); });
    this.mostrarAba(aba ?? ((estado.config.foco || {}).aba || 0));
    this.atualizar();
    ajustarAoConteudo(this.j, { minLarg: 320 });
  }

  mostrarAba(i) {
    this.aba = i;
    const nomes = [tr('Pomodoro'), tr('Cronômetro'), tr('Temporizador')];
    this.abasEl.replaceChildren(...nomes.map((t, k) => {
      const el = h('div' + (k === i ? '.ativa' : ''), t);
      el.addEventListener('mousedown', () => { this.mostrarAba(k); definirConfig({ foco: { aba: k } }).catch(() => { }); });
      return el;
    }));
    this.paineis.forEach((p, k) => { p.classList.toggle('oculto', k !== i); p.inert = k !== i; });
    this.atualizar();
    // O cronômetro mostra os décimos: com ele à vista, a tela acompanha cada quadro.
    cancelAnimationFrame(this.raf);
    if (i === 1) {
      const quadro = () => { this.atualizarCronometro(); this.raf = requestAnimationFrame(quadro); };
      this.raf = requestAnimationFrame(quadro);
    }
  }

  montarCronometro() {
    this.cronTempo = h('div.foco-relogio.cron');
    this.btCron = h('button.padrao', { on: { click: () => { cronometroAlternar(); this.atualizarCronometro(true); } } });
    this.btVolta = h('button', { on: { click: () => { cronometroVolta(); this.atualizarCronometro(true); } } }, tr('Volta'));
    this.btCronZerar = h('button', { on: { click: () => { cronometroZerar(); this.atualizarCronometro(true); } } }, tr('Zerar'));
    this.voltas = h('div.foco-voltas');
    return h('div.painel-aba.foco-painel', this.cronTempo, h('div.acoes', this.btCron, this.btVolta, this.btCronZerar), this.voltas);
  }

  atualizarCronometro(tudo = false) {
    this.cronTempo.textContent = hhmmss(valorCronometro());
    if (!tudo && this.ultimoCron === C.rodando + ':' + C.voltas.length + ':' + (C.acumulado > 0)) return;
    this.ultimoCron = C.rodando + ':' + C.voltas.length + ':' + (C.acumulado > 0);
    this.btCron.textContent = C.rodando ? tr('Parar') : C.acumulado ? tr('Continuar') : tr('Começar');
    this.btVolta.disabled = !C.rodando;
    this.btCronZerar.disabled = C.rodando || (!C.acumulado && !C.voltas.length);
    this.voltas.replaceChildren(...(C.voltas.length
      ? C.voltas.map((v) => h('div.foco-volta', h('span', tr('Volta {n}', { n: v.n })), h('span', hhmmss(v.parcial)), h('b', hhmmss(v.total))))
      : [h('div.foco-volta.vazia', tr('As voltas aparecem aqui.'))]));
  }

  montarTemporizador() {
    const num = (max, v) => h('input', { type: 'number', min: 0, max, value: v, style: { width: '48px' } });
    const total = T.total / 1000;
    this.tH = num(23, Math.floor(total / 3600));
    this.tM = num(59, Math.floor((total % 3600) / 60));
    this.tS = num(59, total % 60);
    const lerCampos = () => ((+this.tH.value || 0) * 3600 + (+this.tM.value || 0) * 60 + (+this.tS.value || 0)) * 1000;
    for (const c of [this.tH, this.tM, this.tS]) c.addEventListener('change', () => { if (!T.rodando && !T.resta) { T.total = lerCampos() || T.total; this.atualizar(); } });
    this.tempTempo = h('div.foco-relogio.temp');
    this.btTemp = h('button.padrao', {
      on: { click: () => { if (T.rodando) temporizadorPausar(); else if (T.resta) temporizadorIniciar(); else if (lerCampos()) temporizadorIniciar(lerCampos()); this.atualizar(); } },
    });
    this.btTempZerar = h('button', { on: { click: () => { temporizadorZerar(); this.atualizar(); } } }, tr('Zerar'));
    const rapido = (min) => h('button', { on: { click: () => { this.tH.value = Math.floor(min / 60); this.tM.value = min % 60; this.tS.value = 0; temporizadorZerar(); temporizadorIniciar(min * 60000); this.atualizar(); } } }, tr('{n} min', { n: min }));
    return h('div.painel-aba.foco-painel', this.tempTempo,
      h('div.foco-campos', this.tH, h('span', 'h'), this.tM, h('span', 'min'), this.tS, h('span', 's')),
      h('div.acoes', this.btTemp, this.btTempZerar),
      h('fieldset', { style: { margin: '8px 0 0' } }, h('legend', tr('Começar já')), h('div.foco-rapidos', rapido(1), rapido(5), rapido(10), rapido(15), rapido(30), rapido(60))));
  }

  piscarTempo() {
    this.tempTempo.classList.add('piscando');
    setTimeout(() => this.tempTempo.classList.remove('piscando'), 4000);
  }

  atualizar() {
    if (this.tempTempo) {
      // Como na bandeja: os segundos arredondados para cima (o 00:00:00 é o fim).
      this.tempTempo.textContent = hhmmss(Math.ceil(restaTemporizador() / 1000) * 1000, false);
      this.btTemp.textContent = T.rodando ? tr('Pausar') : T.resta ? tr('Continuar') : tr('Começar');
      this.btTempZerar.disabled = !T.rodando && !T.resta;
      for (const c of [this.tH, this.tM, this.tS]) c.disabled = T.rodando || T.resta > 0;
    }
    if (this.cronTempo) this.atualizarCronometro();
    this.tempo.textContent = mmss(restante());
    this.tempo.style.color = F.fase === 'foco' ? '#800000' : '#008000';
    this.fase.textContent = F.rodando ? nomeFase() : tr('{fase} (parado)', { fase: nomeFase() });
    this.hoje.textContent = tr('Focos concluídos hoje: {n}', { n: F.hoje });
    this.btIniciar.textContent = F.rodando ? tr('Pausar') : (F.resta ? tr('Continuar') : tr('Começar'));
  }
}

function abrirFoco(args = {}) {
  if (janela) { janela.j.focar(); if (args.aba != null) janela.mostrarAba(args.aba); return janela; }
  janela = new JanelaFoco(args);
  if (!timer) timer = setInterval(tique, 250);
  return janela;
}

registrarApp('foco', { nome: 'Foco', icone: 'foco', abrir: abrirFoco });
export { janelas };
