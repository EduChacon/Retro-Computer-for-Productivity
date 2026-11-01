/*
 * Os dados da Agenda e os lembretes. Os eventos ficam num .ics comum do disco C: (Meus documentos ›
 * Agenda.ics), que o Google Agenda, o Outlook e o Calendário do Mac também abrem. Este módulo lê o
 * arquivo, grava cada mudança (a versão anterior fica em Versões anteriores), acompanha o arquivo
 * quando ele muda por fora e mostra os lembretes, mesmo com a janela da Agenda fechada.
 *
 * Os calendários da internet (calendarios.js, no processo principal) entram junto, só para ler:
 * a cópia guardada de cada um é lida ao abrir e baixada de novo a cada hora; os eventos deles
 * levam _fonte (o id do calendário) e os lembretes só valem com a opção do calendário.
 */
import { h, img, rotulo, caminhoTela, Eventos } from './util.js';
import { estado, pastaDocs, definirConfig, naoPerturbeAgora, avisar, eventos as evSistema, abrir } from './sistema.js';
import { lerIcs, gravarIcs, ocorrencias, dataTexto, dataHoraTexto } from './ics.js';
import { Janela } from './janelas.js';
import { tocar } from './sons.js';
import { tr, localidade } from './idioma.js';

export const evAgenda = new Eventos();

// Um .ics maior que isso não é lido (um arquivo estranho não trava a área de trabalho).
const MAX_BYTES = 20 * 1024 * 1024;
const MIN = 60000;

let dados = { eventos: [], nome: '', modificado: null, rel: '' };
let carregado = null;
let numero = 0;
// Os calendários da internet já lidos: id → { eventos, nome }; e os que estão baixando agora.
const externos = new Map();
const baixando = new Set();
const HORA = 60 * 60000;

/** O caminho do .ics da Agenda (o nome fica guardado: trocar de idioma não cria outro). */
export function arquivoAgenda() {
  const nome = (estado.config.pastas && estado.config.pastas.agenda) || `${tr('Agenda')}.ics`;
  return `${pastaDocs()}/${nome}`;
}

const comId = (e) => { e._id = ++numero; return e; };

async function ler() {
  const rel = arquivoAgenda();
  const info = await retro.disco.info(rel).catch(() => null);
  if (!info || info.pasta) { dados = { eventos: [], nome: '', modificado: null, rel }; return dados; }
  if (info.tamanho > MAX_BYTES) throw new Error(tr('O arquivo da Agenda é grande demais para abrir ({nome}).', { nome: caminhoTela(rel) }));
  const texto = await retro.disco.lerTexto(rel);
  const { eventos, nome } = lerIcs(texto);
  dados = { eventos: eventos.map(comId), nome, modificado: info.modificado, rel };
  return dados;
}

/** Os eventos da Agenda (lidos uma vez; depois, só quando o arquivo muda). */
export function carregarAgenda({ deNovo = false } = {}) {
  if (!carregado || deNovo) {
    carregado = ler().then((d) => { evAgenda.emit('mudou', d); return d; });
    carregado.catch(() => { carregado = null; });
  }
  return carregado;
}

/** Os dados já carregados (para quem desenha na hora, como o calendário do relógio). */
export const agendaAgora = () => dados;

/**
 * Muda a Agenda: lê de novo se o arquivo mudou por fora (para não apagar o que outro programa
 * gravou), aplica a mudança e grava. `mudar(eventos)` devolve a lista nova.
 */
export async function alterarAgenda(mudar) {
  await carregarAgenda();
  const rel = arquivoAgenda();
  const info = await retro.disco.info(rel).catch(() => null);
  if (info && !info.pasta && info.modificado !== dados.modificado) await carregarAgenda({ deNovo: true });
  const lista = mudar(dados.eventos.slice()).map((e) => (e._id ? e : comId(e)));
  if (!(estado.config.pastas && estado.config.pastas.agenda)) await definirConfig({ pastas: { agenda: rel.split('/').pop() } });
  const texto = gravarIcs(lista, { nome: dados.nome || tr('Agenda') });
  const novo = await retro.disco.gravar(rel, new TextEncoder().encode(texto));
  dados = { eventos: lista, nome: dados.nome || tr('Agenda'), modificado: novo && novo.modificado, rel };
  carregado = Promise.resolve(dados);
  evAgenda.emit('mudou', dados);
  conferirLembretes();
  retro.googleAgenda.agendar().catch(() => {});
  return dados;
}

/* ---------- Os calendários da internet ---------- */

/** Os calendários assinados, como a área de trabalho os vê (sem o endereço: o id, o nome e o site). */
export const calendariosAgora = () => ((estado.config.agenda && estado.config.agenda.calendarios) || []);

const ligados = () => calendariosAgora().filter((c) => c.ligado !== false);

