'use strict';
/* A projeção da Agenda na API Google. Campos que o Retro não edita ficam intactos no servidor. */
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const crypto = require('node:crypto');
let modulo;
const ics = () => (modulo ||= import(pathToFileURL(path.join(__dirname, '../sistema/js/ics.js')).href));
const chave = (e) => JSON.stringify([e.uid, e.recorrencia || '']);
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const resumo = (e) => e ? {
  uid: e.uid, titulo: e.titulo || '', descricao: e.descricao || '', local: e.local || '', inicio: e.inicio, fim: e.fim || null,
  diaTodo: !!e.diaTodo, lembrete: e.lembrete ?? null, repetir: e.repetir || null,
  excecoes: [...new Set(e.excecoes || [])].sort(), recorrencia: e.recorrencia || null,
  extra: (e.extra || []).filter((l) => /^RDATE[:;]/.test(l)),
} : null;
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');

function erro(codigo) { const e = new Error(codigo); e.codigo = codigo; return e; }
function dataIcs(prefixo, d) {
  if (d?.date && /^\d{4}-\d\d-\d\d$/.test(d.date)) return prefixo + ';VALUE=DATE:' + d.date.replaceAll('-', '');
  if (!d?.dateTime || !Number.isFinite(Date.parse(d.dateTime))) throw erro('evento');
  if (/[zZ]|[+-]\d\d:\d\d$/.test(d.dateTime)) return prefixo + ':' + new Date(d.dateTime).toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z');
  if (!/^[A-Za-z0-9_+/-]+$/.test(d.timeZone || '')) throw erro('evento');
  return prefixo + ';TZID=' + d.timeZone + ':' + d.dateTime.replaceAll('-', '').replaceAll(':', '');
}

async function doGoogle(g, padroes = [], pai = null) {
  if (g.status === 'cancelled') return null;
  const uid = g.extendedProperties?.private?.retroUid || pai?.extendedProperties?.private?.retroUid || g.iCalUID || pai?.iCalUID || 'google-' + g.id + '@retro';
  if (typeof uid !== 'string' || !uid || uid.length > 1000 || /[\r\n\0]/.test(uid)) throw erro('evento');
  const linhas = ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'UID:' + uid, dataIcs('DTSTART', g.start)];
  if (g.end) linhas.push(dataIcs('DTEND', g.end));
  if (g.originalStartTime) linhas.push(dataIcs('RECURRENCE-ID', g.originalStartTime));
  for (const l of g.recurrence || []) {
    if (typeof l !== 'string' || !/^(RRULE|EXDATE|RDATE)[:;]/.test(l) || /[\r\n]/.test(l)) throw erro('evento');
    linhas.push(l);
  }
  linhas.push('END:VEVENT', 'END:VCALENDAR');
  const { lerIcs } = await ics();
  const e = lerIcs(linhas.join('\r\n'), { fusos: true }).eventos[0];
  if (!e) throw erro('evento');
  e.titulo = String(g.summary || ''); e.descricao = String(g.description || ''); e.local = String(g.location || '');
  const lembretes = g.reminders?.useDefault ? padroes : g.reminders?.overrides || [];
  const minutos = lembretes.filter((r) => r.method === 'popup' && Number.isFinite(r.minutes)).map((r) => r.minutes);
  e.lembrete = minutos.length ? Math.min(...minutos) : null;
  return e;
}

async function projetar(cache, padroes) {
  const eventos = new Map();
  for (const g of Object.values(cache)) {
    if (g.recurringEventId && cache[g.recurringEventId]?.status === 'cancelled') continue;
    const e = await doGoogle(g, padroes, cache[g.recurringEventId]);
    if (!e) continue;
    const k = chave(e);
    if (eventos.has(k)) throw erro('duplicado');
    eventos.set(k, { evento: e, google: g });
  }
  // Uma ocorrência excluída precisa continuar excluída também no .ics local.
  for (const g of Object.values(cache).filter((x) => x.status === 'cancelled' && x.recurringEventId && x.originalStartTime)) {
    const pai = cache[g.recurringEventId];
    if (!pai || pai.status === 'cancelled') continue;
    const master = await doGoogle(pai, padroes);
    const k = chave(master), item = eventos.get(k);
    if (!item) continue;
    const { lerIcs } = await ics();
    const exc = lerIcs(['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'UID:x', dataIcs('DTSTART', g.originalStartTime), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n'), { fusos: true }).eventos[0];
    if (exc && !item.evento.excecoes.includes(exc.inicio)) item.evento.excecoes.push(exc.inicio);
  }
  return eventos;
}

async function paraGoogle(e, anterior = null, fuso = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const { gravarIcs, paraData, dataTexto, dataHoraTexto } = await ics();
  if (!e.uid || e.uid.length > 1000 || !paraData(e.inicio)) throw erro('evento');
  const ini = paraData(e.inicio);
  const fim = e.fim || (e.diaTodo ? dataTexto(new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + 1)) : dataHoraTexto(new Date(ini.getTime() + 3600000)));
  if (!paraData(fim) || paraData(fim) <= paraData(e.inicio)) throw erro('evento');
  const data = (v) => e.diaTodo ? { date: v.slice(0, 10) } : { dateTime: v + (v.length === 16 ? ':00' : ''), timeZone: fuso };
  const r = {};
  if (!anterior || e.titulo !== anterior.titulo) r.summary = e.titulo || '';
  if (!anterior || e.descricao !== anterior.descricao) r.description = e.descricao || '';
  if (!anterior || e.local !== anterior.local) r.location = e.local || '';
  if (!anterior || e.inicio !== anterior.inicio || e.fim !== anterior.fim || e.diaTodo !== anterior.diaTodo) { r.start = data(e.inicio); r.end = data(fim); }
  if (!anterior || e.lembrete !== anterior.lembrete) r.reminders = { useDefault: false, overrides: e.lembrete == null ? [] : [{ method: 'popup', minutes: Math.max(0, Math.round(e.lembrete)) }] };
  if (!anterior || !igual(e.repetir, anterior.repetir) || !igual(e.excecoes, anterior.excecoes)) {
    // O UNTIL de uma série com horário precisa ser UTC para a API do Google.
    const ev = e.repetir && !e.repetir.original && e.repetir.ate && !e.diaTodo ? { ...e, repetir: { ...e.repetir, original: undefined } } : e;
    const linhas = gravarIcs([ev]).replace(/\r\n[ \t]/g, '').split('\r\n').filter((l) => /^(RRULE|EXDATE|RDATE)[:;]/.test(l));
    r.recurrence = linhas.map((l) => {
      if (l.startsWith('RRULE:') && !e.diaTodo) return l.replace(/UNTIL=(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)(?!Z)/, (_m, a, b, c, h, m, s) => 'UNTIL=' + new Date(Number(a), Number(b) - 1, Number(c), Number(h), Number(m), Number(s)).toISOString().replaceAll('-', '').replaceAll(':', '').replace('.000Z', 'Z'));
      if (l.startsWith('EXDATE:') && !e.diaTodo) return 'EXDATE;TZID=' + fuso + l.slice(6);
      return l;
    });
  }
  return r;
}

module.exports = { ics, chave, resumo, igual, hash, erro, doGoogle, projetar, paraGoogle };
