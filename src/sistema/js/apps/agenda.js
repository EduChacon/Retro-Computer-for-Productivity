/*
 * A Agenda: o mês à esquerda, os eventos do dia (ou dos próximos 30 dias) à direita, a caixa do
 * evento (com o dia todo, o lembrete e a repetição) e a importação de um .ics de outro programa.
 * Os dados e os lembretes ficam em agenda.js; o arquivo é o .ics de Meus documentos.
 */
import { h, img, rotulo, caminhoTela, nomeDe, paiDe } from '../util.js';
import { Janela } from '../janelas.js';
import { registrarApp, abrir } from '../sistema.js';
import { mensagem, erro, info, ajustarAoConteudo, caixaArquivo } from '../dialogos.js';
import { tr, localidade } from '../idioma.js';
import { carregarAgenda, alterarAgenda, agendaAgora, ocorrenciasEntre, diasComEvento, horarioDe, arquivoAgenda, evAgenda } from '../agenda.js';
import { lerIcs, paraData, dataTexto, dataHoraTexto, novoUid } from '../ics.js';

const MAX_IMPORTAR = 20 * 1024 * 1024;
let aberta = null;

/** O primeiro dia da semana do idioma (0 = domingo), como no calendário do relógio. */
function primeiroDia() {
  try {
    const l = new Intl.Locale(localidade());
    const i = (l.getWeekInfo && l.getWeekInfo()) || l.weekInfo;
    if (i && i.firstDay) return i.firstDay % 7;
  } catch { }
  return 0;
}

