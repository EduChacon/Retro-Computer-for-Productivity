/*
 * O calendário no formato iCalendar (.ics, a RFC 5545), o mesmo do Google Agenda, do Outlook e do
 * Calendário do Mac: ler, gravar e abrir as repetições num intervalo de datas. Sem a tela: testado
 * no Node (testes/ics.test.js). Os horários são os do relógio do computador (os com "Z", em UTC,
 * são trazidos para a hora daqui; os com fuso, ficam como estão escritos).
 *
 * Um evento: { uid, titulo, descricao, local, inicio, fim, diaTodo, lembrete, repetir, extra }
 *   inicio, fim   "AAAA-MM-DD" (o dia todo) ou "AAAA-MM-DDTHH:MM"; fim pode faltar
 *   lembrete      os minutos antes (0 = na hora), ou null
 *   repetir       null ou { freq: "diaria" | "semanal" | "mensal" | "anual", intervalo, ate ("AAAA-MM-DD"), vezes,
 *                 dias (na semanal: os dias da semana, 0 = domingo), original (a regra mais fina, como veio) }
 *   excecoes      as ocorrências tiradas da repetição (o EXDATE), como o inicio
 *   recorrencia   na ocorrência alterada de uma repetição (o RECURRENCE-ID): o começo que ela substitui
 *   extra         as linhas do evento que o Retro Computer não usa, guardadas para não se perderem
 */

const FREQ = { DAILY: 'diaria', WEEKLY: 'semanal', MONTHLY: 'mensal', YEARLY: 'anual' };
const FREQ_ICS = Object.fromEntries(Object.entries(FREQ).map(([k, v]) => [v, k]));
const DIAS_ICS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const CONHECIDAS = new Set(['UID', 'SUMMARY', 'DESCRIPTION', 'LOCATION', 'DTSTART', 'DTEND', 'DURATION', 'RRULE', 'EXDATE', 'RECURRENCE-ID', 'DTSTAMP', 'BEGIN', 'END']);
const MAX_OCORRENCIAS = 5000;

const dois = (n) => String(n).padStart(2, '0');
const dataTexto = (d) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
const dataHoraTexto = (d) => `${dataTexto(d)}T${dois(d.getHours())}:${dois(d.getMinutes())}`;

/** "AAAA-MM-DD" ou "AAAA-MM-DDTHH:MM" → Date (na hora local). */
export function paraData(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(String(s || ''));
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0));
}

/** As linhas lógicas (as dobradas, que continuam com um espaço ou um tab, voltam a ser uma). */
function desdobrar(texto) {
  return String(texto || '').replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n').filter((l) => l.trim());
}

/** "DTSTART;TZID=X;VALUE=DATE:20261017" → { nome, params, valor }. */
function lerLinha(linha) {
  // Os dois-pontos dentro de um parâmetro entre aspas não contam.
  let i = 0;
  let aspas = false;
  for (; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') aspas = !aspas;
    else if (c === ':' && !aspas) break;
  }
  const cab = linha.slice(0, i);
  const valor = linha.slice(i + 1);
  const [nome, ...ps] = cab.split(';');
  const params = {};
  for (const p of ps) {
    const k = p.indexOf('=');
    if (k > 0) params[p.slice(0, k).toUpperCase()] = p.slice(k + 1).replace(/^"|"$/g, '');
  }
  return { nome: nome.toUpperCase(), params, valor };
}

