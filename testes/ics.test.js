'use strict';
// O calendário .ics da Agenda (ics.js da área de trabalho): ler, gravar e as repetições.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const modulo = () => import(pathToFileURL(path.join(__dirname, '../src/sistema/js/ics.js')).href);

// Um .ics como o do Google Agenda: linhas dobradas, escapes, um alarme, um evento de dia todo,
// uma repetição e um campo que o Retro Computer não usa.
const GOOGLE = [
  'BEGIN:VCALENDAR', 'PRODID:-//Google Inc//Google Calendar 70.9054//EN', 'VERSION:2.0', 'X-WR-CALNAME:Trabalho',
  'BEGIN:VEVENT', 'DTSTART:20261020T130000Z', 'DTEND:20261020T140000Z', 'UID:abc@google.com',
  'SUMMARY:Audiência\\, sala 3', 'DESCRIPTION:Levar os autos\\nE a procuração', 'LOCATION:Fórum João Mendes',
  'X-GOOGLE-CONFERENCE:https://meet.google.com/xyz',
  'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-P0DT0H30M0S', 'END:VALARM', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART;VALUE=DATE:20261102', 'DTEND;VALUE=DATE:20261103', 'UID:feriado@google.com', 'SUMMARY:Finados', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART;TZID=America/Sao_Paulo:20261019T090000', 'DTEND;TZID=America/Sao_Paulo:20261019T093000', 'RRULE:FREQ=WEEKLY;COUNT=4',
  'UID:reuniao@google.com', 'SUMMARY:Reunião da equipe com um título bem comprido para a linha passar dos setenta e c', ' inco bytes', 'END:VEVENT',
  'END:VCALENDAR', '',
].join('\r\n');

test('ics: lê o .ics do Google (dobras, escapes, alarme, dia todo, repetição)', async () => {
  const { lerIcs } = await modulo();
  const { eventos, nome } = lerIcs(GOOGLE);
  assert.equal(nome, 'Trabalho');
  assert.equal(eventos.length, 3);
  const [a, f, r] = eventos;
  assert.equal(a.titulo, 'Audiência, sala 3');
  assert.equal(a.descricao, 'Levar os autos\nE a procuração');
  assert.equal(a.local, 'Fórum João Mendes');
  assert.equal(a.lembrete, 30);
  assert.equal(a.diaTodo, false);
  // Em UTC no arquivo: na hora daqui (o teste roda em qualquer fuso).
  const d = new Date(Date.UTC(2026, 9, 20, 13, 0));
  assert.equal(a.inicio, `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:00`);
  assert.deepEqual(a.extra, ['X-GOOGLE-CONFERENCE:https://meet.google.com/xyz']);
  assert.deepEqual([f.inicio, f.fim, f.diaTodo], ['2026-11-02', '2026-11-03', true]);
  assert.equal(r.inicio, '2026-10-19T09:00');
  assert.deepEqual(r.repetir, { freq: 'semanal', intervalo: 1, vezes: 4 });
  assert.equal(r.titulo, 'Reunião da equipe com um título bem comprido para a linha passar dos setenta e cinco bytes');
});

test('ics: gravar e ler de novo dá o mesmo (com as linhas de 75 bytes e o que não é do Retro Computer)', async () => {
  const { lerIcs, gravarIcs } = await modulo();
  const { eventos } = lerIcs(GOOGLE);
  const texto = gravarIcs(eventos, { nome: 'Trabalho' });
  for (const l of texto.split('\r\n')) assert.ok(Buffer.byteLength(l) <= 75, l);
  const de2 = lerIcs(texto);
  assert.equal(de2.nome, 'Trabalho');
  assert.deepEqual(de2.eventos.map((e) => [e.uid, e.titulo, e.descricao, e.local, e.inicio, e.fim, e.lembrete, JSON.stringify(e.repetir), e.extra.join('|')]),
    eventos.map((e) => [e.uid, e.titulo, e.descricao, e.local, e.inicio, e.fim, e.lembrete, JSON.stringify(e.repetir), e.extra.join('|')]));
});