const diaLongo = (d) => d.toLocaleDateString(localidade(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const inicioDoDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const somarDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dois = (n) => String(n).padStart(2, '0');
const horaTexto = (d) => `${dois(d.getHours())}:${dois(d.getMinutes())}`;

class Agenda {
  constructor({ dia, evento } = {}) {
    this.dia = inicioDoDia(paraData(dia) || new Date());
    this.mes = new Date(this.dia.getFullYear(), this.dia.getMonth(), 1);
    this.vista = 'dia';
    this.lista = [];
    this.escolhido = -1;
    this.alvo = evento || null;

    this.j = new Janela({
      id: 'agenda', titulo: tr('Agenda'), icone: 'calendario', largura: 640, altura: 430, minLargura: 520, minAltura: 320,
      menus: this.menus(), status: [''],
    });
    this.tituloMes = h('div.cal-titulo');
    this.grade = h('div.cal-grade.ag-grade');
    this.cabecalho = h('div.ag-cab');
    this.itensEl = h('div.ag-lista', { tabIndex: 0 });
    this.btEditar = h('button', { type: 'button', on: { click: () => this.editar() } }, rotulo(tr('E&ditar…')));
    this.btExcluir = h('button', { type: 'button', on: { click: () => this.excluir() } }, rotulo(tr('Ex&cluir')));
    this.j.corpo.classList.add('ag-corpo');
    this.j.corpo.append(
      h('div.ag-esq',
        h('div.calendario.ag-mes',
          h('div.cal-topo',
            h('button.cal-seta', { type: 'button', title: tr('Mês anterior'), on: { click: () => this.mudarMes(-1) } }, '◀'),
            this.tituloMes,
            h('button.cal-seta', { type: 'button', title: tr('Próximo mês'), on: { click: () => this.mudarMes(1) } }, '▶')),
          this.grade),
        h('div.ag-esq-botoes',
          h('button', { type: 'button', on: { click: () => this.irPara(new Date()) } }, rotulo(tr('&Hoje'))),
          h('button', { type: 'button', on: { click: () => this.alternarVista() } }, rotulo(tr('Próximos &30 dias'))))),
      h('div.ag-dir',
        this.cabecalho,
        this.itensEl,
        h('div.acoes',
          h('button.padrao', { type: 'button', on: { click: () => this.novo() } }, rotulo(tr('&Novo evento…'))),
          this.btEditar, this.btExcluir)),
    );
    this.itensEl.addEventListener('keydown', (e) => this.teclaLista(e));
    this.j.el.addEventListener('keydown', (e) => this.tecla(e));
    // O arquivo mudou (por esta janela, pela importação ou por outro programa): redesenha.
    const parar = evAgenda.on('mudou', () => this.desenhar());
    this.j.ev.on('fechada', () => { parar(); aberta = null; });
    this.desenhar();
    carregarAgenda().then(() => {
      this.desenhar();
      if (this.alvo) this.escolherPorUid(this.alvo);
    }).catch((e) => erro(e.message || String(e)));
    this.itensEl.focus();
  }

  menus() {
    return [
      {
        rotulo: tr('&Arquivo'), itens: [
          { rotulo: tr('&Novo evento…'), atalho: 'Ctrl+N', acao: () => this.novo() },
          { rotulo: tr('&Importar um calendário (.ics)…'), acao: () => this.importarPerguntando() },
          { rotulo: tr('Abrir a &pasta da Agenda'), acao: () => abrir('explorador', { pasta: paiDe(arquivoAgenda()), selecionar: arquivoAgenda() }) },
          { separador: true },
          { rotulo: tr('Sai&r'), acao: () => this.j.fechar() },
        ],
      },
      {
        rotulo: tr('&Editar'), itens: () => [
          { rotulo: tr('&Editar o evento…'), atalho: 'Enter', desativado: !this.atual(), acao: () => this.editar() },
          { rotulo: tr('E&xcluir o evento'), atalho: 'Del', desativado: !this.atual(), acao: () => this.excluir() },
        ],
      },
      {
        rotulo: tr('E&xibir'), itens: () => [
          { rotulo: tr('&Dia'), radio: true, marcado: this.vista === 'dia', acao: () => this.mudarVista('dia') },
          { rotulo: tr('&Próximos 30 dias'), radio: true, marcado: this.vista === 'proximos', acao: () => this.mudarVista('proximos') },
        ],
      },
      {
        rotulo: tr('&Ir'), itens: [
          { rotulo: tr('&Hoje'), atalho: 'Home', acao: () => this.irPara(new Date()) },
          { separador: true },
          { rotulo: tr('Dia &anterior'), atalho: '←', acao: () => this.irPara(somarDias(this.dia, -1)) },
          { rotulo: tr('&Próximo dia'), atalho: '→', acao: () => this.irPara(somarDias(this.dia, 1)) },
          { rotulo: tr('&Mês anterior'), atalho: 'PgUp', acao: () => this.mudarMes(-1, true) },
          { rotulo: tr('Pró&ximo mês'), atalho: 'PgDn', acao: () => this.mudarMes(1, true) },
        ],
      },
    ];
  }

  focar() { this.j.focar(); }

  atual() { return this.lista[this.escolhido] || null; }

  /* ---------- O desenho ---------- */

  desenhar() {
    this.desenharMes();
    this.desenharLista();
    const d = agendaAgora();
    this.j.definirStatus(tr('{n} evento(s) na Agenda · {arquivo}', { n: d.eventos.length, arquivo: caminhoTela(arquivoAgenda()) }));
  }

  desenharMes() {
    const mes = this.mes;
    this.tituloMes.textContent = mes.toLocaleDateString(localidade(), { month: 'long', year: 'numeric' });
    const p0 = primeiroDia();
    const inicio = new Date(mes);
    inicio.setDate(1 - ((mes.getDay() - p0 + 7) % 7));
    const fim = somarDias(inicio, 42);
    const marcados = diasComEvento(inicio, fim);
    const hoje = dataTexto(new Date());
    const filhos = [];
    for (let i = 0; i < 7; i++) filhos.push(h('div.cal-semana', new Date(2022, 9, 2 + ((p0 + i) % 7)).toLocaleDateString(localidade(), { weekday: 'narrow' })));
    for (let i = 0; i < 42; i++) {
      const d = somarDias(inicio, i);
      const t = dataTexto(d);
      const cls = ['cal-dia'];
      if (d.getMonth() !== mes.getMonth()) cls.push('fora');
      if (t === hoje) cls.push('hoje');
      if (t === dataTexto(this.dia)) cls.push('escolhido');
      if (marcados.has(t)) cls.push('com-evento');
      filhos.push(h('div.' + cls.join('.'), {
        title: diaLongo(d),
        on: { mousedown: (e) => { if (e.button === 0) this.irPara(d); }, dblclick: () => this.novo() },
      }, String(d.getDate())));
    }
    this.grade.replaceChildren(...filhos);
  }

  desenharLista() {
    const proximos = this.vista === 'proximos';
    const de = proximos ? inicioDoDia(new Date()) : this.dia;
    const ate = somarDias(de, proximos ? 30 : 1);
    const antes = this.atual();
    this.lista = ocorrenciasEntre(de, ate);
    this.cabecalho.replaceChildren(
      h('b', proximos ? tr('Próximos 30 dias') : diaLongo(this.dia)),
      h('span', this.lista.length ? tr('{n} evento(s)', { n: this.lista.length }) : ''));
    const filhos = [];
    let diaAnterior = '';
    this.lista.forEach((o, i) => {
      if (proximos) {
        const d = dataTexto(new Date(Math.max(o.inicio, de)));
        if (d !== diaAnterior) { filhos.push(h('div.ag-dia', diaLongo(paraData(d)))); diaAnterior = d; }
      }
      const extras = [o.evento.local, o.evento.repetir ? tr('repete') : '', o.evento.lembrete != null ? tr('com lembrete') : ''].filter(Boolean).join(' · ');
      filhos.push(h('div.ag-item' + (i === this.escolhido ? '.escolhido' : ''), {
        on: { mousedown: () => this.escolher(i), dblclick: () => this.editar() },
      }, h('span.ag-hora', horarioDe(o, proximos ? new Date(Math.max(o.inicio, de)) : this.dia)),
      h('div.ag-texto', h('b', o.evento.titulo || tr('(Sem título)')), extras ? h('span', extras) : null)));
    });
    if (!this.lista.length) filhos.push(h('div.ag-vazio', proximos ? tr('Nenhum evento nos próximos 30 dias.') : tr('Nenhum evento neste dia. Dê dois cliques no dia ou use Novo evento.')));
    this.itensEl.replaceChildren(...filhos);
    // A seleção fica no mesmo evento depois de redesenhar (quando ele ainda está na lista).
    if (antes) {
      const i = this.lista.findIndex((o) => o.evento._id === antes.evento._id && +o.inicio === +antes.inicio);
      this.escolhido = i;
    } else if (this.escolhido >= this.lista.length) this.escolhido = -1;
    if (this.escolhido < 0 && this.lista.length) this.escolhido = 0;
    this.marcarEscolhido();
  }

  marcarEscolhido() {
    const itens = [...this.itensEl.querySelectorAll('.ag-item')];
    itens.forEach((el, i) => el.classList.toggle('escolhido', i === this.escolhido));
    const el = itens[this.escolhido];
    if (el) el.scrollIntoView({ block: 'nearest' });
    this.btEditar.disabled = this.btExcluir.disabled = !this.atual();
  }

  escolher(i) {
    this.escolhido = i;
    this.marcarEscolhido();
  }

  escolherPorUid(uid) {
    const i = this.lista.findIndex((o) => o.evento.uid === uid);
    if (i >= 0) this.escolher(i);
  }

  irPara(d) {
    this.dia = inicioDoDia(d);
    this.mes = new Date(this.dia.getFullYear(), this.dia.getMonth(), 1);
    if (this.vista !== 'dia') this.vista = 'dia';
    this.escolhido = -1;
    this.desenhar();
  }

  mudarMes(n, levarDia = false) {
    this.mes = new Date(this.mes.getFullYear(), this.mes.getMonth() + n, 1);
    if (levarDia) {
      // O mesmo dia no outro mês (o 31 vira o último dia do mês mais curto).
      const ultimo = new Date(this.mes.getFullYear(), this.mes.getMonth() + 1, 0).getDate();
      this.dia = new Date(this.mes.getFullYear(), this.mes.getMonth(), Math.min(this.dia.getDate(), ultimo));
      this.escolhido = -1;
      this.desenharLista();
    }
    this.desenharMes();
  }

  mudarVista(v) {
    this.vista = v;
    this.escolhido = -1;
    this.desenharLista();
  }

  alternarVista() { this.mudarVista(this.vista === 'dia' ? 'proximos' : 'dia'); }

  teclaLista(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!this.lista.length) return;
      this.escolher(Math.max(0, Math.min(this.lista.length - 1, this.escolhido + (e.key === 'ArrowDown' ? 1 : -1))));
    }
  }

  tecla(e) {
    if (e.target.closest('input, textarea, select')) return;
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key.toLowerCase() === 'n') { e.preventDefault(); this.novo(); }
    else if (e.key === 'Enter' && !e.target.closest('button')) { e.preventDefault(); this.editar(); }
    else if (e.key === 'Delete') { e.preventDefault(); this.excluir(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); this.irPara(somarDias(this.dia, -1)); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); this.irPara(somarDias(this.dia, 1)); }
    else if (e.key === 'PageUp') { e.preventDefault(); this.mudarMes(-1, true); }
    else if (e.key === 'PageDown') { e.preventDefault(); this.mudarMes(1, true); }
    else if (e.key === 'Home') { e.preventDefault(); this.irPara(new Date()); }
  }

  /* ---------- Criar, editar e excluir ---------- */

  async novo() {
    const base = this.vista === 'dia' ? this.dia : inicioDoDia(new Date());
    const agora = new Date();
    // Hoje, a próxima hora cheia; nos outros dias, às 9h.
    const ini = dataTexto(base) === dataTexto(agora) ? new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), agora.getHours() + 1) : new Date(base.getFullYear(), base.getMonth(), base.getDate(), 9);
    const ev = await caixaEvento({ uid: novoUid(), titulo: '', local: '', descricao: '', inicio: dataHoraTexto(ini), fim: dataHoraTexto(new Date(ini.getTime() + 3600000)), diaTodo: false, lembrete: 15, repetir: null, excecoes: [], recorrencia: null, extra: [] }, { novo: true });
    if (!ev) return;
    await this.gravar((lista) => [...lista, ev], ev);
  }

  async editar() {
    const o = this.atual();
    if (!o) return;
    const e = o.evento;
    let modo = 'todas';
    if (e.repetir && !e.recorrencia) {
      modo = await perguntarSerie(tr('"{titulo}" se repete. O que você quer mudar?', { titulo: e.titulo || tr('(Sem título)') }), tr('Editar o evento'));
      if (!modo) return;
    }
    if (modo === 'uma') {
      // Só esta ocorrência: um evento novo com o mesmo UID e o começo que ele substitui.
      const chaveOrig = e.diaTodo ? dataTexto(o.inicio) : dataHoraTexto(o.inicio);
      const fimOrig = e.diaTodo ? dataTexto(o.fim) : dataHoraTexto(o.fim);
      const copia = { ...e, _id: undefined, inicio: chaveOrig, fim: fimOrig, repetir: null, excecoes: [], recorrencia: chaveOrig, extra: [] };
      const ev = await caixaEvento(copia, { semRepetir: true });
      if (!ev) return;
      await this.gravar((lista) => [...lista, ev], ev);
      return;
    }
    const ev = await caixaEvento({ ...e }, { semRepetir: !!e.recorrencia });
    if (!ev) return;
    await this.gravar((lista) => lista.map((x) => (x._id === e._id ? ev : x)), ev);
  }

  async excluir() {
    const o = this.atual();
    if (!o) return;
    const e = o.evento;
    const titulo = e.titulo || tr('(Sem título)');
    const chaveOcorr = e.diaTodo ? dataTexto(o.inicio) : dataHoraTexto(o.inicio);
    if (e.repetir && !e.recorrencia) {
      const modo = await perguntarSerie(tr('"{titulo}" se repete. O que você quer excluir?', { titulo }), tr('Excluir o evento'));
      if (!modo) return;
      if (modo === 'uma') {
        await this.gravar((lista) => lista.map((x) => (x._id === e._id ? { ...x, excecoes: [...(x.excecoes || []), chaveOcorr] } : x)));
        return;
      }
      // A repetição inteira, com as ocorrências alteradas dela.
      await this.gravar((lista) => lista.filter((x) => x._id !== e._id && !(x.uid === e.uid && x.recorrencia)));
      return;
    }
    const v = await mensagem({
      titulo: tr('Excluir o evento'), tipo: 'pergunta',
      texto: tr('Excluir "{titulo}" ({quando})?\n\nA versão anterior da Agenda fica em Versões anteriores.', { titulo, quando: `${diaLongo(o.inicio)}, ${horarioDe(o, inicioDoDia(o.inicio))}` }),
      botoes: [{ texto: tr('&Sim'), valor: true, padrao: true }, { texto: tr('&Não'), valor: false }],
    });
    if (v !== true) return;
    // A ocorrência alterada sai e deixa a original tirada da repetição (senão ela voltaria).
    await this.gravar((lista) => lista.filter((x) => x._id !== e._id).map((x) => (e.recorrencia && x.uid === e.uid && x.repetir && !x.recorrencia ? { ...x, excecoes: [...(x.excecoes || []), e.recorrencia] } : x)));
  }

  async gravar(mudar, mostrar) {
    try {
      await alterarAgenda(mudar);
      if (mostrar) {
        const d = paraData(mostrar.inicio);
        if (d && this.vista === 'dia') this.irPara(d);
        this.escolherPorUid(mostrar.uid);
      }
    } catch (e) {
      erro(tr('Não foi possível gravar a Agenda: {erro}', { erro: e.message || String(e) }));
    }
  }

  /* ---------- Importar ---------- */

  async importarPerguntando() {
    const rel = await caixaArquivo({ modo: 'abrir', titulo: tr('Importar um calendário'), tipos: [{ rotulo: tr('Calendários (*.ics)'), exts: ['ics'] }] });
    if (rel) importarIcs(rel);
  }
}