const desescapar = (s) => String(s).replace(/\\([\\;,nN])/g, (_, c) => (c === 'n' || c === 'N' ? '\n' : c));
const escapar = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Uma data do .ics → "AAAA-MM-DD" ou "AAAA-MM-DDTHH:MM" (a com "Z" vem para a hora daqui). */
function lerData(valor, params) {
  const v = String(valor || '').trim();
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(v);
  if (!m) return null;
  if (!m[4] || params.VALUE === 'DATE') return `${m[1]}-${m[2]}-${m[3]}`;
  if (m[7]) return dataHoraTexto(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] || 0))));
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`;
}

/** "-PT15M", "-P1D", "PT0S", "-P1DT2H" → minutos (antes do evento). */
function lerDuracao(v) {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(String(v || '').trim());
  if (!m) return null;
  const min = Number(m[2] || 0) * 10080 + Number(m[3] || 0) * 1440 + Number(m[4] || 0) * 60 + Number(m[5] || 0) + Math.round(Number(m[6] || 0) / 60);
  return m[1] === '-' ? min : -min;
}

function lerRegra(v) {
  const p = Object.fromEntries(String(v || '').split(';').map((x) => x.split('=')).filter((x) => x.length === 2).map(([k, x]) => [k.toUpperCase(), x]));
  const freq = FREQ[p.FREQ];
  if (!freq) return null;
  const r = { freq, intervalo: Math.max(1, Math.min(999, Number(p.INTERVAL) || 1)) };
  if (p.UNTIL) { const d = lerData(p.UNTIL, {}); if (d) r.ate = d.slice(0, 10); }
  if (p.COUNT) r.vezes = Math.max(1, Math.min(MAX_OCORRENCIAS, Number(p.COUNT) || 1));
  // A semanal em vários dias (BYDAY=MO,WE,FR), a mais comum das regras finas, entra nas contas.
  let conhecidas = ['FREQ', 'INTERVAL', 'UNTIL', 'COUNT', 'WKST'];
  if (freq === 'semanal' && p.BYDAY && /^(SU|MO|TU|WE|TH|FR|SA)(,(SU|MO|TU|WE|TH|FR|SA))*$/i.test(p.BYDAY)) {
    r.dias = [...new Set(p.BYDAY.toUpperCase().split(',').map((d) => DIAS_ICS.indexOf(d)))].sort();
    conhecidas = [...conhecidas, 'BYDAY'];
  }
  // As outras (BYSETPOS, BYMONTHDAY…) ficam guardadas como estão: o arquivo volta igual.
  if (Object.keys(p).some((k) => !conhecidas.includes(k))) r.original = v;
  return r;
}

/** Lê um .ics: { eventos, nome } (o nome do calendário, se houver). */
export function lerIcs(texto) {
  const eventos = [];
  let nome = '';
  let atual = null;
  let alarme = null;
  let profundidade = 0;
  for (const linha of desdobrar(texto)) {
    const { nome: n, params, valor } = lerLinha(linha);
    if (n === 'X-WR-CALNAME' && !atual) nome = desescapar(valor);
    if (n === 'BEGIN') {
      const o = valor.toUpperCase();
      if (o === 'VEVENT' && !atual) { atual = { uid: '', titulo: '', descricao: '', local: '', inicio: null, fim: null, diaTodo: false, lembrete: null, repetir: null, excecoes: [], recorrencia: null, extra: [] }; profundidade = 0; continue; }
      if (atual && o === 'VALARM') { alarme = { gatilho: null }; continue; }
      if (atual) { profundidade++; atual.extra.push(linha); }
      continue;
    }
    if (n === 'END') {
      const o = valor.toUpperCase();
      if (atual && o === 'VALARM' && alarme) {
        if (alarme.gatilho != null && (atual.lembrete == null || alarme.gatilho < atual.lembrete)) atual.lembrete = Math.max(0, alarme.gatilho);
        alarme = null;
        continue;
      }
      if (atual && o === 'VEVENT' && profundidade === 0) {
        if (atual.inicio) {
          atual.diaTodo = atual.inicio.length === 10;
          if (!atual.uid) atual.uid = novoUid();
          eventos.push(atual);
        }
        atual = null;
        continue;
      }
      if (atual) { profundidade--; atual.extra.push(linha); }
      continue;
    }
    if (!atual) continue;
    if (alarme) { if (n === 'TRIGGER' && params.VALUE !== 'DATE-TIME') alarme.gatilho = lerDuracao(valor); continue; }
    if (profundidade > 0) { atual.extra.push(linha); continue; }
    if (n === 'UID') atual.uid = valor.trim();
    else if (n === 'SUMMARY') atual.titulo = desescapar(valor);
    else if (n === 'DESCRIPTION') atual.descricao = desescapar(valor);
    else if (n === 'LOCATION') atual.local = desescapar(valor);
    else if (n === 'DTSTART') atual.inicio = lerData(valor, params);
    else if (n === 'DTEND') atual.fim = lerData(valor, params);
    else if (n === 'DURATION' && atual.inicio) {
      const min = -lerDuracao(valor);
      const d = paraData(atual.inicio);
      if (d && Number.isFinite(min)) atual.fim = atual.inicio.length === 10 ? dataTexto(new Date(d.getTime() + min * 60000)) : dataHoraTexto(new Date(d.getTime() + min * 60000));
    } else if (n === 'RRULE') atual.repetir = lerRegra(valor);
    else if (n === 'EXDATE') {
      // Pode vir em várias linhas e com várias datas por linha.
      for (const x of valor.split(',')) { const d = lerData(x, params); if (d && atual.excecoes.length < MAX_OCORRENCIAS) atual.excecoes.push(d); }
    } else if (n === 'RECURRENCE-ID') atual.recorrencia = lerData(valor, params);
    else if (!CONHECIDAS.has(n)) atual.extra.push(linha);
  }
  return { eventos, nome };
}

let contador = 0;
export function novoUid() {
  const aleatorio = (globalThis.crypto && globalThis.crypto.randomUUID) ? globalThis.crypto.randomUUID() : `${Date.now().toString(36)}-${(contador++).toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${aleatorio}@retro-computer`;
}

/** Uma linha do .ics, dobrada em 75 bytes (sem partir um caractere no meio). */
function dobrar(linha) {
  const partes = [];
  let atual = '';
  let bytes = 0;
  for (const c of linha) {
    const b = new TextEncoder().encode(c).length;
    if (bytes + b > (partes.length ? 74 : 75)) { partes.push(atual); atual = ''; bytes = 0; }
    atual += c;
    bytes += b;
  }
  partes.push(atual);
  return partes.join('\r\n ');
}

const dataIcs = (s) => (s.length === 10 ? `;VALUE=DATE:${s.replace(/-/g, '')}` : `:${s.replace(/[-:]/g, '')}00`);

/** Grava os eventos num .ics (com as linhas que o Retro Computer não usa de volta no lugar). */
export function gravarIcs(eventos, { nome = '' } = {}) {
  const l = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Retro Computer//Agenda//PT', 'CALSCALE:GREGORIAN'];
  if (nome) l.push('X-WR-CALNAME:' + escapar(nome));
  const agora = new Date();
  const carimbo = `${agora.getUTCFullYear()}${dois(agora.getUTCMonth() + 1)}${dois(agora.getUTCDate())}T${dois(agora.getUTCHours())}${dois(agora.getUTCMinutes())}${dois(agora.getUTCSeconds())}Z`;
  for (const e of eventos) {
    if (!e.inicio) continue;
    l.push('BEGIN:VEVENT', 'UID:' + (e.uid || novoUid()), 'DTSTAMP:' + carimbo, 'DTSTART' + dataIcs(e.inicio));
    if (e.fim) l.push('DTEND' + dataIcs(e.fim));
    if (e.recorrencia) l.push('RECURRENCE-ID' + dataIcs(e.recorrencia));
    l.push('SUMMARY:' + escapar(e.titulo || ''));
    if (e.descricao) l.push('DESCRIPTION:' + escapar(e.descricao));
    if (e.local) l.push('LOCATION:' + escapar(e.local));
    if (e.repetir) {
      if (e.repetir.original) l.push('RRULE:' + e.repetir.original);
      else {
        const r = [`FREQ=${FREQ_ICS[e.repetir.freq]}`];
        if (e.repetir.intervalo > 1) r.push(`INTERVAL=${e.repetir.intervalo}`);
        if (e.repetir.freq === 'semanal' && e.repetir.dias && e.repetir.dias.length) r.push(`BYDAY=${e.repetir.dias.map((d) => DIAS_ICS[d]).join(',')}`);
        if (e.repetir.vezes) r.push(`COUNT=${e.repetir.vezes}`);
        else if (e.repetir.ate) r.push(`UNTIL=${e.repetir.ate.replace(/-/g, '')}${e.inicio.length === 10 ? '' : 'T235959'}`);
        l.push('RRULE:' + r.join(';'));
      }
      for (const x of e.excecoes || []) l.push('EXDATE' + dataIcs(x));
    }
    for (const x of e.extra || []) l.push(x);
    if (e.lembrete != null) l.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + escapar(e.titulo || ''), `TRIGGER:-PT${Math.max(0, Math.round(e.lembrete))}M`, 'END:VALARM');
    l.push('END:VEVENT');
  }
  l.push('END:VCALENDAR');
  return l.map(dobrar).join('\r\n') + '\r\n';
}

/** O próximo começo de uma repetição (o mensal no dia 31 pula os meses sem dia 31, como no Google). */
function proximo(d, freq, n, base) {
  const r = new Date(d);
  if (freq === 'diaria') r.setDate(r.getDate() + n);
  else if (freq === 'semanal') r.setDate(r.getDate() + 7 * n);
  else if (freq === 'mensal') { r.setDate(1); r.setMonth(r.getMonth() + n); r.setDate(base.getDate()); }
  else if (freq === 'anual') { r.setDate(1); r.setFullYear(r.getFullYear() + n); r.setMonth(base.getMonth()); r.setDate(base.getDate()); }
  return r;
}

/**
 * As ocorrências dos eventos que tocam o intervalo [de, ate): [{ evento, inicio: Date, fim: Date }],
 * em ordem. O evento de dia todo vai da meia-noite à meia-noite do dia seguinte (ou do fim).
 */
const DIA = 86400000;

/**
 * Os começos de uma repetição, em ordem (sem fim: quem chama para). Sem um número de vezes, ela
 * começa perto de "de" (sem contar uma por uma desde o começo); a margem cobre a hora de verão.
 */
function* comecos(ini, rep, de, duracao) {
  const { freq, intervalo = 1, vezes } = rep;
  const pular = (passo) => (vezes ? 0 : Math.max(0, Math.floor((de - ini - duracao) / passo) - 2));
  if (freq === 'semanal' && rep.dias && rep.dias.length) {
    const domingo = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() - ini.getDay());
    for (let k = pular(7 * intervalo * DIA); ; k++) {
      for (const d of rep.dias) {
        const x = new Date(domingo.getFullYear(), domingo.getMonth(), domingo.getDate() + 7 * intervalo * k + d, ini.getHours(), ini.getMinutes());
        if (x >= ini) yield x;
      }
    }
  }
  const passo = { diaria: DIA, semanal: 7 * DIA, mensal: 28 * DIA, anual: 365 * DIA }[freq] * intervalo;
  for (let k = pular(passo); ; k++) {
    const x = proximo(ini, freq, intervalo * k, ini);
    // O mensal num dia que o mês não tem (31 em abril) não acontece naquele mês (nem conta nas vezes).
    if ((freq !== 'mensal' && freq !== 'anual') || x.getDate() === ini.getDate()) yield x;
  }
}

export function ocorrencias(eventos, de, ate) {
  const lista = [];
  // A ocorrência alterada (um evento com RECURRENCE-ID) aparece no lugar da original.
  const trocadas = new Map();
  for (const e of eventos) {
    if (!e.recorrencia || !e.uid) continue;
    if (!trocadas.has(e.uid)) trocadas.set(e.uid, new Set());
    trocadas.get(e.uid).add(e.recorrencia);
  }
  for (const e of eventos) {
    const ini = paraData(e.inicio);
    if (!ini) continue;
    let fim = e.fim ? paraData(e.fim) : null;
    if (!fim || fim <= ini) fim = e.diaTodo || e.inicio.length === 10 ? new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + 1) : new Date(ini.getTime() + 60 * 60000);
    const duracao = fim - ini;
    if (!e.repetir) {
      if (ini < ate && fim > de) lista.push({ evento: e, inicio: ini, fim });
      continue;
    }
    const { vezes } = e.repetir;
    const limite = e.repetir.ate ? paraData(e.repetir.ate) : null;
    if (limite) limite.setHours(23, 59, 59);
    const fora = new Set([...(e.excecoes || []), ...(e.recorrencia ? [] : trocadas.get(e.uid) || [])]);
    let contadas = 0;
    let passos = 0;
    for (const atual of comecos(ini, e.repetir, de, duracao)) {
      if (++passos > MAX_OCORRENCIAS * 10) break;
      if (vezes && contadas >= vezes) break;
      if (limite && atual > limite) break;
      if (atual >= ate) break;
      // A tirada (EXDATE) conta nas vezes, como no RFC 5545, mas não aparece.
      contadas++;
      if (fora.has(dataHoraTexto(atual)) || fora.has(dataTexto(atual))) continue;
      const f = new Date(atual.getTime() + duracao);
      if (f > de) lista.push({ evento: e, inicio: new Date(atual), fim: f });
      if (lista.length > MAX_OCORRENCIAS) break;
    }
  }
  return lista.sort((a, b) => a.inicio - b.inicio);
}

export { dataTexto, dataHoraTexto };