function guardarLista(lista) {
  estado.config = { ...estado.config, agenda: { ...(estado.config.agenda || {}), calendarios: lista } };
  for (const id of [...externos.keys()]) if (!lista.some((c) => c.id === id)) externos.delete(id);
  evAgenda.emit('calendarios', lista);
  evAgenda.emit('mudou', dados);
}

/** Lê a cópia guardada de um calendário (os horários com fuso vêm para a hora daqui). */
async function lerCalendario(id) {
  const texto = await retro.calendarios.ler(id).catch(() => '');
  const { eventos, nome } = texto ? lerIcs(texto, { fusos: true }) : { eventos: [], nome: '' };
  externos.set(id, { eventos: eventos.map((e) => comId({ ...e, _fonte: id })), nome });
}

/** Lê as cópias de todos (sem internet) e redesenha. */
export async function carregarCalendarios() {
  await Promise.all(calendariosAgora().map((c) => lerCalendario(c.id)));
  evAgenda.emit('mudou', dados);
}

/** Quantos eventos o calendário da internet tem (na cópia lida) e se ele está baixando agora. */
export const eventosDoCalendario = (id) => (externos.get(id) || { eventos: [] }).eventos.length;
export const baixandoCalendario = (id) => baixando.has(id);

/** Baixa de novo um calendário; o erro fica anotado na lista (a cópia de antes continua valendo). */
export async function atualizarCalendario(id) {
  baixando.add(id);
  evAgenda.emit('calendarios', calendariosAgora());
  try {
    guardarLista(await retro.calendarios.atualizar(id));
    await lerCalendario(id);
    evAgenda.emit('mudou', dados);
    conferirLembretes();
  } catch (e) {
    // A lista nova traz o erro anotado.
    guardarLista(await retro.config.obter().then((c) => (c.agenda && c.agenda.calendarios) || []).catch(() => calendariosAgora()));
    throw e;
  } finally {
    baixando.delete(id);
    evAgenda.emit('calendarios', calendariosAgora());
  }
}

/** Os que passaram de uma hora sem baixar (os com erro, de quinze em quinze minutos). */
export function atualizarVencidos(agora = Date.now()) {
  for (const c of ligados()) {
    const ultima = Math.max(c.ultima || 0, c.erro ? (c.tentativa || 0) - HORA + 15 * MIN : 0);
    if (agora - ultima >= HORA) atualizarCalendario(c.id).catch(() => { });
  }
}

/** Assina um calendário (o processo principal confere o endereço e baixa uma vez). */
export async function adicionarCalendario(dadosNovos) {
  const r = await retro.calendarios.adicionar(dadosNovos);
  guardarLista(r.lista);
  await lerCalendario(r.id);
  evAgenda.emit('mudou', dados);
  conferirLembretes();
  return r.id;
}

export async function mudarCalendario(id, parte) {
  guardarLista(await retro.calendarios.mudar(id, parte));
  conferirLembretes();
}

export async function removerCalendario(id) {
  guardarLista(await retro.calendarios.remover(id));
}

/** O calendário de um evento da internet (ou null, o da Agenda). */
export const calendarioDe = (evento) => (evento && evento._fonte ? calendariosAgora().find((c) => c.id === evento._fonte) || null : null);

/** As listas de eventos que aparecem: a da Agenda e a de cada calendário da internet ligado. */
function fontes({ soComLembretes = false } = {}) {
  const r = [dados.eventos];
  for (const c of ligados()) {
    if (soComLembretes && !c.lembretes) continue;
    const x = externos.get(c.id);
    if (x && x.eventos.length) r.push(x.eventos);
  }
  return r;
}

/** As ocorrências de várias listas (cada uma com as repetições dela), em ordem. */
const ocorrenciasDe = (listas, de, ate) => (listas.length === 1 ? ocorrencias(listas[0], de, ate) : listas.flatMap((l) => ocorrencias(l, de, ate)).sort((a, b) => a.inicio - b.inicio));

/** As ocorrências entre duas datas, com os dados já carregados (a Agenda e os calendários da internet). */
export const ocorrenciasEntre = (de, ate) => ocorrenciasDe(fontes(), de, ate);

/** Os dias (AAAA-MM-DD) com algum evento entre duas datas: o calendário marca esses. */
export function diasComEvento(de, ate) {
  const dias = new Set();
  for (const o of ocorrenciasEntre(de, ate)) {
    const d = new Date(Math.max(o.inicio, de));
    // Um evento de vários dias marca cada um deles (sem passar do intervalo).
    for (let i = 0; d < o.fim && d < ate && i < 62; i++) {
      dias.add(dataTexto(d));
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 1);
    }
  }
  return dias;
}