/** "Só esta ocorrência" ou "Todas": 'uma', 'todas' ou null. */
function perguntarSerie(texto, titulo) {
  return mensagem({
    titulo, texto, tipo: 'pergunta',
    botoes: [{ texto: tr('Só &esta ocorrência'), valor: 'uma', padrao: true }, { texto: tr('&Todas as ocorrências'), valor: 'todas' }, { texto: tr('Cancelar'), valor: null }],
  });
}

const LEMBRETES = [null, 0, 5, 10, 15, 30, 60, 120, 1440, 2880, 10080];
function nomeLembrete(m) {
  if (m == null) return tr('Nenhum');
  if (m === 0) return tr('Na hora');
  if (m % 10080 === 0) return m === 10080 ? tr('1 semana antes') : tr('{n} semanas antes', { n: m / 10080 });
  if (m % 1440 === 0) return m === 1440 ? tr('1 dia antes') : tr('{n} dias antes', { n: m / 1440 });
  if (m % 60 === 0) return m === 60 ? tr('1 hora antes') : tr('{n} horas antes', { n: m / 60 });
  return tr('{n} minutos antes', { n: m });
}

/**
 * A caixa do evento. Devolve o evento mudado (uma cópia) ou null. No de dia todo, o fim mostrado é
 * o último dia (no .ics, o fim é o dia seguinte).
 */
