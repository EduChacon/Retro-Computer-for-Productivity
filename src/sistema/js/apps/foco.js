/*
 * Foco: o relógio Pomodoro (blocos de trabalho com pausas). Continua contando
 * com a janela fechada; o tempo aparece na bandeja, ao lado do relógio.
 */
import { h, img } from '../util.js';
import { Janela, lista as janelas, minimizarTodas } from '../janelas.js';
import { registrarApp, estado, definirConfig, avisar, eventos } from '../sistema.js';
import { ajustarAoConteudo } from '../dialogos.js';
import { tocar } from '../sons.js';
import { tr } from '../idioma.js';

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

function cfg() {
  const c = (estado.config && estado.config.foco) || {};
  return { minutos: c.minutos || 25, pausa: c.pausa || 5, longa: c.longa || 15, ciclo: c.ciclo || 4, minimizar: !!c.minimizar };
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
  eventos.emit('foco', { ativo: F.rodando || F.resta > 0, texto: mmss(restante()), fase: nomeFase() });
}

function tique() {
  if (new Date().toDateString() !== F.dia) { F.dia = new Date().toDateString(); F.hoje = 0; }
  if (F.rodando && Date.now() >= F.fim) terminouFase();
  avisarBarra();
  if (janela) janela.atualizar();
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
  if (eraFoco) F.hoje++;
  proximaFase();
  F.rodando = false;
  F.resta = 0;
  tocar('foco');
  avisar(eraFoco ? tr('Fim do foco!') : tr('Fim da pausa'), eraFoco ? (F.fase === 'longa' ? tr('Bom trabalho. Hora de uma pausa longa.') : tr('Bom trabalho. Hora de uma pausa curta.')) : tr('Hora de voltar ao trabalho.'), { icone: 'foco', som: null, ms: 12000, aoClicar: () => abrirFoco() });
  // A próxima fase começa sozinha.
  iniciar();
}

class JanelaFoco {
  constructor() {
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
    const salvar = () => definirConfig({ foco: { minutos: +this.cMin.value || 25, pausa: +this.cPausa.value || 5, longa: +this.cLonga.value || 15, ciclo: 4, minimizar: this.cMinimizar.checked } }).then(tique);
    for (const x of [this.cMin, this.cPausa, this.cLonga, this.cMinimizar]) x.addEventListener('change', salvar);
    this.j.corpo.style.padding = '10px';
    this.j.corpo.append(
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, img('foco', 32), h('div', h('b', tr('Foco (Pomodoro)')), h('div', tr('Trabalhe em blocos, com pausas no meio.')))),
      this.tempo, this.fase, this.hoje,
      h('div.acoes', this.btIniciar, h('button', { on: { click: pular } }, tr('Pular')), h('button', { on: { click: zerar } }, tr('Zerar'))),
      h('fieldset', { style: { margin: '10px 0 0' } }, h('legend', tr('Minutos')),
        h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'space-between' } }, tr('Foco'), this.cMin, tr('Pausa'), this.cPausa, tr('Longa'), this.cLonga),
        h('div', { style: { marginTop: '8px' } }, h('label', this.cMinimizar, h('span', tr('Minimizar as outras janelas no começo do foco'))))),
    );
    this.j.ev.on('fechada', () => { janela = null; });
    this.atualizar();
    ajustarAoConteudo(this.j, { minLarg: 320 });
  }

  atualizar() {
    this.tempo.textContent = mmss(restante());
    this.tempo.style.color = F.fase === 'foco' ? '#800000' : '#008000';
    this.fase.textContent = F.rodando ? nomeFase() : tr('{fase} (parado)', { fase: nomeFase() });
    this.hoje.textContent = tr('Focos concluídos hoje: {n}', { n: F.hoje });
    this.btIniciar.textContent = F.rodando ? tr('Pausar') : (F.resta ? tr('Continuar') : tr('Começar'));
  }
}

function abrirFoco() {
  if (janela) { janela.j.focar(); return janela; }
  janela = new JanelaFoco();
  if (!timer) timer = setInterval(tique, 250);
  return janela;
}

registrarApp('foco', { nome: 'Foco', icone: 'foco', abrir: abrirFoco });
export { janelas };