test('ics: as repetições num intervalo (semanal com vezes, mensal no dia 31, anual até uma data)', async () => {
  const { ocorrencias } = await modulo();
  const dias = (lista) => lista.map((o) => `${o.inicio.getMonth() + 1}/${o.inicio.getDate()}`);
  const semanal = { inicio: '2026-10-19T09:00', fim: '2026-10-19T09:30', repetir: { freq: 'semanal', intervalo: 1, vezes: 4 } };
  assert.deepEqual(dias(ocorrencias([semanal], new Date(2026, 9, 1), new Date(2026, 11, 31))), ['10/19', '10/26', '11/2', '11/9']);
  const mensal = { inicio: '2026-01-31', diaTodo: true, repetir: { freq: 'mensal', intervalo: 1, vezes: 4 } };
  assert.deepEqual(dias(ocorrencias([mensal], new Date(2026, 0, 1), new Date(2027, 0, 1))), ['1/31', '3/31', '5/31', '7/31']);
  const quinzenal = { inicio: '2026-10-01T10:00', repetir: { freq: 'diaria', intervalo: 15, ate: '2026-11-15' } };
  assert.deepEqual(dias(ocorrencias([quinzenal], new Date(2026, 9, 10), new Date(2027, 0, 1))), ['10/16', '10/31', '11/15']);
  const aniversario = { inicio: '2024-02-29', diaTodo: true, repetir: { freq: 'anual', intervalo: 1 } };
  assert.deepEqual(dias(ocorrencias([aniversario], new Date(2025, 0, 1), new Date(2029, 0, 1))), ['2/29']);
  // Sem repetição: só se tocar o intervalo; o de dia todo vai até a meia-noite.
  const um = { inicio: '2026-10-17', diaTodo: true };
  const [o] = ocorrencias([um], new Date(2026, 9, 17, 12), new Date(2026, 9, 18));
  assert.equal(o.fim.getTime(), new Date(2026, 9, 18).getTime());
  assert.equal(ocorrencias([um], new Date(2026, 9, 18), new Date(2026, 9, 19)).length, 0);
});

test('ics: a semanal em vários dias, as ocorrências tiradas e as alteradas (como o Google exporta)', async () => {
  const { lerIcs, gravarIcs, ocorrencias } = await modulo();
  const texto = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT', 'UID:aula@x', 'DTSTART:20261019T080000', 'DTEND:20261019T090000', 'SUMMARY:Aula',
    'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=6', 'EXDATE:20261021T080000', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:aula@x', 'RECURRENCE-ID:20261023T080000', 'DTSTART:20261023T100000', 'DTEND:20261023T110000', 'SUMMARY:Aula (outra sala)', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:mensal@x', 'DTSTART:20260115T140000', 'SUMMARY:Fino', 'RRULE:FREQ=MONTHLY;BYSETPOS=-1;BYDAY=FR', 'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const { eventos } = lerIcs(texto);
  assert.deepEqual(eventos[0].repetir, { freq: 'semanal', intervalo: 1, vezes: 6, dias: [1, 3, 5] });
  assert.deepEqual(eventos[0].excecoes, ['2026-10-21T08:00']);
  assert.equal(eventos[1].recorrencia, '2026-10-23T08:00');
  // A regra que o Retro Computer não sabe abrir volta como veio.
  assert.equal(eventos[2].repetir.original, 'FREQ=MONTHLY;BYSETPOS=-1;BYDAY=FR');
  const lista = ocorrencias(eventos.slice(0, 2), new Date(2026, 9, 1), new Date(2026, 11, 1));
  const ver = (o) => `${o.inicio.getMonth() + 1}/${o.inicio.getDate()} ${o.inicio.getHours()}h ${o.evento.titulo}`;
  // Seg, (qua tirada), sex alterada para as 10h, seg, qua, sex: as seis vezes, contando a tirada.
  assert.deepEqual(lista.map(ver), ['10/19 8h Aula', '10/23 10h Aula (outra sala)', '10/26 8h Aula', '10/28 8h Aula', '10/30 8h Aula']);
  // Gravar e ler de novo guarda tudo.
  const de2 = lerIcs(gravarIcs(eventos)).eventos;
  assert.deepEqual(de2.map((e) => [JSON.stringify(e.repetir), e.excecoes.join(','), e.recorrencia]), eventos.map((e) => [JSON.stringify(e.repetir), e.excecoes.join(','), e.recorrencia]));
});