function caixaEvento(e, { novo = false, semRepetir = false } = {}) {
  return new Promise((resolve) => {
    let feito = false;
    const j = new Janela({ titulo: novo ? tr('Novo evento') : tr('Evento'), icone: 'calendario', dialogo: true, largura: 440, altura: 400, aoFechar: () => { if (!feito) { feito = true; resolve(null); } } });
    const ini = paraData(e.inicio) || new Date();
    let fim = e.fim ? paraData(e.fim) : null;
    if (!fim || fim <= ini) fim = e.diaTodo ? somarDias(ini, 1) : new Date(ini.getTime() + 3600000);
    const fimMostrado = e.diaTodo ? somarDias(fim, -1) : fim;

    const titulo = h('input', { type: 'text', value: e.titulo || '', maxLength: 500, spellcheck: false });
    const local = h('input', { type: 'text', value: e.local || '', maxLength: 500, spellcheck: false });
    const diaTodo = h('input', { type: 'checkbox', checked: !!e.diaTodo });
    const dIni = h('input', { type: 'date', value: dataTexto(ini), required: true });
    const hIni = h('input', { type: 'time', value: horaTexto(ini) });
    const dFim = h('input', { type: 'date', value: dataTexto(fimMostrado), required: true });
    const hFim = h('input', { type: 'time', value: horaTexto(fimMostrado) });
    const lembretes = LEMBRETES.includes(e.lembrete) ? LEMBRETES : [...LEMBRETES, e.lembrete].sort((a, b) => (a ?? -1) - (b ?? -1));
    const lembrete = h('select', ...lembretes.map((m) => h('option', { value: m == null ? '' : String(m), selected: m === e.lembrete }, nomeLembrete(m))));
    const rep = e.repetir || null;
    const repetir = h('select',
      h('option', { value: '' }, tr('Não se repete')),
      h('option', { value: 'diaria' }, tr('Todo dia')),
      h('option', { value: 'semanal' }, tr('Toda semana')),
      h('option', { value: 'mensal' }, tr('Todo mês')),
      h('option', { value: 'anual' }, tr('Todo ano')));
    repetir.value = rep ? rep.freq : '';
    const ate = h('input', { type: 'date', value: rep && rep.ate ? rep.ate : '' });
    const notaRegra = h('div.ag-nota');
    const descricao = h('textarea', { rows: 4, spellcheck: false }, e.descricao || '');
    const mostrarNota = () => {
      const r = rep && repetir.value === rep.freq ? rep : null;
      const partes = [];
      if (r && r.intervalo > 1) partes.push(tr('a cada {n}', { n: r.intervalo }));
      if (r && r.dias && r.dias.length) partes.push(r.dias.map((d) => new Date(2022, 9, 2 + d).toLocaleDateString(localidade(), { weekday: 'short' })).join(', '));
      if (r && r.vezes && !ate.value) partes.push(tr('{n} vezes', { n: r.vezes }));
      if (r && r.original) partes.push(tr('com a regra do calendário de origem'));
      notaRegra.textContent = partes.join(' · ');
      ate.disabled = !repetir.value;
    };
    const mostrarHoras = () => { hIni.style.visibility = hFim.style.visibility = diaTodo.checked ? 'hidden' : ''; };
    diaTodo.addEventListener('change', mostrarHoras);
    repetir.addEventListener('change', mostrarNota);
    ate.addEventListener('input', mostrarNota);
    // Mudar o começo leva o fim junto (mantendo a duração), como nos calendários de hoje.
    let duracao = fimMostrado - ini;
    const lerIni = () => paraData(dIni.value + (diaTodo.checked ? '' : 'T' + (hIni.value || '00:00')));
    const lerFim = () => paraData(dFim.value + (diaTodo.checked ? '' : 'T' + (hFim.value || '00:00')));
    const levarFim = () => {
      const a = lerIni();
      if (!a) return;
      const b = new Date(a.getTime() + Math.max(0, duracao));
      dFim.value = dataTexto(b);
      if (!diaTodo.checked) hFim.value = horaTexto(b);
    };
    dIni.addEventListener('change', levarFim);
    hIni.addEventListener('change', levarFim);
    const guardarDuracao = () => { const a = lerIni(); const b = lerFim(); if (a && b) duracao = b - a; };
    dFim.addEventListener('change', guardarDuracao);
    hFim.addEventListener('change', guardarDuracao);

    const fimDe = async (ok) => {
      if (feito) return;
      if (!ok) { feito = true; j.fechar(true); resolve(null); return; }
      const a = lerIni();
      const b = lerFim();
      if (!a || !b) { await erro(tr('Escolha a data do começo e a do fim.')); dIni.focus(); return; }
      if (b < a) { await erro(tr('O fim vem antes do começo.')); dFim.focus(); return; }
      const novoEv = { ...e, titulo: titulo.value.trim(), local: local.value.trim(), descricao: descricao.value, diaTodo: diaTodo.checked };
      if (diaTodo.checked) { novoEv.inicio = dataTexto(a); novoEv.fim = dataTexto(somarDias(b, 1)); } else { novoEv.inicio = dataHoraTexto(a); novoEv.fim = dataHoraTexto(b); }
      novoEv.lembrete = lembrete.value === '' ? null : Number(lembrete.value);
      if (!semRepetir) {
        if (!repetir.value) novoEv.repetir = null;
        else if (rep && rep.freq === repetir.value) {
          // A mesma frequência: fica o que veio (os dias, o intervalo, a regra fina); muda só o fim.
          novoEv.repetir = { ...rep };
          if (ate.value) { novoEv.repetir.ate = ate.value; delete novoEv.repetir.vezes; delete novoEv.repetir.original; } else delete novoEv.repetir.ate;
          if (rep.ate && !ate.value) delete novoEv.repetir.original;
        } else {
          novoEv.repetir = { freq: repetir.value, intervalo: 1 };
          if (ate.value) novoEv.repetir.ate = ate.value;
        }
      }
      feito = true;
      j.fechar(true);
      resolve(novoEv);
    };

    const linha = (rot, ...campos) => h('div.ag-linha', h('label', rotulo(rot)), h('div.ag-campos', ...campos));
    j.corpo.classList.add('ag-form');
    j.corpo.append(
      linha(tr('&Título:'), titulo),
      linha(tr('&Local:'), local),
      linha(tr('&Começo:'), dIni, hIni, h('label.ag-diatodo', diaTodo, h('span', rotulo(tr('&Dia todo'))))),
      linha(tr('&Fim:'), dFim, hFim),
      semRepetir ? null : linha(tr('&Repetir:'), repetir, h('span', tr('até')), ate),
      semRepetir ? null : h('div.ag-linha', h('span'), notaRegra),
      linha(tr('Le&mbrete:'), lembrete),
      h('div.ag-linha.alto', h('label', rotulo(tr('D&escrição:'))), descricao),
      h('div.acoes.direita',
        h('button.padrao', { type: 'button', on: { click: () => fimDe(true) } }, tr('OK')),
        h('button', { type: 'button', on: { click: () => fimDe(false) } }, tr('Cancelar'))),
    );
    j.el.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && !ev.target.closest('textarea, button, select')) { ev.preventDefault(); fimDe(true); }
    });
    mostrarHoras();
    mostrarNota();
    ajustarAoConteudo(j, { largura: 440 });
    titulo.focus();
  });
}