/** "09:00–09:30", "Dia todo" ou "Até 10:00" (o que começou num dia de antes). */
export function horarioDe(o, dia) {
  const hora = (d) => d.toLocaleTimeString(localidade(), { hour: '2-digit', minute: '2-digit' });
  if (o.evento.diaTodo) return tr('Dia todo');
  const inicioNoDia = !dia || dataTexto(o.inicio) === dataTexto(dia);
  const fimNoDia = !dia || o.fim <= new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() + 1);
  if (inicioNoDia && fimNoDia) return `${hora(o.inicio)}–${hora(o.fim)}`;
  if (inicioNoDia) return tr('A partir de {hora}', { hora: hora(o.inicio) });
  if (fimNoDia) return tr('Até {hora}', { hora: hora(o.fim) });
  return tr('Dia todo');
}

/* ---------- Os lembretes ---------- */

const chave = (o) => `${o.evento._fonte ? o.evento._fonte + '/' : ''}${o.evento.uid}|${o.evento.diaTodo ? dataTexto(o.inicio) : dataHoraTexto(o.inicio)}`;
const adiados = new Map(); // chave → hora (ms) em que volta
const noSino = new Set(); // os já avisados no sino durante o "Não perturbe"
let janela = null;
let relogio = null;

/** Os lembretes que já passaram da hora e ainda não foram descartados (até o fim do evento). */
function devidos(agora = Date.now()) {
  const vistos = new Set((estado.config.agenda && estado.config.agenda.vistos) || []);
  const de = new Date(agora - 2 * 24 * 60 * MIN);
  const ate = new Date(agora + 8 * 24 * 60 * MIN);
  return ocorrenciasDe(fontes({ soComLembretes: true }).map((l) => l.filter((e) => e.lembrete != null)), de, ate).filter((o) => {
    const k = chave(o);
    if (vistos.has(k)) return false;
    if (adiados.has(k)) return adiados.get(k) <= agora && o.fim > agora;
    return o.inicio.getTime() - o.evento.lembrete * MIN <= agora && o.fim > agora;
  });
}

function marcarVisto(o) {
  const antes = (estado.config.agenda && estado.config.agenda.vistos) || [];
  const k = chave(o);
  adiados.delete(k);
  // Só os últimos 300: o que já passou não volta mesmo (o lembrete vale até o fim do evento).
  definirConfig({ agenda: { vistos: [...antes.filter((x) => x !== k), k].slice(-300) } }).catch(() => { });
}

/** "Hoje às 14:00 · Sala 3", "Amanhã, dia todo", "Começou às 09:00". */
function quando(o, agora = new Date()) {
  const hora = o.inicio.toLocaleTimeString(localidade(), { hour: '2-digit', minute: '2-digit' });
  const hoje = dataTexto(agora);
  const amanha = dataTexto(new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1));
  const dia = dataTexto(o.inicio);
  let t;
  if (o.evento.diaTodo) t = dia === hoje ? tr('Hoje, dia todo') : dia === amanha ? tr('Amanhã, dia todo') : o.inicio.toLocaleDateString(localidade(), { weekday: 'long', day: 'numeric', month: 'long' });
  else if (o.inicio <= agora) t = tr('Começou às {hora}', { hora });
  else if (dia === hoje) t = tr('Hoje às {hora}', { hora });
  else if (dia === amanha) t = tr('Amanhã às {hora}', { hora });
  else t = tr('{dia} às {hora}', { dia: o.inicio.toLocaleDateString(localidade(), { weekday: 'long', day: 'numeric', month: 'long' }), hora });
  return o.evento.local ? `${t} · ${o.evento.local}` : t;
}

const ADIAR = [5, 10, 15, 30, 60];

/** A janela dos lembretes (como a do Outlook): os devidos, com Adiar e Descartar. */
function mostrarJanela(lista) {
  if (!lista.length) return;
  if (!janela) {
    const j = new Janela({ id: 'lembretes', titulo: tr('Lembretes'), icone: 'calendario', largura: 460, altura: 250, maximizavel: false });
    janela = { itens: h('div.lembretes-lista'), j, lista, escolhido: 0 };
    const adiar = h('select', ...ADIAR.map((m) => h('option', { value: m }, m < 60 ? tr('{n} minutos', { n: m }) : tr('1 hora'))));
    j.corpo.classList.add('lembretes-corpo');
    j.corpo.append(
      janela.itens,
      h('div.lembretes-acoes',
        h('label', rotulo(tr('&Adiar por:')), adiar),
        h('button', { type: 'button', on: { click: () => acao('adiar', Number(adiar.value)) } }, rotulo(tr('Adia&r'))),
        h('div', { style: { flex: '1' } }),
        h('button.padrao', { type: 'button', on: { click: () => acao('descartar') } }, rotulo(tr('&Descartar'))),
        h('button', { type: 'button', on: { click: () => acao('tudo') } }, rotulo(tr('Descartar &todos')))),
      h('div.lembretes-rodape', h('a', { href: '#', on: { click: (e) => { e.preventDefault(); const o = janela && janela.lista[janela.escolhido]; abrir('agenda', o ? { dia: dataTexto(o.inicio), evento: o.evento.uid } : {}); } } }, tr('Abrir a Agenda'))),
    );
    j.el.addEventListener('keydown', (e) => {
      if (e.target.closest('select')) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); janela.escolhido = Math.max(0, Math.min(janela.lista.length - 1, janela.escolhido + (e.key === 'ArrowDown' ? 1 : -1))); desenhar(); }
    });
    j.ev.on('fechada', () => { janela = null; });
  }
  janela.lista = lista;
  janela.escolhido = Math.max(0, Math.min(janela.escolhido || 0, lista.length - 1));
  desenhar();
  janela.j.focar();
}