test('ics: uma repetição antiga aparece hoje sem contar uma por uma desde o começo', async () => {
  const { ocorrencias } = await modulo();
  const desde1900 = { inicio: '1900-01-01T07:00', repetir: { freq: 'diaria', intervalo: 1 } };
  const semanal = { inicio: '1950-01-02T07:00', repetir: { freq: 'semanal', intervalo: 2, dias: [1, 4] } };
  const t0 = Date.now();
  const d = ocorrencias([desde1900], new Date(2026, 9, 17), new Date(2026, 9, 19));
  assert.deepEqual(d.map((o) => [o.inicio.getDate(), o.inicio.getHours()]), [[17, 7], [18, 7]]);
  const s = ocorrencias([semanal], new Date(2026, 9, 1), new Date(2026, 10, 1));
  assert.ok(s.length >= 4 && s.every((o) => [1, 4].includes(o.inicio.getDay())), s.map((o) => o.inicio.toString()).join('\n'));
  assert.ok(Date.now() - t0 < 500);
});

test('ics: o que não é um calendário não quebra nada', async () => {
  const { lerIcs, ocorrencias } = await modulo();
  assert.deepEqual(lerIcs('isto não é um calendário').eventos, []);
  assert.deepEqual(lerIcs('BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:Sem data\nEND:VEVENT\nEND:VCALENDAR').eventos, []);
  // Uma repetição sem fim não passa do limite de ocorrências.
  const todoDia = { inicio: '2000-01-01T08:00', repetir: { freq: 'diaria', intervalo: 1 } };
  assert.ok(ocorrencias([todoDia], new Date(2000, 0, 1), new Date(2100, 0, 1)).length <= 5001);
});

test('ics: nos calendários da internet, a hora com fuso (TZID) vem para a hora daqui', async () => {
  const { horaDoFuso, lerIcs } = await modulo();
  // O instante não depende do fuso de quem roda o teste.
  assert.equal(horaDoFuso(2026, 7, 4, 9, 0, 'America/New_York').toISOString(), '2026-07-04T13:00:00.000Z'); // horário de verão
  assert.equal(horaDoFuso(2026, 1, 4, 9, 0, 'America/New_York').toISOString(), '2026-01-04T14:00:00.000Z');
  assert.equal(horaDoFuso(2026, 10, 17, 9, 0, '/mozilla.org/20050126_1/Europe/Lisbon').toISOString(), '2026-10-17T08:00:00.000Z');
  assert.equal(horaDoFuso(2026, 10, 17, 9, 0, 'E. South America Standard Time'), null, 'o nome do Windows não é um fuso da IANA');
  const ics = ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'UID:a', 'DTSTART;TZID=America/New_York:20260704T090000', 'DTEND;TZID=America/New_York:20260704T100000', 'SUMMARY:x', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  assert.equal(lerIcs(ics).eventos[0].inicio, '2026-07-04T09:00', 'a Agenda volta como foi escrita');
  const local = new Date(Date.UTC(2026, 6, 4, 13, 0));
  const esperado = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}T${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}`;
  assert.equal(lerIcs(ics, { fusos: true }).eventos[0].inicio, esperado);
});