/**
 * Importa um .ics para a Agenda: os eventos novos entram; os que já estão (o mesmo UID e a mesma
 * ocorrência) são atualizados. O arquivo de origem não muda.
 */
async function importarIcs(rel) {
  try {
    if (rel === arquivoAgenda()) { abrirAgenda({}); return; }
    const inf = await retro.disco.info(rel);
    if (inf.tamanho > MAX_IMPORTAR) { erro(tr('O arquivo "{nome}" é grande demais para importar.', { nome: nomeDe(rel) })); return; }
    const { eventos, nome } = lerIcs(await retro.disco.lerTexto(rel));
    if (!eventos.length) { info(tr('O arquivo "{nome}" não tem eventos que a Agenda saiba ler.', { nome: nomeDe(rel) }), tr('Importar um calendário')); return; }
    await carregarAgenda();
    const chave = (x) => `${x.uid}|${x.recorrencia || ''}`;
    const ja = new Set(agendaAgora().eventos.map(chave));
    const atualizados = eventos.filter((x) => ja.has(chave(x))).length;
    const v = await mensagem({
      titulo: tr('Importar um calendário'), tipo: 'pergunta',
      texto: [
        tr('"{nome}" tem {n} evento(s){calendario}.', { nome: nomeDe(rel), n: eventos.length, calendario: nome ? ` (${nome})` : '' }),
        atualizados ? tr('{n} já está(ão) na Agenda e será(ão) atualizado(s).', { n: atualizados }) : '',
        tr('Importar para a Agenda? O arquivo de origem não muda.'),
      ].filter(Boolean).join('\n\n'),
      botoes: [{ texto: tr('&Importar'), valor: true, padrao: true }, { texto: tr('Cancelar'), valor: false }],
    });
    if (v !== true) return;
    await alterarAgenda((lista) => {
      const porChave = new Map(eventos.map((x) => [chave(x), x]));
      const mantidos = lista.map((x) => { const n = porChave.get(chave(x)); if (n) { porChave.delete(chave(x)); return n; } return x; });
      return [...mantidos, ...porChave.values()];
    });
    const primeiro = eventos.map((x) => paraData(x.inicio)).filter(Boolean).sort((a, b) => a - b).find((d) => d >= inicioDoDia(new Date())) || paraData(eventos[0].inicio);
    const a = abrirAgenda({ dia: primeiro ? dataTexto(primeiro) : null });
    info(tr('{n} evento(s) importado(s) para a Agenda.', { n: eventos.length }), tr('Importar um calendário'));
    return a;
  } catch (e) {
    erro(tr('Não foi possível importar o calendário: {erro}', { erro: e.message || String(e) }));
  }
}

function abrirAgenda({ dia, evento, arquivo } = {}) {
  if (arquivo && arquivo !== arquivoAgenda()) { importarIcs(arquivo); return aberta && aberta.j; }
  if (aberta) {
    if (dia) aberta.irPara(paraData(dia) || new Date());
    if (evento) aberta.escolherPorUid(evento);
    aberta.focar();
    return aberta.j;
  }
  aberta = new Agenda({ dia, evento });
  return aberta.j;
}

registrarApp('agenda', { nome: 'Agenda', icone: 'calendario', tipos: ['ics'], abrir: abrirAgenda });