function desenhar() {
  if (!janela || !janela.j) return;
  const { lista } = janela;
  janela.itens.replaceChildren(...lista.map((o, i) => {
    const el = h('div.lembrete' + (i === janela.escolhido ? '.escolhido' : ''), { tabIndex: -1, on: { mousedown: () => { janela.escolhido = i; desenhar(); }, dblclick: () => abrir('agenda', { dia: dataTexto(o.inicio), evento: o.evento.uid }) } },
      img('calendario', 16), h('div', h('b', o.evento.titulo || tr('(Sem título)')), h('div', quando(o))));
    return el;
  }));
  janela.j.definirTitulo(lista.length > 1 ? tr('{n} lembretes', { n: lista.length }) : tr('1 lembrete'));
}

function acao(qual, minutos) {
  if (!janela) return;
  const { lista } = janela;
  const alvos = qual === 'tudo' ? lista : [lista[janela.escolhido]].filter(Boolean);
  for (const o of alvos) {
    if (qual === 'adiar') adiados.set(chave(o), Date.now() + minutos * MIN);
    else marcarVisto(o);
  }
  const resto = lista.filter((o) => !alvos.includes(o));
  if (!resto.length) { janela.j.fechar(); return; }
  janela.lista = resto;
  janela.escolhido = 0;
  desenhar();
}

/** Confere os lembretes (a cada 20 segundos e depois de cada mudança na Agenda). */
export function conferirLembretes() {
  const lista = devidos();
  const aberta = janela ? new Set(janela.lista.map(chave)) : new Set();
  const novos = lista.filter((o) => !aberta.has(chave(o)));
  if (!novos.length) return;
  if (naoPerturbeAgora()) {
    // Com o "Não perturbe", só o sino (uma vez); a janela abre quando ele acabar.
    for (const o of novos.filter((x) => !noSino.has(chave(x)))) {
      noSino.add(chave(o));
      avisar(o.evento.titulo || tr('(Sem título)'), quando(o), { icone: 'calendario', som: null, aoClicar: () => mostrarJanela(devidos()) });
    }
    return;
  }
  mostrarJanela(lista);
  tocar('lembrete');
}

/** Liga os lembretes: lê a Agenda (sem atrasar a abertura) e acompanha o arquivo. */
export function iniciarAgenda() {
  let googleAnterior = null;
  retro.googleAgenda.aoMudar((s) => {
    if (s.calendario?.id !== googleAnterior) {
      googleAnterior = s.calendario?.id || null;
      retro.config.obter().then((c) => guardarLista(c.agenda?.calendarios || [])).catch(() => {});
    }
  });
  setTimeout(() => carregarAgenda().then(conferirLembretes).catch(() => { }), 4000);
  // Os da internet: a cópia guardada logo; baixar de novo, depois da abertura e a cada dez minutos (os vencidos).
  setTimeout(() => carregarCalendarios().then(conferirLembretes).catch(() => { }), 4500);
  setTimeout(() => atualizarVencidos(), 15000);
  setInterval(() => atualizarVencidos(), 10 * MIN);
  clearInterval(relogio);
  relogio = setInterval(conferirLembretes, 20000);
  retro.disco.aoMudar((pastas) => {
    const rel = arquivoAgenda();
    if (!pastas.includes(rel.split('/').slice(0, -1).join('/'))) return;
    retro.disco.info(rel).then((info) => {
      const m = info && !info.pasta ? info.modificado : null;
      if (m !== dados.modificado) carregarAgenda({ deNovo: true }).then(conferirLembretes).catch(() => { });
    }).catch(() => { });
  });
  // Trocar de idioma muda o nome padrão; o guardado no config fica.
  evSistema.on('config', (_c, parte) => { if (parte && parte.naoPerturbe === false) conferirLembretes(); });
}
